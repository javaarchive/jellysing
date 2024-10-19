import {useState, useEffect, useRef} from "react";
import { getDefaultJellyfinClient, ticksToMs, tryGetSavedLibraryId } from "../lib/jellyfin_client";
import { getDefaultLyricsClient } from "../lib/lrclib_client";
import { download } from "../lib/util";
import { SongSeparator } from "./SongSeparator";
import { SongAlignment } from "./SongAlignment";
import Jsz from "../lib/jsz";
import { BlobWriter, ZipWriter } from "@zip.js/zip.js";

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
    const [selectedLyrics, setSelectedLyrics] = useState(null);
    const [loadingAudio, setLoadingAudio] = useState(true);
    const [loadingPercent, setLoadingPercent] = useState(0);
    const [origAudioBlob, setOrigAudioBlob] = useState(null);
    const [origAudioPos, setOrigAudioPos] = useState(0);
    const [audioHash, setAudioHash] = useState(null);
    const audioRef = useRef<HTMLAudioElement>(null);
    const [vocalBlob, setVocalBlob] = useState(null);
    const [instrumentalBlob, setInstrumentalBlob] = useState(null);
    const [alignment, setAlignment] = useState(null);
    const [prepareStatus, setPrepareStatus] = useState("");
    const [jszBlob, setJszBlob] = useState(null);
    const [jszBlobUrl, setJszBlobUrl] = useState("");

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

    async function fetchAudio(){
        const client = getDefaultJellyfinClient();
        let resp = await client.createAudioStreamRequest(props.itemId);
        if(resp.ok){
            download(resp, {
                onFinish(blob) {
                    if(audioRef.current){
                        audioRef.current.src = URL.createObjectURL(blob);
                        setLoadingAudio(false);
                        setOrigAudioBlob(blob);
                    }else{
                        console.warn("Audio el ref not found");
                    }
                },
                onProgress(progress, total) {
                    console.log(progress, total, " load progress");
                    setLoadingPercent(Math.ceil((progress / total) * 100));
                },
            })
        }
    }

    async function prepareJsz(){
        let jsz = new Jsz();
        setPrepareStatus("Preparing...");
        jsz.setTitle(item["Name"]);
        jsz.setArtists(item["Artists"]);
        jsz.setAlbum(item["Album"]);
        jsz.addInstrumentalsTrackFile(instrumentalBlob);
        jsz.addVocalsTrackFile(vocalBlob);
        setPrepareStatus("Preparing file...");
        // TODO: duration metadata?
        const blobWriter = new BlobWriter();
        const zipWriter = new ZipWriter(blobWriter);
        await jsz.writeToZip(zipWriter);
        const blob = await blobWriter.getData();
        setJszBlob(blob);
        setJszBlobUrl(URL.createObjectURL(blob));
        setPrepareStatus("");
    }

    useEffect(() => {
        fetchItem();
        // also fetch the audio itself lol
        fetchAudio();

        const updateInterval = setInterval(() => {
            if(!audioRef.current) return;
            setOrigAudioPos(audioRef.current.currentTime);
        }, 10);

        return () => {
            clearInterval(updateInterval);
        };
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
        for(let i = 0; i < lyricData.length; i++){
            lyricData[i]["index"] = i;
        }
        if(mode == "get"){
            setSelectedLyrics(lyricData);
        }else if(lyricData.length > 0){
            setSelectedLyrics(lyricData[0]);
        }
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
                {loadingAudio && <p>Loading audio...{loadingPercent}%</p>}
                <audio controls ref={audioRef} className="min-w-full" />
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
                                    <button onClick={() => setSelectedLyrics(item)} className="w-full p-2 rounded-md m-2 bg-accent text-accent-foreground" disabled={selectedLyrics && selectedLyrics["id"] == item["id"]}>{(selectedLyrics && selectedLyrics["id"] == item["id"]) ? "Selected" : "Select"}</button>
                                </div>
                            );
                        })}
                    </div>
                </div>
                <h2 className="text-xl font-bold">
                    Stem Seperation
                </h2>
                <p>
                    This may take a bit (up to a minute) to process depending on song length but is def doable realtime. This will be gpu intense (for the processing server).
                </p>
                {!origAudioBlob && <p>No audio loaded.</p>}
                {origAudioBlob && <>
                    <SongSeparator inputAudio={origAudioBlob} onFinish={(hash) => setAudioHash(hash)} onInstrumentalAudioBlob={setInstrumentalBlob} onVocalAudioBlob={setVocalBlob} />
                </>}
                <h2 className="text-xl font-bold">
                    Alignment
                </h2>
                <p>
                    This is a lot faster but makes the timing percise.
                </p>
                {!audioHash && <p>Please seperate the audio first.</p>}
                {audioHash && <>
                    <SongAlignment lyrics={selectedLyrics} inputHash={audioHash} inputPreviewTime={origAudioPos} onAlignment={(alignment) => setAlignment(alignment)} />
                </>}
                {
                    (item && audioHash && alignment && lyrics && vocalBlob && instrumentalBlob) && <>
                        <button className="w-full p-2 rounded-md m-2 bg-accent text-accent-foreground" onClick={prepareJsz} disabled={prepareStatus && prepareStatus.length > 0}>{prepareStatus ? prepareStatus: "Create jsz file"}</button>
                        {jszBlob && <a href={jszBlobUrl} download={item["Name"] + ".jsz"} className="w-full block p-2 rounded-md m-2 text-center bg-accent text-accent-foreground">Download jsz file</a>}
                    </>
                }
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