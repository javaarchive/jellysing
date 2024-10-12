import {useState} from "react";
import { getDefaultClient } from "../lib/jellyfin_client";

export default function JellyfinLogin(props: any) {

    const [server, setServer] = useState("");
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");

    const [loggingIn, setLoggingIn] = useState(false);
    
    async function validateCredentials() {
        const client = getDefaultClient();
        console.log("Validating credentials");
        if(server && username && password) {
            // attempt to fetch
            setLoggingIn(true);
            if(await client.setBaseUrl(server).login(username, password)) {
                client.persistCredentials();
                client.cacheBasicInfo();
                // hack because we can't do an astro redirect here.
                if(props.onAuthed){
                    props.onAuthed(client);
                }else{
                    location.href = "/configure";
                }
            }else{
                alert("Invalid credentials");
            }
            setLoggingIn(false);
            
        }
    }

    return (
        <>
            <label htmlFor="server">Server URL:</label>
            <input
                type="text"
                placeholder="https://jellyfin.example.com"
                value={server}
                name="server"
                onChange={(e) => setServer(e.target.value)}
                className="w-full rounded-md border-2 border-gray-300 bg-gray-100 p-2 text-gray-900 focus:border-blue-500 focus:ring-blue-500"
            />
            <label htmlFor="username">Username</label>
            <input
                type="text"
                placeholder="username"
                value={username}
                name="username"
                onChange={(e) => setUsername(e.target.value)}
                className="w-full rounded-md border-2 border-gray-300 bg-gray-100 p-2 text-gray-900 focus:border-blue-500 focus:ring-blue-500"
            />
            <label htmlFor="password">Password</label>
            <input
                type="password"
                placeholder="password"
                value={password}
                name="password"
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-md border-2 border-gray-300 bg-gray-100 p-2 text-gray-900 focus:border-blue-500 focus:ring-blue-500"
            />
            <button onClick={(ev) => validateCredentials()} className="mt-4 bg-accent w-full p-4 text-accent-foreground rounded-md" disabled={loggingIn}>Check</button>
        </>
    );
}