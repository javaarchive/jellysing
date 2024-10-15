function tryGetLocalStorage(){
    if(typeof(Storage) === "undefined") {
        return null;
    }
    return localStorage;
}

class BackendClient {
    constructor(server: string = null, key: string = "") {
        this.server = server;
        this.key = key;
    }

    loadLocalStorage() {
        const storage = tryGetLocalStorage();
        if(!storage.getItem("jellysing-server")) return null;
        const server = storage.getItem("jellysing-server");
        if(!storage.getItem("jellysing-key")) return null;
        const key = storage.getItem("jellysing-key");
        this.server = server;
        this.key = key;
        return this;
    }

    server: string;
    key: string;

    getKey(): string {
        return this.key;
    }

    async request(path: string, method: string, data: any, raw: boolean = false) {
        const headers = {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + this.key,
        };
        const response = await fetch(this.server + path, {
            method: method,
            headers: headers,
            body: JSON.stringify(data),
        });
        if(raw) return response; // for media download
        if(response.ok) {
            return (await response.json());
        } else {
            throw new Error(response.statusText + " " + (await response.text()));
        }
    }

    async check(){
        return (await this.request("/check", "GET", {}))["status"] == "ok";
    }
}


const defaultClient = new BackendClient();
defaultClient.loadLocalStorage();

export const getDefaultBackendClient = (): BackendClient => {
    return defaultClient;
}