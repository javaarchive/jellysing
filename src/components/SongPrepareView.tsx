import {useState, useEffect} from "react";
import { getDefaultClient, tryGetSavedLibraryId } from "../lib/jellyfin_client";

// TODO: handle bad jellyfin credentiaals?

interface SongPrepareViewProps {
    itemId: string;
}

export default function SongPrepareView(props: SongPrepareViewProps) {
    const [item, setItem] = useState(null);
    const [error, setError] = useState("");

    async function fetchItem() {
        const client = getDefaultClient();
        const data = await client.request("/Items/" + props.itemId, "GET", {
            "userId": client.userId,
            "IncludeItemTypes": "Audio",
            "IncludeMedia": true,
        });
        console.log(data);
        setItem(data);
    }

    function findLyrics(item){
        if(!item) return null;
        if(!item["MediaStreams"]) {
            console.warn("Missing MediaStreams");
            return false;
        }
        return item["MediaStreams"].find(stream => stream["Type"] == "Lyric");
    }

    useEffect(() => {
        fetchItem();
    }, []);

    if(item) console.log(findLyrics(item));

    return (
        <>
        {
            item && <>
                <div className="flex items-center m-4 mx-auto bg-white rounded-lg shadow-md max-w-xl">
                    <div className="w-1/4 p-4">
                        <img src={getDefaultClient().getPrimaryImageUrl(item["AlbumId"] || item["Id"]) + "?fillHeight=512&fillWidth=512"} alt={item["Name"]} className="w-full rounded-md img-optimize" decoding="async" loading="lazy" />
                    </div>
                    <div className="w-3/4 p-4">
                        <span className="text-xl font-bold">{item["Name"]}</span>
                        <p className="text-md justify-center items-center">{item["Artists"].join(", ")}</p>
                    </div>
                </div>
                <p>
                    Serverside Lyrics: {findLyrics(item) ? <span className="text-green-500">Yes</span> : <span className="text-red-500">No</span>}
                </p>
            </>
        }
        {
            (!item && !error) && <p>Loading...</p>
        }
        {
            error && <p className="text-red-500">{error}</p>
        }
        </>
    )
}