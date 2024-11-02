import {useState, useEffect, useRef} from "react";
import { getDefaultJellyfinClient, ticksToMs, tryGetSavedLibraryId } from "../lib/jellyfin_client";
import { getDefaultLyricsClient } from "../lib/lrclib_client";
import { download } from "../lib/util";
import { SongSeparator } from "./SongSeparator";
import { SongAlignment } from "./SongAlignment";
import Jsz from "../lib/jsz";
import type {SongMetadata} from "../lib/jsz";
import { BlobWriter, ZipWriter } from "@zip.js/zip.js";

// TODO: handle bad jellyfin credentiaals?

interface SongPrepareViewProps {
    song: SongMetadata;
    audioBlob?: Blob | null;
}

export default function SongPrepareView(props: SongPrepareViewProps) {
    const [error, setError] = useState("");
    const [lrcSearchTrackName, setLrcSearchTrackName] = useState(props.song.title);
    const [lrcSearchArtistName, setLrcSearchArtistName] = useState(props.song.artists.join(", "));
    const [lrcSearchAlbumName, setLrcSearchAlbumName] = useState(props.song.album || "");
    const [lyrics, setLyrics] = useState([]);
    const [selectedLyrics, setSelectedLyrics] = useState(null);
    const [origAudioPos, setOrigAudioPos] = useState(0);
    const [audioHash, setAudioHash] = useState(null);
    const audioRef = useRef<HTMLAudioElement>(null);
    const [vocalBlob, setVocalBlob] = useState(null);
    const [instrumentalBlob, setInstrumentalBlob] = useState(null);
    const [alignment, setAlignment] = useState(null);
    const [prepareStatus, setPrepareStatus] = useState("");
    const [jszBlob, setJszBlob] = useState(null);
    const [jszBlobUrl, setJszBlobUrl] = useState("");

    async function prepareJsz(){
        let jsz = new Jsz();
        setPrepareStatus("Preparing...");
        jsz.setTitle(props.song.title);
        jsz.setArtists(props.song.artists);
        jsz.setAlbum(props.song.album);
        jsz.addInstrumentalsTrackFile(instrumentalBlob);
        jsz.addVocalsTrackFile(vocalBlob);
        jsz.updateAlignment(alignment);
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
        const updateInterval = setInterval(() => {
            if(!audioRef.current) return;
            setOrigAudioPos(audioRef.current.currentTime);
        }, 10);

        return () => {
            clearInterval(updateInterval);
        };
    }, []);

    useEffect(() => {
        if(props.audioBlob){
            if(audioRef.current){
                audioRef.current.src = URL.createObjectURL(props.audioBlob);
            }
        }
    }, [props.audioBlob]);

    async function matchLrclib(mode = "get"){
        const lyricsClient = getDefaultLyricsClient();
        const query = {
            track_name: lrcSearchTrackName,
            artist_name: lrcSearchArtistName,
            album_name: lrcSearchAlbumName,
            // in seconds
            duration: props.song.duration,
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
            <>
                <div className="flex items-center m-4 mx-auto bg-white rounded-lg shadow-md max-w-xl">
                    <div className="w-1/4 p-4">
                        <img src={props.song.image} alt={props.song.title} className="w-full rounded-md img-optimize" decoding="async" loading="lazy" />
                    </div>
                    <div className="w-3/4 p-4">
                        <span className="text-xl font-bold">{props.song.title}</span>
                        <p className="text-md justify-center items-center">{props.song.artists.join(", ")}</p>
                    </div>
                </div>
                <audio controls ref={audioRef} className="min-w-full" />
                <p>
                    Duration: {props.song.duration.toFixed(1)} seconds
                </p>
                <p>
                    Album: {props.song.album || "No album"}
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
                {!props.audioBlob && <p>No audio loaded.</p>}
                {props.audioBlob && <>
                    <SongSeparator inputAudio={props.audioBlob} onFinish={(hash) => setAudioHash(hash)} onInstrumentalAudioBlob={setInstrumentalBlob} onVocalAudioBlob={setVocalBlob} />
                </>}
                <h2 className="text-xl font-bold">
                    Alignment
                </h2>
                <p>
                    This is a lot faster. It also makes the timing percise.
                </p>
                {!audioHash && <p>Please seperate the audio first.</p>}
                {audioHash && <>
                    <SongAlignment lyrics={selectedLyrics} inputHash={audioHash} inputPreviewTime={origAudioPos} onAlignment={(alignment) => setAlignment(alignment)} />
                </>}
                {
                    (audioHash && alignment && lyrics && vocalBlob && instrumentalBlob) && <>
                        <button className="w-full p-2 rounded-md m-2 bg-accent text-accent-foreground" onClick={prepareJsz} disabled={prepareStatus && prepareStatus.length > 0}>{prepareStatus ? prepareStatus: "Create jsz file"}</button>
                        {jszBlob && <a href={jszBlobUrl} download={props.song.title + ".jsz"} className="w-full block p-2 rounded-md m-2 text-center bg-accent text-accent-foreground">Download jsz file</a>}
                    </>
                }
            </>
        }
        {
            error && <p className="text-red-500">{error}</p>
        }
        </>
    )
}