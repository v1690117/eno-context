import request, { ResponseAsJSON, UrlOptions, CoreOptions, Headers } from 'request';

interface IOptions extends UrlOptions, CoreOptions { }
interface IResponse extends ResponseAsJSON { }

const rp = function (options: IOptions): Promise<IResponse | any> {
    return new Promise((resolve, reject) => {
        request(options, (error: any, response: IResponse, body: any) => {
            if (error) reject(error)
            else resolve(response)
        })
    })
}
interface IContext {
    username: string;
    password: string;
    url3dspace: string;
    securityContext?: string;
}
class Context {
    private username: string;
    private url3dspace: string;
    private passport: string|null = null;
    private securityContext: string | undefined;
    private cookies: Array<string>;
    private password: string;    

    constructor(params: IContext) {
        this.username = params.username;
        this.url3dspace = params.url3dspace;
        this.securityContext = params.securityContext;
        this.password = params.password;
        this.cookies = [];
    }

    getContextHeaders(): Headers {
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
        this.passport = null;
        this.cookies = [];
        const that = this;
        return Promise.resolve()
            .then(() => rp({
                method: 'GET',
                url: that.url3dspace
            }))
            .then((response: IResponse) => {
                let passport = (<any>response.request).href;
                passport = passport.replace(/login\?service=.*/,'');
                this.passport = passport;
                return rp({
                    method: 'GET',
                    url: that.passport + '/login',
                    qs: {
                        action: 'get_auth_params'
                    },
                    headers: {
                        'cache-control': 'no-cache'
                    }
                });
            })
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
                    url: <string>that.passport,
                    headers: {
                        'cache-control': 'no-cache',
                        'Content-Type': 'application/x-www-form-urlencoded',
                        Cookie: that.getCookies()
                    },
                    form: {
                        service: that.url3dspace
                    }
                });
            })
            .then((response: IResponse) => {
                return rp({
                    method: 'GET',
                    url: that.url3dspace + '/resources/modeler/pno/person?current=true&select=preferredcredentials',
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

export default Context