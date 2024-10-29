import { fetchEventSource } from '@microsoft/fetch-event-source';

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
        
        if(!storage) return this;

        if(!storage.getItem("jellysing-server")) return null;
        const server = storage.getItem("jellysing-server");
        if(!storage.getItem("jellysing-key")) return null;
        const key = storage.getItem("jellysing-key");
        this.server = server;
        this.key = key;
        return this;
    }

    updateCredentials(server: string, key: string) {

        this.server = server;
        this.key = key;

        const storage = tryGetLocalStorage();
        if(!storage) return false;
        storage.setItem("jellysing-server", server);
        storage.setItem("jellysing-key", key);
        return true;
    }

    server: string;
    key: string;

    getKey(): string {
        return this.key;
    }

    async request(path: string, method: string, data: any = null, raw: boolean = false) {
        const headers = {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + this.key,
        };
        if(!data) delete headers["Content-Type"];
        try{
            const response = await fetch(this.server + path, {
                method: method,
                headers: headers,
                body: data ? JSON.stringify(data): data,
            });
            if(raw) return response; // for media download
            if(response.ok) {
                return (await response.json());
            } else {
                throw new Error("Fetch response not ok: " + response.statusText + " " + (await response.text()));
            }
        }catch(ex){
            console.error("Error fetching request", ex);
            throw ex;
        }
    }

    async fetchEventSource(path: string, onMessage: (data: any) => void, opts) {
        console.log(this.server + path);
        if(opts.data){
            if(!opts.headers) opts.headers = {};
            opts.headers["Content-Type"] = "application/json";
            opts.body = JSON.stringify(opts.data);
            if(!opts.method) opts.method = "POST";
            delete opts.data;
        }
        const source = await fetchEventSource(this.server + path, {
            ...opts,
            headers: {
                "Authorization": "Bearer " + this.key,
                ...opts.headers
            },
            onmessage: onMessage,
            onopen: () => {
                console.log("Event source connected");
            },
            onclose: () => {
                console.log("Event source disconnected");
            },
            onerror: (ex) => {
                throw ex; // so idk what this really helps with, it logs anyways
            },
        });
        return source;
    }

    async check(){
        return (await this.request("/check", "GET"))["status"] == "ok";
    }
}


const defaultClient = new BackendClient();
defaultClient.loadLocalStorage();

export const getDefaultBackendClient = (): BackendClient => {
    return defaultClient;
}