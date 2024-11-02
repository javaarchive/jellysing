import { useEffect, useState } from "react";
import { getDefaultJellyfinClient, ticksToMs } from "../lib/jellyfin_client";
import { download } from "../lib/util";
import SongPrepareView from "./SongPrepareView";

interface JellyfinTrackPrepareViewProps {
    itemId: string;
}

export default function JellyfinTrackPrepareView(props: JellyfinTrackPrepareViewProps) {
    
    let [item, setItem] = useState(null);
    let [itemBlob, setItemBlob] = useState(null);
    const jellyfinClient = getDefaultJellyfinClient();
    const jellyfinDetails = jellyfinClient.tryGetBasicInfo();

    async function downloadAudio(item){
        const id = item["Id"];
        const resp = await jellyfinClient.createAudioStreamRequest(id);
        if(resp.ok){
            download(resp, {
                onFinish(blob) {
                    console.log("Audio downloaded", blob);
                    setItemBlob(blob);
                },
                onProgress(progress, total) {
                    // can't use this because of cors header not letting us read this
                }
            });
        }else{
            console.warn("Failed to download audio", resp, (await resp.text()));
            alert("Audio download request failed. See console for more details");
        }
    }

    async function fetchItem(setDefaults = true) {
        const data = await jellyfinClient.request("/Items/" + props.itemId, "GET", {
            "userId": jellyfinClient.userId,
            "IncludeItemTypes": "Audio",
            "IncludeMedia": true,
        });

        console.log(data);
        setItem(data);
        downloadAudio(data);
    }

    useEffect(() => {
        fetchItem();
    }, []);
    
    if(jellyfinClient.isLoggedIn()){
        if(item){
            console.log(item);
            // inner song prepare view
            return <>
                {!itemBlob && <p>Downloading actual audio file...</p>}
                <SongPrepareView song={{
                    title: item["Name"],
                    artists: item["Artists"],
                    album: item["Album"],
                    duration: ticksToMs(item["RunTimeTicks"]) / 1000,
                    image: getDefaultJellyfinClient().getPrimaryImageUrl(item["AlbumId"] || item["Id"]) + "?fillHeight=512&fillWidth=512"
                }} audioBlob={itemBlob}></SongPrepareView>
            </>
        }else{
            return <><p>Loading the item from your Jellyfin library "{jellyfinDetails["serverName"]}"...</p></>
        }
    }else{
        return <>
            <p>You must be <a href="/jellyfin">logged in</a> to Jellyfin to use this feature because it requires access to your library.</p> 
        </>;
    }
}