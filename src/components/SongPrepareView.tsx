import {useState, useEffect} from "react";
import { getDefaultJellyfinClient, ticksToMs, tryGetSavedLibraryId } from "../lib/jellyfin_client";
import { getDefaultLyricsClient } from "../lib/lrclib_client";

// TODO: handle bad jellyfin credentiaals?

interface SongPrepareViewProps {
    itemId: string;
}

export default function SongPrepareView(props: SongPrepareViewProps) {
    const [item, setItem] = useState(null);
    const [error, setError] = useState("");
    const [lrcSearchTrackName, setLrcSearchTrackName] = useState("");
    const [lrcSearchArtistName, setLrcSearchArtistName] = useState("");
    const [lrcSearchAlbumName, setLrcSearchAlbumName] = useState("");
    const [lyrics, setLyrics] = useState([]);

    async function fetchItem(setDefaults = true) {
        const client = getDefaultJellyfinClient();
        const data = await client.request("/Items/" + props.itemId, "GET", {
            "userId": client.userId,
            "IncludeItemTypes": "Audio",
            "IncludeMedia": true,
        });

        console.log(data);
        setItem(data);

        if(setDefaults){
            setLrcSearchTrackName(data["Name"]);
            setLrcSearchArtistName(data["Artists"].join(", "));
            setLrcSearchAlbumName(data["Album"]);
        }
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

    async function matchLrclib(mode = "get"){
        const lyricsClient = getDefaultLyricsClient();
        const query = {
            track_name: lrcSearchTrackName,
            artist_name: lrcSearchArtistName,
            album_name: lrcSearchAlbumName,
            // in seconds
            duration: ticksToMs(item["RunTimeTicks"]) / 1000,
        };
        let lyricData = await (mode == "get" ? lyricsClient.get(query) : lyricsClient.search(query));
        if(lyricData){
            if(mode == "get"){
                setLyrics([lyricData]);
            }else{
                setLyrics(lyricData.filter(lyric => lyric["syncedLyrics"] && lyric["syncedLyrics"].length > 0));
            }
        }else{
            setLyrics([]);
        }
    }

    return (
        <>
        {
            item && <>
                <div className="flex items-center m-4 mx-auto bg-white rounded-lg shadow-md max-w-xl">
                    <div className="w-1/4 p-4">
                        <img src={getDefaultJellyfinClient().getPrimaryImageUrl(item["AlbumId"] || item["Id"]) + "?fillHeight=512&fillWidth=512"} alt={item["Name"]} className="w-full rounded-md img-optimize" decoding="async" loading="lazy" />
                    </div>
                    <div className="w-3/4 p-4">
                        <span className="text-xl font-bold">{item["Name"]}</span>
                        <p className="text-md justify-center items-center">{item["Artists"].join(", ")}</p>
                    </div>
                </div>
                <p>
                    Duration: {(ticksToMs(item["RunTimeTicks"]) / 1000).toFixed(1)} seconds
                </p>
                <p>
                    Serverside Lyrics: {findLyrics(item) ? <span className="text-green-500">Yes</span> : <span className="text-red-500">No</span>}
                </p>
                <p>
                    Album: {item["Album"] }
                </p>
                <h2 className="text-xl font-bold">
                    LRCLIB Matching:
                </h2>
                <div className="p-4 bg-slate-100 rounded-lg">
                    <label htmlFor="track" className="block text-sm font-medium text-gray-700">Track</label>
                    <input type="text" className="w-full p-2 rounded-md m-2" placeholder="Search Track" name="track" value={lrcSearchTrackName} onChange={e => setLrcSearchTrackName(e.target.value)} />
                    <label htmlFor="artist" className="block text-sm font-medium text-gray-700">Artist</label>
                    <input type="text" className="w-full p-2 rounded-md m-2" placeholder="Search Artist" name="artist" value={lrcSearchArtistName} onChange={e => setLrcSearchArtistName(e.target.value)} />
                    <label htmlFor="album" className="block text-sm font-medium text-gray-700">Album</label>
                    <input type="text" className="w-full p-2 rounded-md m-2" placeholder="Search Album" name="album" value={lrcSearchAlbumName} onChange={e => setLrcSearchAlbumName(e.target.value)} />
                    <button onClick={() => matchLrclib("get")} className="w-full p-2 rounded-md m-2 bg-accent text-accent-foreground">Get</button>
                    <button onClick={() => matchLrclib("search")} className="w-full p-2 rounded-md m-2 bg-accent text-accent-foreground">Search</button>
                    {lyrics.length == 0 && <p>No matches found.</p>}
                    {lyrics.length > 0 && <p>Found {lyrics.length} matches.</p>}
                    <div className="grid grid-cols-2 gap-4 mt-2">
                        {lyrics.length > 0 && lyrics.map((item) => {
                            return (
                                <div className="m-auto p-4 max-w-md bg-secondary text-secondary-foreground rounded-md" key={item["id"]}>
                                    <span className="font-bold">{item["trackName"]} - {item["artistName"]} from {item["albumName"]}</span>
                                    <textarea className="w-full p-2 rounded-md m-2" placeholder="Lyrics" name="lyrics" value={item["syncedLyrics"]} readOnly />
                                </div>
                            );
                        })}
                    </div>
                </div>
                <h2 className="text-xl font-bold">
                    Stem Seperation
                </h2>
                
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