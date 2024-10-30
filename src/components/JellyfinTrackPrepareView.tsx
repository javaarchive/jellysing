import { useState } from "react";
import { getDefaultJellyfinClient } from "../lib/jellyfin_client";

interface JellyfinTrackPrepareViewProps {
    itemId: string;
}

export default function JellyfinTrackPrepareView(props: JellyfinTrackPrepareViewProps) {
    
    let [item, setItem] = useState(null);
    const jellyfinClient = getDefaultJellyfinClient();
    const jellyfinDetails = jellyfinClient.tryGetBasicInfo();

    async function fetchItem(setDefaults = true) {
        const data = await jellyfinClient.request("/Items/" + props.itemId, "GET", {
            "userId": jellyfinClient.userId,
            "IncludeItemTypes": "Audio",
            "IncludeMedia": true,
        });

        console.log(data);
        setItem(data);
    }
    
    if(jellyfinClient.isLoggedIn()){
        if(item){
            // inner song prepare view
        }else{
            return <><p>Loading the item from your Jellyfin library "{item["serverName"]}"...</p></>
        }
    }else{
        return <>
            <p>You must be logged in to Jellyfin to use this feature because it requires access to your library.</p>
        </>;
    }
}