const lrclibBaseUrl = "https://lrclib.net/api";

interface LrclibQuery {
    track_name: string;
    artist_name: string;
    album_name?: string;
    q?: string;
    duration?: number;
}

export default class LrclibClient {
    clientAgent: string = "Jellysing/0.0.1 (https://github.com/javaarchive/Jellysing)";

    constructor(){

    }

    serializeQuery(query: LrclibQuery){
        let usp = new URLSearchParams();
        for(let entry of Object.entries(query)){
            if(entry[1] == null) continue;
            if(typeof entry[1] == "number"){
                usp.append(entry[0], entry[1].toString());
                continue;
            }
            usp.append(entry[0], entry[1]);
        }
        return usp;
    }

    async get(query: LrclibQuery) {
        let url = new URL(lrclibBaseUrl + "/get");
        url.search = this.serializeQuery(query).toString();
        let resp = await fetch(url, {
            method: "GET",
            headers: {
                "Lrclib-Client": this.clientAgent
            }
        });
        if(resp.status == 404){
            return null;
        }
        if(!resp.ok){
            throw new Error("Lrclib Error: " + resp.statusText + " " + (await resp.text()));
        }
        return (await resp.json());
    }

    async search(query: LrclibQuery){
        let url = new URL(lrclibBaseUrl + "/search");
        url.search = this.serializeQuery(query).toString();
        let resp = await fetch(url, {
            method: "GET",
            headers: {
                "Lrclib-Client": this.clientAgent
            }
        });
        if(resp.status == 404){
            return [];
        }
        if(!resp.ok){
            throw new Error("Lrclib Error: " + resp.statusText + " " + (await resp.text()));
        }
        return (await resp.json());
    }
}

const defaultClient = new LrclibClient();

export function getDefaultLyricsClient(): LrclibClient {
    return defaultClient;
}