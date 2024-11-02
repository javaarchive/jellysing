
export class JellyfinClient {

    baseUrl: string;
    accessToken: string;
    isApiKey: boolean;

    // client attributes
    clientName = "Jellysing";
    clientVersion = "0.0.1";
    clientDevice = "Server side runtime";
    clientId = "placeholder";

    userId: string | null = null;

    authResult: any;
    
    generateClientId() {
        return Math.random().toString(36).substring(2, 15);
    }

    constructor(baseUrl: string = null) {
        this.baseUrl = baseUrl;
        this.accessToken = null;
    }

    // https://gist.github.com/nielsvanvelzen/ea047d9028f676185832e51ffaf12a6f
    generateAuthorizationHeader(): string {
        let value = `MediaBrowser Client="${encodeURIComponent(this.clientName)}", Device="${encodeURIComponent(this.clientDevice)}", DeviceId="${this.clientId}", Version="${encodeURIComponent(this.clientVersion)}"`;
        if(this.accessToken) {
            value += `, Token="${encodeURIComponent(this.accessToken)}"`;
        }
        if(this.isApiKey) {
            // if api key don't provide client details
            value = `MediaBrowser Token="${encodeURIComponent(this.accessToken)}"`;
        }
        return value;
    }

    async request(path: string, method: string = "GET", body: any = null, raw: boolean = false) {
        let url = new URL(this.baseUrl + path);
        if(method == "GET"){
            let usp = new URLSearchParams();
            for(let entry of Object.entries(body)){
                if(entry[1] == null) continue;
                if(typeof entry[1] == "object"){
                    usp.append(entry[0], JSON.stringify(entry[1]));
                }else if(typeof entry[1] == "string"){
                    usp.append(entry[0], entry[1]);
                }else if(typeof entry[1] == "boolean"){
                    usp.append(entry[0], entry[1] ? "true" : "false");
                }
            }
            url.search = usp.toString();
        }
        let resp = await fetch(url, {
            method: method,
            headers: {
                "Content-Type": body ? "application/json" : null,
                "Authorization": this.generateAuthorizationHeader()
            },
            body: method != "GET" ? JSON.stringify(body) : null
        });
        if(raw) return resp;
        if(!resp.ok){
            throw new Error("Jellyfin Error: " + resp.statusText + " " + (await resp.text()));
        }
        return (await resp.json());
    }

    setBaseUrl(url: string) {
        this.baseUrl = url;
        return this;
    }

    getPrimaryImageUrl(item: any) {
        let id = typeof item == "string" ? item : item["Id"];
        return this.baseUrl + "/Items/" + id + "/Images/Primary";
    }

    async login(username: string, password: string) {
        try{
            let authenticateResult = await this.request("/Users/AuthenticateByName", "POST", {
                "Username": username,
                "Pw": password
            });

            this.accessToken = authenticateResult["AccessToken"];
            this.authResult = authenticateResult;
            this.userId = authenticateResult["User"]["Id"];

            return true;
        }catch(ex){
            return false;
        }
    }

    async getLibraries() {
        return (await this.request("/Items", "GET", {
            userId: this.userId
        }));
    }

    async createItemDownloadRequest(itemId: string): Promise<Response> {
        let response = await this.request("/Items/" + itemId + "/Download", "GET", {}, true);
        return response;
    }

    async createAudioStreamRequest(itemId: string, opts: any = {}): Promise<Response> {
        let response = await this.request("/Audio/" + itemId + "/stream", "GET", opts, true);
        return response;
    }
}

function tryGetLocalStorage(){
    if(typeof(Storage) === "undefined") {
        return null;
    }
    return localStorage;
}

export function tryGetSavedLibraryId(){
    if(tryGetLocalStorage() && tryGetLocalStorage().getItem("jellyfin-library-id")) {
        return tryGetLocalStorage().getItem("jellyfin-library-id");
    }
    return null;
}

interface BasicInfo {
    userId: string;
    serverId: string;
    serverName: string;
}

class BrowserJellyfinClient extends JellyfinClient {

    defaultInit = false;

    constructor(baseUrl: string = null) {
        super(baseUrl);
        if(tryGetLocalStorage() && tryGetLocalStorage().getItem("jellyfin-device-id")) {
            this.clientId = tryGetLocalStorage().getItem("jellyfin-device-id");
        }else{
            this.clientId = this.generateClientId();
        }
    }

    autologin(){
        if(tryGetLocalStorage() && tryGetLocalStorage().getItem("jellyfin-access-token") && tryGetLocalStorage().getItem("jellyfin-base-url")) {
            this.baseUrl = tryGetLocalStorage().getItem("jellyfin-base-url");
            this.accessToken = tryGetLocalStorage().getItem("jellyfin-access-token");
            const basicInfo = this.tryGetBasicInfo();
            this.userId = basicInfo ? basicInfo.userId : null;
            return true;
        }
        return false;
    }

    persistCredentials(){
        if(!tryGetLocalStorage()) return false;
        tryGetLocalStorage().setItem("jellyfin-device-id", this.clientId);
        if(!this.accessToken || !this.baseUrl) return false;
        tryGetLocalStorage().setItem("jellyfin-access-token", this.accessToken);
        tryGetLocalStorage().setItem("jellyfin-base-url", this.baseUrl);
        return true;
    }

    cacheBasicInfo(){
        if(!tryGetLocalStorage()) return false;
        tryGetLocalStorage().setItem("jellyfin-user-id", this.authResult["User"]["Id"]);
        tryGetLocalStorage().setItem("jellyfin-server-id", this.authResult["User"]["ServerId"]);
        // doesn't exist on auth response for some reason
        tryGetLocalStorage().setItem("jellyfin-server-name", this.authResult["User"]["ServerName"]);
    }

    tryGetBasicInfo(): BasicInfo | null {
        if(!tryGetLocalStorage()) return null;
        return {
            "userId": tryGetLocalStorage().getItem("jellyfin-user-id"),
            "serverId": tryGetLocalStorage().getItem("jellyfin-server-id"),
            "serverName": tryGetLocalStorage().getItem("jellyfin-server-name")
        };
    }

    isLoggedIn(): boolean {
        const basicInfo = this.tryGetBasicInfo();
        return basicInfo != null && basicInfo.userId != null;
    }
}

let defaultClient = new BrowserJellyfinClient();

export function getDefaultJellyfinClient(): BrowserJellyfinClient {
    if(!defaultClient.defaultInit){
        defaultClient.autologin();
        defaultClient.defaultInit = true;
    }
    return defaultClient;
}

// convert jellyfin ticks to milliseconds
export function ticksToMs(ticks: number) {
    return ticks / 10000;
}

export { BrowserJellyfinClient, tryGetLocalStorage };
export default BrowserJellyfinClient;