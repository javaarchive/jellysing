import {useState, useRef, useEffect} from "react";
import { getDefaultBackendClient } from "../lib/backend_client";
import { download } from "../lib/util";

interface SongSeparatorProps {
    inputAudio: Blob;
    onVocalAudioBlob?: (blob: Blob) => void;
    onInstrumentalAudioBlob?: (blob: Blob) => void;
    onFinish?: (hash: string) => void;
}

export function SongSeparator(props: SongSeparatorProps) {
    
    const instrumentalAudioRef = useRef<HTMLAudioElement>(null);
    const vocalAudioRef = useRef<HTMLAudioElement>(null);
    const [processing, setProcessing] = useState(false);
    const [seperationText, setSeperationText] = useState("");
    const [vocalAudioBlob, setVocalAudioBlob] = useState(null);
    const [instrumentalAudioBlob, setInstrumentalAudioBlob] = useState(null);

    // react to updates in blob
    useEffect(() => {
        if(vocalAudioRef.current && vocalAudioBlob){
            vocalAudioRef.current.src = URL.createObjectURL(vocalAudioBlob);
        }
    }, [vocalAudioBlob]);

    useEffect(() => {
        if(instrumentalAudioRef.current && instrumentalAudioBlob){
            instrumentalAudioRef.current.src = URL.createObjectURL(instrumentalAudioBlob);
        }
    }, [instrumentalAudioBlob]);

    if(!props.inputAudio) return <p>No audio loaded for separation yet.</p>;

    async function performSeperation(){
        console.log("Performing separation via remote");
        
        const backend = getDefaultBackendClient();

        setProcessing(true);
        setSeperationText("Connecting to backend...");
        try{
            const formData = new FormData();
            formData.append("file", props.inputAudio, "input.wav"); // file extension confusion is ok here
            let updates = 0;
            let resp = await backend.fetchEventSource("/separate", async function(ev){
                console.log(ev);
                console.log(ev.data);
                const data = JSON.parse(ev.data);
                const event = ev.event;
                if(event == "init"){
                    setSeperationText("Connection opened...");
                }else if(event == "infer_queued"){
                    setSeperationText("Queued...");
                }else if(event == "load_progress"){
                    const loadedBytes = data["read"];
                    const percentDone = Math.ceil((loadedBytes / props.inputAudio.size) * 100);
                    setSeperationText("Loading: " + (loadedBytes / 1024 / 1024).toFixed(2) + " MB of " + props.inputAudio.size / 1024 / 1024 + " MB " + percentDone + "%");
                }else if(event == "infer_progress"){
                    updates ++;
                    setSeperationText("Processing: " + updates + " pings received...");
                }else if(event == "infer_start"){
                    setSeperationText("Processing started...");
                }else if(event == "results"){
                    setSeperationText("Done! Downloading results");
                    const filenames = data["filenames"];
                    // loading
                    const [vocalFilename, instrumentalFilename] = filenames;
                    let [vocalRequest, instrumentalRequest] = await Promise.all([backend.request("/data/" + vocalFilename, "GET", null, true), backend.request("/data/" + instrumentalFilename, "GET", null, true)]);
                    // downloading
                    let [vocalBlob, instrumentalBlob] = await Promise.all([vocalRequest.blob(), instrumentalRequest.blob()]);
                    if(props.onVocalAudioBlob){
                        props.onVocalAudioBlob(vocalBlob);
                    }
                    if(props.onInstrumentalAudioBlob){
                        props.onInstrumentalAudioBlob(instrumentalBlob);
                    }
                    setProcessing(false);
                    setSeperationText("Done!");
                    setVocalAudioBlob(vocalBlob);
                    setInstrumentalAudioBlob(instrumentalBlob);
                    props.onFinish(data["hash"]);
                }
            }, {
                body: formData,
                method: "POST"
            });
            console.log(resp);
        }catch(ex){
            // alert("Error: " + ex);
            setProcessing(false);
        }
    }

    return (
        <>
            <button onClick={() => performSeperation()} className="w-full p-2 rounded-md m-2 bg-accent text-accent-foreground" disabled={processing}>{processing ? seperationText: "Seperate"}</button>
            <div className="grid grid-cols-2 gap-4">
                <div className="m-auto p-4 max-w-md bg-secondary text-secondary-foreground rounded-md">
                    <span className="font-bold">Instrumental</span>
                    <audio controls ref={instrumentalAudioRef} className="min-w-full" />
                </div>
                <div className="m-auto p-4 max-w-md bg-secondary text-secondary-foreground rounded-md">
                    <span className="font-bold">Vocal</span>
                    <audio controls ref={vocalAudioRef} className="min-w-full" />
                </div>
            </div>
            <button onClick={() => {
                if(instrumentalAudioRef.current && vocalAudioRef.current){
                    instrumentalAudioRef.current.currentTime = 0;
                    vocalAudioRef.current.currentTime = 0;
                    instrumentalAudioRef.current.play();
                    vocalAudioRef.current.play();
                }
            }} className="w-full p-2 rounded-md m-2 bg-accent text-accent-foreground">Play both from start synced.</button>
        </>
    )
}