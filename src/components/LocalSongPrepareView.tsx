import {useState, useEffect, useCallback} from "react";
import {useDropzone} from "react-dropzone";
import type { SongMetadata } from "../lib/jsz";

import {parseBlob} from "music-metadata";
import SongPrepareView from "./SongPrepareView";

export default function LocalSongPrepareView() {

    const [loading, setLoading] = useState("");
    const [audioBlob, setAudioBlob] = useState(null);
    const [songTitle, setSongTitle] = useState("");
    const [songArtistsString, setSongArtistsString] = useState("");
    const [songAlbum, setSongAlbum] = useState("");
    const [songDuration, setSongDuration] = useState(0);
    const [song, setSong] = useState<SongMetadata>(null);
    const [imageURL, setImageURL] = useState(null);

    const dropCallback = useCallback(async (acceptedFiles: File[]) => {
        if(acceptedFiles.length == 0){
            alert("No file selected");
            return;
        }
        let file = acceptedFiles[0];
        setLoading("Attempting to load file...");
        let audio = document.createElement("audio");
        audio.src = URL.createObjectURL(file);
        audio.onloadeddata = async () => {
            // get 
            const duration = audio.duration;
            setSongDuration(duration);
            // alert("Got duration: " + duration);
            audio.remove();
            console.log("Browser duration: " + duration);
            setLoading("Getting metadata"); 
            // throw it into advanced metadata thing
            const data = await parseBlob(file);
            if(data.common.picture){
                const pictureArrayBuffer = data.common.picture[0].data;
                const blob = new Blob([pictureArrayBuffer], {type: data.common.picture[0].format});
                setImageURL(URL.createObjectURL(blob));
            }
            if(data.common.title){
                setSongTitle(data.common.title);
            }
            if(data.common.artists){
                setSongArtistsString(data.common.artists.join(", "));
            }
            if(data.common.album){
                setSongAlbum(data.common.album);
            }
            if(data.format.duration){
                setSongDuration(data.format.duration);
            }
            console.log("Metdata duration: " + data.format.duration);
            console.log(data.common);
            setLoading("");
        };
        setAudioBlob(file);
    }, []);

    function submitMetadata(){
        setSong({
            title: songTitle,
            album: songAlbum,
            artists: songArtistsString.split(",").map(s => s.trim()),
            duration: songDuration,
            image: imageURL,
        });
    }

    const {getRootProps, getInputProps, isDragActive} = useDropzone({
        onDrop: dropCallback,
        maxFiles: 1
    });

    return <><div className="p-4 h-full w-full min-h-24">
        <div {...getRootProps()} className="w-full min-h-24 bg-gray-200 border-dashed border-2 border-accent rounded-md flex flex-col justify-center items-center">
            <input {...getInputProps()} />
            <p>{
                loading ? loading :
                isDragActive ? "Drop the audio file here..." :
                "Drag and drop an audio file here, or click to select a file."
            }</p>
        </div>
    </div>
    {audioBlob && <>
    <h1 className="text-center text-2xl font-extralight">Song Metadata</h1>
    <p>
        Autofilling from metadata is not always accurate, so you can override here.
    </p>
    <label htmlFor="songTitle">Song Title:</label>
    <input type="text" placeholder="Song Title" name="songTitle" value={songTitle} onChange={(e) => setSongTitle(e.target.value)} className="w-full rounded-md border-2 border-gray-300 bg-gray-100 p-2 text-gray-900 focus:border-blue-500 focus:ring-blue-500" />
    <label htmlFor="songArtists">Song Artists:</label>
    <input type="text" placeholder="Song Artists" name="songArtists" value={songArtistsString} onChange={(ev) => setSongArtistsString(ev.target.value)} className="w-full rounded-md border-2 border-gray-300 bg-gray-100 p-2 text-gray-900 focus:border-blue-500 focus:ring-blue-500" />
    <label htmlFor="songAlbum">Song Album:</label>
    <input type="text" placeholder="Song Album" name="songAlbum" value={songAlbum} onChange={(e) => setSongAlbum(e.target.value)} className="w-full rounded-md border-2 border-gray-300 bg-gray-100 p-2 text-gray-900 focus:border-blue-500 focus:ring-blue-500" />
    <button onClick={() => submitMetadata()} className="mt-4 bg-accent w-full p-4 text-accent-foreground rounded-md">Looks ok!</button>
    </>}
    {song && <>
        <SongPrepareView song={song} audioBlob={audioBlob} />
    </>
    }
    </>;
}