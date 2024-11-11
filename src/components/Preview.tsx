
import {useState} from "react";
import Jsz from "../lib/jsz";
import SelectJszFile from "./SelectJszFile";
import Player from "./Player";

interface PreviewProps {
    displayMode?: string;
    renderMode?: string;
    focusVolControlBeta?: boolean;
    forceVocalsOnUnfocused?: boolean;
    disableFonts?: boolean;
}

export default function Preview(props: PreviewProps){
    let [jsz, setJsz] = useState<Jsz>();

    function onJszLoaded(jsz: Jsz){
        document.title = jsz.manifest.title + " - " + jsz.manifest.artists.join(", ");
        if(props.focusVolControlBeta){
            console.warn("Focus vol control beta enabled");
            jsz.manifest.timingHints.useFocusUnfocusVolumeControl = true;
        }
        if(props.forceVocalsOnUnfocused){
            console.warn("Forcing vocals on unfocused");
            jsz.manifest.timingHints.vocalTrackVolumeUnfocused = 1.0;
        }
        setJsz(jsz);
    }

    return <>
        {jsz ? <Player jsz={jsz} displayMode={props.displayMode} renderMode={props.renderMode} disableFonts={props.disableFonts} />:<SelectJszFile onJszLoaded={onJszLoaded} />}
    </>
}

export {Preview};
const PreviewPage = Preview;
export {PreviewPage};