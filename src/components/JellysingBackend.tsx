import {useState} from "react";
import { getDefaultJellyfinClient } from "../lib/jellyfin_client";

export default function JellysingBackendPicker(props: any) { 

    const [server, setServer] = useState("");
    const [key, setKey] = useState("");
    const [validating, setValidating] = useState(false);
    
    async function validateCredentials() {
        
    }

    return (
        <>
            <h1 className="text-center text-2xl font-extralight">Jellysing Backend</h1>
            <p className="text-center">This server will be used for processing and networking. It is needed to process songs fully.</p>
            <label htmlFor="server">Backend Server URL:</label>
            <input
                type="text"
                placeholder="https://jellysing.example.com"
                value={server}
                name="server"
                onChange={(e) => setServer(e.target.value)}
                className="w-full rounded-md border-2 border-gray-300 bg-gray-100 p-2 text-gray-900 focus:border-blue-500 focus:ring-blue-500"
            />
            <label htmlFor="key">Private Access Key</label>
            <input
                type="password"
                placeholder="Access key"
                value={key}
                name="key"
                onChange={(e) => setKey(e.target.value)}
                className="w-full rounded-md border-2 border-gray-300 bg-gray-100 p-2 text-gray-900 focus:border-blue-500 focus:ring-blue-500"
            />
            <button onClick={(ev) => validateCredentials()} className="mt-4 bg-accent w-full p-4 text-accent-foreground rounded-md" disabled={validating}>Check</button>
        </>
    );
}