import { BlobReader, BlobWriter, TextReader, TextWriter, ZipReader, type ZipWriter } from "@zip.js/zip.js";

interface JszTimingHints {
    vocalTrackVolumeFocused: number;
    instrumentalTrackVolumeFocused: number;
    vocalTrackVolumeUnfocused: number;
    instrumentalTrackVolumeUnfocused: number;
    textDisplayTimepadding?: number;
}

interface JszStyling {
    backgroundColor: string;
    blurFocused: number;
    blurUnfocused: number;
    renderMode: string;
}

interface JszManifest {
    version: number;
    timingHints?: JszTimingHints;
    styling?: JszStyling;
    title?: string;
    artists?: string[];
    album?: string;
}

interface JszWord {
    start: number;
    end: number;
    word: string;
    // whisperx meta
    score?: number;
}

interface JszCharacter {
    start: number;
    end: number;
    character: string;
    // whisperx meta
    score?: number;
}

interface JszSegment {
    start: number;
    end: number;
    text: string;
    words?: JszWord[];
    characters?: JszCharacter[];
}

interface JszAlignment {
    segments: JszSegment[];
    preferedMode?: string;
}

export default class Jsz {

    manifest: JszManifest;
    alignment: JszAlignment;

    vocalsTrackFile?: Blob;
    instrumentalsTrackFile?: Blob;

    instrumentalFormatHint = "wav";
    vocalFormatHint = "wav";

    constructor(){
        this.manifest = {
            version: 1,
            timingHints: {
                vocalTrackVolumeFocused: 0.0,
                instrumentalTrackVolumeFocused: 1.0,
                vocalTrackVolumeUnfocused: 0.0,
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
            if(entry.filename === "manifest.json"){
                this.manifest = JSON.parse(await entry.getData(new TextWriter()));
            }else if(entry.filename === "alignment.json"){
                this.alignment = JSON.parse(await entry.getData(new TextWriter()));
            }else if(entry.filename === "vocals.wav" || entry.comment == "tag:vocals") {
                this.vocalsTrackFile = await entry.getData(new BlobWriter());
                this.vocalFormatHint = entry.filename.split(".").pop();
            }else if(entry.filename === "instrumentals.wav" || entry.comment == "tag:instrumentals") {
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
}

export {Jsz};