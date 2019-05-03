const request = require('request');

const rp = (options: object) => new Promise((resolve, reject) => {
    request(options, (error: any, response: any, body: any) => {
        if (error) reject(error)
        else resolve(response)
    })
})

interface IResponse {
    body?: string;
    headers?: { [s: string]: string | Array<string>; };
}

interface IContext {
    username: string;
    password: string;
    host: string;
    passport: string;
    securityContext?: string;
}

class Context {
    private username: string;
    private host: string;
    private passport: string;
    private securityContext: string | undefined;
    private cookies: Array<string>;
    private password: string;

    constructor(params: IContext) {
        this.username = params.username;
        this.host = params.host;
        this.passport = params.passport;
        this.securityContext = params.securityContext;
        this.password = params.password;
        this.cookies = [];
    }

    getContextHeaders(): object {
        return {
            'SecurityContext': this.securityContext,
            'Cookie': this.getCookies()
        }
    }

    getCookies(): string {
        return this.cookies.join('; ');
    }

    getSecurityContext(): string | undefined {
        return this.securityContext;
    }

    private getPrefferedSecurityContext(preferredCredentials: any): string | undefined {
        return preferredCredentials ?
            `${preferredCredentials.role.name}.${preferredCredentials.organization.name}.${preferredCredentials.collabspace.name}`
            : undefined
    }

    async connect() {
        const that = this;
        return Promise.resolve()
            .then(() => rp({
                method: 'GET',
                url: that.host
            }))
            .then((response: IResponse) => rp({
                method: 'GET',
                url: that.passport + '/login',
                qs: {
                    action: 'get_auth_params'
                },
                headers: {
                    'cache-control': 'no-cache'
                }
            }))
            .then((response: IResponse) => {
                const data = JSON.parse(<string>response.body);
                const ticket = data.lt;
                if (response.headers && response.headers['set-cookie'])
                    that.cookies = that.cookies.concat(response.headers['set-cookie']);
                return rp({
                    method: 'POST',
                    url: that.passport + '/login',
                    headers: {
                        'Cookie': that.getCookies()
                    },
                    form: {
                        lt: ticket,
                        username: that.username,
                        password: that.password
                    }
                });
            })
            .then((response: IResponse) => {
                if (response.headers && response.headers['set-cookie'])
                    that.cookies = that.cookies.concat(response.headers['set-cookie']);
                return rp({
                    method: 'GET',
                    url: that.passport,
                    headers: {
                        'cache-control': 'no-cache',
                        'Content-Type': 'application/x-www-form-urlencoded',
                        Cookie: that.getCookies()
                    },
                    form: {
                        service: that.host
                    }
                });
            })
            .then((response: IResponse) => {
                return rp({
                    method: 'GET',
                    url: that.host + '/resources/modeler/pno/person?current=true&select=preferredcredentials',
                    headers: {
                        'cache-control': 'no-cache',
                        Cookie: that.getCookies()
                    },
                    followRedirect: true
                });
            })
            .then((response: IResponse) => {
                if (response.headers && response.headers['set-cookie'])
                    that.cookies = that.cookies.concat(response.headers['set-cookie']);
                if (!that.securityContext) {
                    const data = JSON.parse(<string>response.body);
                    that.securityContext = that.getPrefferedSecurityContext(data.preferredcredentials);
                }
                return that;
            });
    }
}
module.exports = Context;