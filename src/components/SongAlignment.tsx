import {useState, useEffect, useRef, useMemo} from "react";
import { getDefaultBackendClient } from "../lib/backend_client";
import { download, parseLRC, parseSRT, preprocessText, type LyricLine } from "../lib/util";

interface SongAlignmentProps {
    inputAudio?: Blob;
    inputHash?: string;
    inputPreviewTime?: number;
    lyrics: any;
    onAlignment?: (alignment: any) => void;
}

export function SongAlignment(props: SongAlignmentProps) {

    let [parsedLyrics, setParsedLyrics] = useState([]);
    let [reference, setReference] = useState("vocals");
    let [aligning, setAligning] = useState(false);
    let [alignmentStatus, setAlignmentStatus] = useState("waiting");
    let [alignment, setAlignment] = useState(null);


    useEffect(() => {
        if(!props.lyrics) return;
        if(!props.lyrics["syncedLyrics"]) return;
        const lyricInput = preprocessText(props.lyrics["syncedLyrics"]);
        if(!props.lyrics) return;
        let parsedLyricLines: LyricLine[] = [];
        if(props.lyrics["type"] == "lrc"){
            parsedLyricLines = parseLRC(lyricInput)
        }else if(props.lyrics["type"] == "srt"){
            parsedLyricLines = parseSRT(lyricInput)
        }
        setParsedLyrics(parsedLyricLines);
    }, [props.lyrics]);

    async function performAlignment(){
        setAligning(true);
        setAlignmentStatus("connecting to backend...");
        const backend = getDefaultBackendClient();
        let pings = 0;
        let lyrics = parsedLyrics;
        // new hack
        /*let duration = lyrics[lyrics.length - 1].endTime;
        let start = lyrics[0].startTime;
        lyrics = [
            {
                startTime: start,
                endTime: duration,
                text: lyrics.map(l => l.text).join(" ")
            }
        ]*/
        await backend.fetchEventSource("/align", async function(ev){
            const type = ev.event;
            const data = JSON.parse(ev.data);
            console.log(type, data);
            if(type == "infer_queued"){
                setAlignmentStatus("queued...");
            }else if(type == "infer_start"){
                setAlignmentStatus("processing...");
            }else if(type == "infer_progress"){
                pings ++;
                setAlignmentStatus("processing: last ping at " + data["time"] + " count " + pings + " keep waiting...");
            }else if(type == "alignment"){
                setAlignmentStatus("done!");
                setAligning(false);
                if(props.onAlignment) props.onAlignment(data["alignment"]);
                console.log(data);
                setAlignment(data["alignment"]);
            }
        }, {
            data: {
                lyrics: lyrics,
                reference: reference,
                input_hash: props.inputHash,
            }
        });
    }

    function getSegment(pos: number){
        return alignment["segments"].find(segment => segment.start <= pos && pos <= segment.end);
    }

    const seg = useMemo(() => alignment ? getSegment(props.inputPreviewTime) : null, [props.inputPreviewTime, alignment]);
    const avgScore = useMemo(() => {
        let words = 0;
        let chars = 0;
        let wordScoreSum = 0;
        let charScoreSum = 0;
        if(!alignment) return [0,0];
        for(let segment of alignment.segments){
            words += segment.words.length;
            chars += segment.chars.length;
            for(let word of segment.words){
                wordScoreSum += word.score || 0;
            }
            for(let char of segment.chars){
                charScoreSum += char.score || 0;
            }
        }
        return [wordScoreSum / words, charScoreSum / chars];
    }, [alignment]);

    return <>
        <p>
            Parsed {parsedLyrics.length} lyric lines. Reference mode: {reference}
        </p>
        <button onClick={() => performAlignment()} className="w-full p-2 rounded-md m-2 bg-accent text-accent-foreground">{aligning ? alignmentStatus: "Align"}</button>
        <textarea className="w-full p-2 rounded-md m-2" placeholder="Alignment data" name="alignment" value={JSON.stringify(alignment, null, 4)} readOnly />
        <div className="min-h-96 max-h-96">
        {
            alignment && alignment.segments && <>
                <h1 className="text-xl font-bold">
                    Alignment Test
                </h1>
                <p>
                    Press play on the above audio to check alignment. Average scores for words: {avgScore[0].toFixed(2)} and characters: {avgScore[1].toFixed(2)}. Current seconds: {props.inputPreviewTime}
                </p>
                {seg && <>
                    <h2 className="text-lg font-bold">
                        {getSegment(props.inputPreviewTime).words.filter(seg => seg.start <= props.inputPreviewTime).map(seg => seg.word).join(" ")}
                    </h2>
                    {seg.chars && <>
                    <p>
                        By characters:
                    </p>
                    <h2 className="text-lg font-bold">
                        {seg.chars.filter(seg => seg.start <= props.inputPreviewTime).map(seg => seg.char).join("")}
                    </h2>
                    </>}
                </>}
            </>
        }
        </div>
    </>
}