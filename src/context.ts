import request, { ResponseAsJSON, UrlOptions, CoreOptions, Headers } from 'request';

interface ICoreOptions extends CoreOptions { }
interface IOptions extends UrlOptions, ICoreOptions { }
interface IResponse extends ResponseAsJSON { }

const rp = function (options: IOptions): Promise<IResponse | any> {
    return new Promise((resolve, reject) => {
        request(options, (error: any, response: IResponse, body: any) => {
            if (error) reject(error)
            else resolve(response)
        })
    })
}

const fetch = function (options: IOptions): Promise<JSON> {
    return new Promise((resolve, reject) => {
        request(options, (error: any, response: IResponse, body: any) => {
            if (error) reject(error)
            else if (response.statusCode >= 400) reject(response)
            else {
                let data: any;
                try {
                    data = body ? JSON.parse(body) : {};
                } catch (e) {
                    reject(body);
                }
                resolve(data)
            }
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
    private _username: string;
    private url3dspace: string;
    private passport: string | null = null;
    private securityContext: string | undefined;
    private cookies: Array<string>;
    private password: string;

    constructor(params: IContext) {
        this._username = params.username;
        this.url3dspace = params.url3dspace;
        this.securityContext = params.securityContext;
        this.password = params.password;
        this.cookies = [];
    }

    get username(): string {
        return this._username;
    }

    fetch(path: string, options?: ICoreOptions): Promise<JSON> {
        if (!(this.url3dspace.endsWith('/') || path.startsWith('/')))
            path = '/' + path

        const _options: IOptions = {
            ...options,
            url: `${this.url3dspace}${path}`
        };
        _options.headers = {
            ..._options.headers,
            ...this.getContextHeaders()
        };

        return fetch(_options)
    }

    get(path: string, options?: ICoreOptions): Promise<JSON> {
        return this.fetch(path, {
            ...options,
            method: 'GET'
        })
    }

    post(path: string, options?: ICoreOptions): Promise<JSON> {
        return this.fetch(path, {
            ...options,
            method: 'POST'
        })
    }

    delete(path: string, options?: ICoreOptions): Promise<JSON> {
        return this.fetch(path, {
            ...options,
            method: 'DELETE'
        })
    }

    patch(path: string, options?: ICoreOptions): Promise<JSON> {
        return this.fetch(path, {
            ...options,
            method: 'patch'
        })
    }

    put(path: string, options?: ICoreOptions): Promise<JSON> {
        return this.fetch(path, {
            ...options,
            method: 'PUT'
        })
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

    setSecurityContext(securityContext: string) {
        this.securityContext = securityContext;
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
                passport = passport.replace(/login\?service=.*/, '');
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
                        username: that._username,
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
