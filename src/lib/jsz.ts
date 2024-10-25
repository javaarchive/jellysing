import { BlobReader, BlobWriter, TextReader, TextWriter, ZipReader, type ZipWriter } from "@zip.js/zip.js";

export interface JszTimingHints {
    vocalTrackVolumeFocused: number;
    instrumentalTrackVolumeFocused: number;
    vocalTrackVolumeUnfocused: number;
    instrumentalTrackVolumeUnfocused: number;
    textDisplayTimepadding?: number;
    useFocusUnfocusVolumeControl?: boolean;
}

export interface JszStyling {
    backgroundColor: string;
    blurFocused: number;
    blurUnfocused: number;
    renderMode: string;
}

export interface JszManifest {
    version: number;
    timingHints?: JszTimingHints;
    styling?: JszStyling;
    title?: string;
    artists?: string[];
    album?: string;
}

export interface JszWord {
    start: number;
    end: number;
    word: string;
    // whisperx meta
    score?: number;
}

export interface JszCharacter {
    start: number;
    end: number;
    char: string;
    // whisperx meta
    score?: number;
}

export interface JszSegment {
    start: number;
    end: number;
    text: string;
    words?: JszWord[];
    chars?: JszCharacter[];
}

export interface JszAlignment {
    segments: JszSegment[];
    preferedMode?: string;
}

export interface JszDisplayPart {
    start: number;
    end: number;
    text: string;
    word?: string;
    char?: string;
    score?: number;
}

export interface JszDisplaySegment {
    start: number;
    end: number;
    text: string;
    words: JszDisplayPart[];
    chars: JszDisplayPart[];
    wordsFast: JszDisplayPart[];
    index: number;
}

export default class Jsz {

    manifest: JszManifest;
    alignment: JszAlignment;

    vocalsTrackFile?: Blob;
    instrumentalsTrackFile?: Blob;

    instrumentalFormatHint = "wav";
    vocalFormatHint = "wav";

    visualCache = null;

    constructor(){
        this.manifest = {
            version: 1,
            timingHints: {
                vocalTrackVolumeFocused: 0.0,
                instrumentalTrackVolumeFocused: 1.0,
                vocalTrackVolumeUnfocused: 1.0,
                instrumentalTrackVolumeUnfocused: 1.0,
                textDisplayTimepadding: 1.0
            },
            styling: {
                backgroundColor: "#000000",
                blurFocused: 0.0,
                blurUnfocused: 0.0,
                renderMode: "auto"
            },
        }
        this.alignment = {
            segments: []
        }
    }

    setTitle(title: string){
        this.manifest.title = title;
    }

    setArtists(artists: string[]){
        this.manifest.artists = artists;
    }

    setAlbum(album: string){
        this.manifest.album = album;
    }

    updateAlignment(alignment: JszAlignment){
        this.alignment = alignment;
        this.visualCache = null;
        this.generateVisualCache();
    }

    generateVisualCache(){
        this.visualCache = [];
        console.log("Generating visual cache", this.alignment);
        let index = 0;
        for(let segment of this.alignment.segments){
            const cacheSegment = {
                words: [],
                chars: [],
                wordsFast: [],
                start: segment.start,
                end: segment.end,
                text: segment.text,
                index: index
            };
            const words = segment.words || [];
            const chars = segment.chars || [];
            for(let i = 0; i < words.length; i++){
                cacheSegment.wordsFast.push({
                    start: words[i].start,
                    end: words[i].end,
                    word: words[i].word,
                    text: words[i].word,
                    score: words[i].score
                });
                const duration = words[i].end - words[i].start;
                // normal words splits up by char
                for(let j = 0; j < words[i].word.length; j++){
                    const charPart = {
                        // optimized calculation to avoid rounding errors
                        start: words[i].start + (j * duration) / words[i].word.length,
                        end: words[i].start + ((j + 1) * duration) / words[i].word.length,
                        char: words[i].word[j],
                        text: words[i].word[j]
                    };
                    cacheSegment.words.push(charPart);
                }
                if(i != words.length - 1){
                    const spacePart = {
                        start: words[i].end,
                        end: words[i + 1].start,
                        word: " ",
                        text: " ",
                        score: words[i].score
                    };
                    cacheSegment.wordsFast.push(spacePart);
                    cacheSegment.words.push(spacePart);
                }
            }
            for(let charPart of chars){
                cacheSegment.chars.push({
                    start: charPart.start,
                    end: charPart.end,
                    char: charPart.char,
                    text: charPart.char
                });
            }
            // fix chars with no timing data
            for(let i = 0; i < cacheSegment.chars.length; i++){
                let prevStart = (i != 0) ? cacheSegment.chars[i - 1].end : cacheSegment.start;
                let nextStart = (i != cacheSegment.chars.length - 1) ? cacheSegment.chars[i + 1].start : cacheSegment.end;
                if(!cacheSegment.chars[i].start) cacheSegment.chars[i].start = prevStart;
                if(!cacheSegment.chars[i].end) cacheSegment.chars[i].end = nextStart;
            }
            this.visualCache.push(cacheSegment);
            index ++;
        }
        console.info("Visual cache generated", this.visualCache);
    }

    addVocalsTrackFile(vocalsTrackFile: Blob){
        this.vocalsTrackFile = vocalsTrackFile;
    }

    addInstrumentalsTrackFile(instrumentalsTrackFile: Blob){
        this.instrumentalsTrackFile = instrumentalsTrackFile;
    }

    async writeToZip(zip: ZipWriter<any>){
        await zip.add("manifest.json", new TextReader(JSON.stringify(this.manifest)));
        await zip.add("alignment.json", new TextReader(JSON.stringify(this.alignment)));

        // TODO: alternate encoding options

        if(this.vocalsTrackFile){
            await zip.add("vocals.wav", new BlobReader(this.vocalsTrackFile));
        }else{
            console.warn("Jsz: No vocals track file");
        }

        if(this.instrumentalsTrackFile){
            await zip.add("instrumentals.wav", new BlobReader(this.instrumentalsTrackFile));
        }else{
            console.warn("Jsz: No instrumentals track file");
        }

        // TODO; background image and/or video support

        await zip.close();
    }

    async readFromZip(zip: ZipReader<any>){
        let entries = await zip.getEntries();
        for(let entry of entries){
            if(entry.filename == "manifest.json"){
                this.manifest = JSON.parse(await entry.getData(new TextWriter()));
            }else if(entry.filename == "alignment.json"){
                this.updateAlignment(JSON.parse(await entry.getData(new TextWriter())));
            }else if(entry.filename == "vocals.wav" || entry.comment == "tag:vocals") {
                this.vocalsTrackFile = await entry.getData(new BlobWriter());
                this.vocalFormatHint = entry.filename.split(".").pop();
            }else if(entry.filename == "instrumentals.wav" || entry.comment == "tag:instrumentals") {
                this.instrumentalsTrackFile = await entry.getData(new BlobWriter());
                this.instrumentalFormatHint = entry.filename.split(".").pop();
            }
            // TODO: background image and/or video support
        }
        await zip.close();
    }

    getSegment(pos: number){
        return this.alignment.segments.find(segment => segment.start <= pos && pos <= segment.end);
    }

    getSegmentWithPaddingComputation(pos: number){
        let segment = this.getSegment(pos);
        if(segment) return segment;
        let padding = this.manifest.timingHints.textDisplayTimepadding;
        return this.alignment.segments.find(segment => segment.start <= pos && pos <= segment.end + padding);
    }

    getSegmentDisplayData(pos: number, padding: number = 0): JszDisplaySegment | null {
        const segments = this.visualCache.filter(cacheSegment => cacheSegment.start <= pos && pos <= cacheSegment.end + padding);
        if(segments.length == 0) return null;
        return segments[segments.length - 1];
    }

    getSegmentDisplayDataWithHints(pos: number): JszDisplaySegment | null {
        let cacheSegment = this.getSegmentDisplayData(pos, 0);
        if(cacheSegment) return cacheSegment;
        return this.getSegmentDisplayData(pos, this.manifest.timingHints.textDisplayTimepadding);
    }

    getSegmentDisplay(index){
        return this.visualCache[index];
    }

    tempVocalOverride = false;

    isFocused(pos: number){
        const segment = this.getSegment(pos);
        if(segment){
            return true;
        }
        return false;
    }

    getVocalVolume(pos: number){
        if(this.tempVocalOverride){
            return this.manifest.timingHints.vocalTrackVolumeUnfocused;
        }
        if(this.manifest.timingHints.useFocusUnfocusVolumeControl) {
            if(this.isFocused(pos)){
                return this.manifest.timingHints.vocalTrackVolumeFocused;
            }
            return this.manifest.timingHints.vocalTrackVolumeUnfocused;
        }else{
            return this.manifest.timingHints.vocalTrackVolumeFocused;
        }
    }

    getInstrumentalVolume(pos: number){
        if(this.manifest.timingHints.useFocusUnfocusVolumeControl) {
            if(this.isFocused(pos)){
                return this.manifest.timingHints.instrumentalTrackVolumeFocused;
            }
            return this.manifest.timingHints.instrumentalTrackVolumeUnfocused;
        }else{
            return this.manifest.timingHints.instrumentalTrackVolumeFocused;
        }
    }
}

export {Jsz};