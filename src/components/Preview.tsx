
import {useState} from "react";
import Jsz from "../lib/jsz";
import SelectJszFile from "./SelectJszFile";
import Player from "./Player";

interface PreviewProps {
    displayMode?: string;
    renderMode?: string;
}

export default function Preview(props: PreviewProps){
    let [jsz, setJsz] = useState<Jsz>();

    return <>
        {jsz ? <Player jsz={jsz} displayMode={props.displayMode} renderMode={props.renderMode} />:<SelectJszFile onJszLoaded={setJsz}/>}
    </>
}

export {Preview};
const PreviewPage = Preview;
export {PreviewPage};