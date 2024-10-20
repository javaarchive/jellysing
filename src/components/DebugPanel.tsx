import {useState} from "react";
import { getDefaultJellyfinClient, tryGetSavedLibraryId } from "../lib/jellyfin_client";
import { parseLRC } from "../lib/util";

// TODO: handle bad jellyfin credentiaals?

export default function DebugPanel() {
    let [input, setInput] = useState("");
    let [output, setOutput] = useState("");
    let [prettify, setPrettify] = useState(false);

    const debugMethods = {
        "lyrics": (input: string) => {
            return parseLRC(input, -1);
        },
    }

    function generateDebugCallback(type){
        return (ev) => {
            let output = debugMethods[type](input);
            setOutput(JSON.stringify(output, null, 4));
        }
    }

    const buttonClassname = "w-full rounded-md border-2 border-gray-300 bg-accent text-accent-foreground";

    return (
        <>
            <p>
                Input:
            </p>
            <textarea value={input} onChange={(ev) => setInput(ev.target.value)} className="w-full rounded-md border-2 border-gray-300 bg-gray-100 p-2 text-gray-900 focus:border-blue-500 focus:ring-blue-500" />
            <p>
                Tests:
            </p>
            <button onClick={generateDebugCallback("lyrics")} className={buttonClassname}>Parse lyrics</button>
            <p>
                Output:
            </p>
            <button onClick={() => setPrettify(!prettify)} className={buttonClassname}>{prettify ? "Use Raw Output" : "Use Pretty Output"}</button>
            <textarea value={output} onChange={(ev) => setOutput(ev.target.value)} className="w-full rounded-md border-2 border-gray-300 bg-gray-100 p-2 text-gray-900 focus:border-blue-500 focus:ring-blue-500" />
        </>
    );
}