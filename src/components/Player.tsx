import { useState, useEffect, useRef } from "react";
import {Howl, Howler} from 'howler';
import Jsz from "../lib/jsz";
import { CirclePlay } from "lucide-react";



interface TextDisplayProps {
    jsz: Jsz;
    renderMode?: string;
    displayMode: string;
    pos: number;
}

interface TextDisplayModuleProps {
    jsz: Jsz;
    renderMode?: string;
    displayMode?: string;
    pos: number;
}

export function SingleLineDisplay(props: TextDisplayModuleProps){
    return <>
        
    </>
}

export function TextDisplay(props: TextDisplayProps){
    if(props.renderMode == "node"){
        return <></>
    }else{
        return <SingleLineDisplay {...props} />
    }
}

interface PlayerProps {
    jsz: Jsz;
    renderMode?: string;
    displayMode?: string;
}

export default function Player(props: PlayerProps){
    // inst track is controller
    let instrumentalAudio = useRef(null);
    let vocalAudio = useRef(null);

    let [playbackPos, setPlaybackPos] = useState(0);
    let [userInteracted, setUserInteracted] = useState(false);
    let [displayMode, setDisplayMode] = useState(props.displayMode || "word");

    useEffect(() => {
        setDisplayMode(props.displayMode || "word");
    }, [props.displayMode]);

    useEffect(() => {
        console.log(props.jsz);
        let running = false;
        let instrumentalAudioBlobURL = URL.createObjectURL(props.jsz.instrumentalsTrackFile);
        let vocalAudioBlobURL = URL.createObjectURL(props.jsz.vocalsTrackFile);

        console.log(instrumentalAudioBlobURL, vocalAudioBlobURL);

        instrumentalAudio.current = new Howl({
            src: [instrumentalAudioBlobURL],
            volume: props.jsz.manifest.timingHints.instrumentalTrackVolumeUnfocused,
            preload: true,
            format: ["wav"]
        });
        vocalAudio.current = new Howl({
            src: [vocalAudioBlobURL],
            volume: props.jsz.manifest.timingHints.vocalTrackVolumeUnfocused,
            preload: true,
            format: ["wav"]
        });
        function tick(){
            if(!instrumentalAudio.current || !vocalAudio.current) return;
            const masterPos = instrumentalAudio.current.seek();
            if(Math.abs(vocalAudio.current.seek() - masterPos) > 0.1){
                // desync detected
                if(vocalAudio.current.playing()){
                    vocalAudio.current.seek(masterPos);
                }
            }
            setPlaybackPos(masterPos);
            if(running) requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
        return () => {
            running = false;
        };
    }, [props.jsz]); 


    function handleKey(ev: React.KeyboardEvent<HTMLDivElement>){
        console.log(ev.code);
        if(ev.code == "Space"){
            // TODO: overlay
            if(instrumentalAudio.current){
                if(instrumentalAudio.current.playing()){
                    instrumentalAudio.current.pause()
                    if(vocalAudio.current){
                        vocalAudio.current.pause();
                    }
                }else{
                    instrumentalAudio.current.play();
                    if(vocalAudio.current){
                        vocalAudio.current.play();
                    }
                }
            }
        }
    }

    function startPlayback(){
        if(!instrumentalAudio.current || !vocalAudio.current){
            alert("Something broke and not everything was loaded! Please reload the page.");
            return;
        };
        setUserInteracted(true);
        instrumentalAudio.current.seek(0);
        vocalAudio.current.seek(0);
        instrumentalAudio.current.play();
        vocalAudio.current.play();
        console.log("started playback " + instrumentalAudio.current.state() + " " + vocalAudio.current.state());
    }

    return <div className="w-full h-full" onKeyUp={(ev) => handleKey(ev)}>
        {/* background layer */}
        {<TextDisplay jsz={props.jsz} renderMode={props.renderMode || "auto"} pos={playbackPos} />}
        {!userInteracted && <>
            <div className="w-full h-full absolute top-0 left-0 bg-black bg-opacity-50 flex flex-col justify-center items-center" onClick={startPlayback}>
                <div className="w-full h-full flex flex-col justify-center items-center">
                    <div className="w-full h-full flex flex-col justify-center items-center">
                        <CirclePlay size={48} className="w-48 h-48 text-white" />
                        {/* yes the click bb is actually farther up, funnily */}
                    </div>
                </div>
            </div>
        </>}
    </div>;
}