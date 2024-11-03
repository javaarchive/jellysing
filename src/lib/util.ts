// lrc parsing

import parseSRTExternal from "parse-srt";

export interface LyricLine {
    startTime: number;
    endTime: number;
    text: string;
}

export function parseLRC(lrc: string, durationHint: number = -1): LyricLine[] {
    const lines = lrc.replaceAll("\r\n", "\n").split("\n").filter(line => line.startsWith("["));
    // TODO: parse repeating lyrics
    let output = [];
    for(let i = 0; i < lines.length; i++){
        const line = lines[i];
        // if(line.trim().length == 0) continue;
        const timestamp = line.substring(1, line.indexOf("]"));
        const partialSplit = timestamp.split(":");
        const components = [partialSplit[0], ...partialSplit[1].split(".")];
        const [min, sec, hundredths] = components.map(comp => parseInt(comp));
        const time = min * 60 + sec + hundredths / 100;
        const timeMs = min * 60 * 1000 + sec * 1000 + hundredths * 10;
        output.push({
            startTime: timeMs,
            text: line.substring(line.indexOf("]") + 1).trim(),
            endTime: -1
        })
    }
    for(let i = 0; i < output.length - 1; i++){
        output[i].endTime = output[i + 1].startTime;
    }
    output = output.filter(line => line.text.trim().length > 0);
    return output;
}

export function parseSRT(srt: string): LyricLine[] {
    return parseSRTExternal(srt).map(line => {
        return {
            // secs to ms
            startTime: line.start * 1000,
            endTime: line.end * 1000,
            text: line.text
        };
    });
}

interface DownloadCallbacks {
    onProgress: (progress: number, total: number) => void;
    onFinish: (blob: Blob) => void;
}

// impl of algo from https://javascript.info/fetch-progress
export async function download(resp: Response, callbacks: DownloadCallbacks) {
    console.log("CL", resp.headers.get("Content-Length"))
    let length = parseInt(resp.headers.get("Content-Length"));
    console.log("Download size", length);
    if(length) throw new Error("Not implemented, need to know length of content to do progress bar of download");

    let chunks = [];

    const reader = resp.body.getReader();

    let downloadedAmount = 0;

    let showProgress = !Number.isNaN(length);

    if(showProgress) callbacks.onProgress(downloadedAmount, length);

    while(true){
        const {done, value} = await reader.read();
        if(done) break;
        downloadedAmount += value.length;
        chunks.push(value);
        if(showProgress) callbacks.onProgress(downloadedAmount, length);
    }

    const blob = new Blob(chunks);
    callbacks.onFinish(blob);
    return blob;
}

export function preprocessText(text: string){
    // unspecial char things
    return text.replaceAll("“", '"').replace("”", '"').replaceAll("‘", "'").replaceAll("’", "'").replaceAll("…", "...").replaceAll("–", "-").replaceAll("—", "--").replaceAll("―", "---").replaceAll("•", "*");
}