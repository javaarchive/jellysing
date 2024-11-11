import { useState, useEffect, useRef, useMemo, type CSSProperties } from "react";
import {Howl, Howler} from 'howler';
import Jsz, { type JszDisplaySegment } from "../lib/jsz";
import { CirclePlay } from "lucide-react";



interface TextDisplayProps {
    jsz: Jsz;
    renderMode?: string;
    displayMode: string;
    pos: number;
    className?: string;
}

interface TextDisplayModuleProps {
    jsz: Jsz;
    renderMode?: string;
    displayMode?: string;
    pos: number;
    className?: string;
}

interface SegmentTextDisplayProps {
    jsz: Jsz;
    segment: JszDisplaySegment | null;
    pos: number;
    displayMode?: string;
    renderMode?: string;
}

export function SegmentTextDisplay(props: SegmentTextDisplayProps){
    const segment = props.segment;
    const segmentDuration = segment.end - segment.start;
    if(!segment) return <></>;
    return <>
        {segment[props.displayMode || "words"].map((part, index) => {
            const partDuration = part.end - part.start;
            let progress = 0;
            if(partDuration == 0){
                progress = part.end <= props.pos ? 1 : 0;
            }else if(props.pos >= part.start && props.pos <= part.end){
                progress = (props.pos - part.start) / partDuration;
            }else if(props.pos > part.end){
                progress = 1;
            }
            const progressPercent = (progress * 100) + "%";
            // props.pos < props.start so 0 is fine
            const key = part.start + "-" + part.end + ":" + part.text;
            if(!part.start || !part.end) console.warn(part);
            return <span key={key} data-text={part.text} data-start={part.start} data-end={part.end} data-progress={progress} data-progress-percent={progressPercent} className={"text-partial"} style={{"--progress-inject": progress, "--progress-inject-percent": progressPercent} as any}>{part.text}</span>
        })}
    </>;
}

export function SingleLineDisplay(props: TextDisplayModuleProps){
    const segment = props.jsz.getSegmentDisplayDataWithHints(props.pos);
    return <div className={"absolute inset-x-0 bottom-0 mx-auto w-fit " + (props.className || "")}>
        {segment &&
            <SegmentTextDisplay {...props} segment={segment} />
        }
        {!segment && <span className="no-segment debug">{props.pos.toFixed(2)}</span>}
    </div>;
}

export function ForesightLinesDisplay(props: TextDisplayModuleProps){
    const segment = props.jsz.getSegmentDisplayDataWithHints(props.pos);
    const nextSegment = segment ? props.jsz.getSegmentDisplay(segment.index + 1) : null;
    return <div className={"absolute inset-x-0 bottom-0 mx-auto w-fit " + (props.className || "")}>
        {segment &&
            <SegmentTextDisplay {...props} segment={segment} />
        }
        {nextSegment && <br />}
        {
            nextSegment && 
            <SegmentTextDisplay {...props} segment={nextSegment} />
        }
        {!segment && <span className="no-segment debug">{props.pos.toFixed(2)}</span>}
    </div>;
}

export function TextDisplay(props: TextDisplayProps){
    if(props.renderMode == "none"){
        return <></>
    }else if(props.renderMode == "foresight"){
        return <ForesightLinesDisplay {...props} />;
    }else{
        return <SingleLineDisplay {...props} />
    }
}

interface PlayerProps {
    jsz: Jsz;
    renderMode?: string;
    displayMode?: string;
    disableFonts?: boolean;
}

export default function Player(props: PlayerProps){
    // inst track is controller
    let instrumentalAudio = useRef(null);
    let vocalAudio = useRef(null);
    let backgroundVideo = useRef(null);

    let [playbackPos, setPlaybackPos] = useState(0);
    let [userInteracted, setUserInteracted] = useState(false);
    let [displayMode, setDisplayMode] = useState(props.displayMode || "words");
    let [renderMode, setRenderMode] = useState(props.renderMode || "auto");
    let [backgroundPrerequistesLoaded, setBackgroundPrerequisitesLoaded] = useState(false);
    let [currentFontFamily, setCurrentFontFamily] = useState((!props.disableFonts && props.jsz.getFont(0)) || "Inter Variable");

    useEffect(() => {
        setDisplayMode(props.displayMode || "words");
    }, [props.displayMode]);

    useEffect(() => {
        setRenderMode(props.renderMode || "auto");
    }, [props.renderMode]);

    function resync(){
        if(!instrumentalAudio.current || !vocalAudio.current) return;
        let pos = instrumentalAudio.current.seek();
        vocalAudio.current.seek(pos);
    }

    function seekAll(pos: number){
        if(instrumentalAudio.current) instrumentalAudio.current.seek(pos);
        if(vocalAudio.current) vocalAudio.current.seek(pos);
        if(props.jsz.backgroundVideoFile){
            if(backgroundVideo.current) backgroundVideo.current.currentTime = pos;
        }
        setPlaybackPos(pos);
    }

    useEffect(() => {
        console.log(props.jsz);
        let running = true;
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

        async function loadingPart2(){
            if(props.jsz.fonts[currentFontFamily]){
                // load external font
                console.log("loading font " + currentFontFamily);
                const fontBlobURL = URL.createObjectURL(props.jsz.fonts[currentFontFamily]);
                const fontFace = new FontFace(currentFontFamily, `url(${fontBlobURL})`);
                await fontFace.load();
                document.fonts.add(fontFace);
            }
            setBackgroundPrerequisitesLoaded(true);
        }

        if(props.jsz.backgroundVideoFile){
            let backgroundVideoBlobURL = URL.createObjectURL(props.jsz.backgroundVideoFile);
            backgroundVideo.current.preload = "auto";
            backgroundVideo.current.src = backgroundVideoBlobURL;
            backgroundVideo.current.load();
            backgroundVideo.current.addEventListener("canplaythrough", () => {
                loadingPart2();
            });
        }else{
            loadingPart2();
        }
        
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

        function importantPerciseTick(){

            const masterPos = instrumentalAudio.current.seek();

            const desiredVocalVolume = props.jsz.getVocalVolume(masterPos);
            const desiredInstrumentalVolume = props.jsz.getInstrumentalVolume(masterPos);
            if(vocalAudio.current.volume() != desiredVocalVolume){
                vocalAudio.current.volume(desiredVocalVolume);
            }
            if(instrumentalAudio.current.volume() != desiredInstrumentalVolume){
                instrumentalAudio.current.volume(desiredInstrumentalVolume);
            }
        }
        const importantPerciseTickInterval = setInterval(importantPerciseTick, 100);
        requestAnimationFrame(tick);
        return () => {
            clearInterval(importantPerciseTickInterval);
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
                    if(props.jsz.backgroundVideoFile){
                        if(backgroundVideo.current){
                            backgroundVideo.current.pause();
                        }
                    }
                }else{
                    instrumentalAudio.current.play();
                    if(vocalAudio.current){
                        vocalAudio.current.play();
                    }
                    if(props.jsz.backgroundVideoFile){
                        if(backgroundVideo.current){
                            backgroundVideo.current.play();
                        }
                    }
                }
            }
        }else if(ev.code == "ArrowLeft"){
            seekAll(playbackPos - 5);
        } else if(ev.code == "ArrowRight") {
            seekAll(playbackPos + 5);
        } else if(ev.code == "KeyV"){
            if(props.jsz.manifest.timingHints.vocalTrackVolumeUnfocused == 0.0){
                props.jsz.manifest.timingHints.vocalTrackVolumeUnfocused = 1.0;
            }
            props.jsz.tempVocalOverride = !props.jsz.tempVocalOverride;
            /*if(vocalAudio.current){
                if(vocalAudio.current.volume()){
                    vocalAudio.current.volume(0.0);
                }else{
                    vocalAudio.current.volume(1.0);
                }
            }*/
           resync();
        }
    }

    function startPlayback(){
        if(!instrumentalAudio.current || !vocalAudio.current || !backgroundPrerequistesLoaded){
            alert("Something broke and not everything was loaded! Please reload the page or try again in a few seconds.");
            return;
        };
        setUserInteracted(true);
        instrumentalAudio.current.seek(0);
        vocalAudio.current.seek(0);
        instrumentalAudio.current.play();
        vocalAudio.current.play();
        if(props.jsz.manifest.timingHints.backgroundVideoMuted){
            backgroundVideo.current.muted = true;
        }else{
            backgroundVideo.current.muted = false;
        }
        if(props.jsz.backgroundVideoFile){
            backgroundVideo.current.currentTime = 0;
            backgroundVideo.current.play();
        }
        console.log("started playback " + instrumentalAudio.current.state() + " " + vocalAudio.current.state());
    }

    let extraStyles: any = useMemo(() => {
        let output = {
            "--web-player": "1",
            "fontFamily": currentFontFamily,
        };
        if(props.jsz.manifest.styling.activeTextColor){
            output["--partial-progressed-color"] = props.jsz.manifest.styling.activeTextColor;
           
        }
        if(props.jsz.manifest.styling.inactiveTextColor){
            output["--partial-initial-color"] = props.jsz.manifest.styling.inactiveTextColor;
        }
        if(props.jsz.manifest.styling.backgroundColor){
            output["--background"] = props.jsz.manifest.styling.backgroundColor;
            output["backgroundColor"] = props.jsz.manifest.styling.backgroundColor;
        }else{
            output["backgroundColor"] = "black";
        }
        return output;
    }, [props.jsz, currentFontFamily]); // TODO: make time a dependency

    return <div className="w-full h-full grid" onKeyDown={(ev) => handleKey(ev)} tabIndex={0} style={extraStyles}>
        {/* background layer */}
        {
            <video ref={backgroundVideo} className="col-start-1 row-start-1 w-full h-auto" muted playsInline />
        /* video layer */
        }
        {
            <div className="col-start-1 row-start-1">
                <TextDisplay jsz={props.jsz} renderMode={props.renderMode || "auto"} pos={playbackPos} displayMode={displayMode} className="text-4xl font-medium mb-24 drop-shadow-my-default" />
            </div>
        }
        {!userInteracted && <>
            <div className="col-start-1 row-start-1">
                <div className="w-full h-full absolute top-0 left-0 bg-black bg-opacity-50 flex flex-col justify-center items-center" onClick={startPlayback}>
                    <div className="w-full h-full flex flex-col justify-center items-center">
                        <div className="w-full h-full flex flex-col justify-center items-center">
                            <CirclePlay size={96} className={"w-96 h-96 " + backgroundPrerequistesLoaded ? "text-white" : "text-gray-500"} />
                            {/* yes the click bb is actually farther up, funnily */}
                        </div>
                    </div>
                </div>
            </div>
        </>}
    </div>;
}