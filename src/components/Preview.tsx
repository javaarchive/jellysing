
import {useState} from "react";
import Jsz from "../lib/jsz";
import SelectJszFile from "./SelectJszFile";
import Player from "./Player";

export default function Preview(){
    let [jsz, setJsz] = useState<Jsz>();

    return <>
        {jsz ? <Player jsz={jsz} />:<SelectJszFile onJszLoaded={setJsz}/>}
    </>
}

export {Preview};
const PreviewPage = Preview;
export {PreviewPage};