// lrc parsing

interface LyricInfo {
    startTime: number;
    endTime: number;
    text: string;
}

export function parseLRC(lrc: string, durationHint: number = -1): LyricInfo[] {
    const lines = lrc.replaceAll("\r\n", "\n").split("\n").filter(line => line.startsWith("["));
    // TODO: parse repeating lyrics
    let output = [];
    for(let i = 0; i < lines.length; i++){
        let line = lines[i];
        // if(line.trim().length == 0) continue;
        let timestamp = line.substring(1, line.indexOf("]"));
        let components = timestamp.split(":");
        let [min, sec, hundredths] = components.map(comp => parseInt(comp));
        let time = min * 60 + sec + hundredths / 100;
        let timeMs = min * 60 * 1000 + sec * 1000 + hundredths * 10;
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