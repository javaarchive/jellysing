import {useState} from "react";
import { getDefaultClient, tryGetSavedLibraryId } from "../lib/jellyfin_client";

// TODO: handle bad jellyfin credentiaals?

export default function SearchView() {
    const [search, setSearch] = useState("");
    const [error, setError] = useState("");
    const [lastQueryTime, setLastQueryTime] = useState(0);
    const [results, setResults] = useState<string[]>([]);

    async function updateResults(query2: string) { 
        let query = search;
        if(query2){
            query = query2;
        }

        const client = getDefaultClient();
        if(!tryGetSavedLibraryId()){
            setError("No Jellyfin library selected yet.");
            return;
        }
        let queryStartTime = Date.now();
        let data = await client.request("/Items", "GET", {
            "searchTerm": query,
            "parentId": tryGetSavedLibraryId(),
            "userId": client.userId,
            "Recursive": true,
            "IncludeItemTypes": "Audio",
            "IncludeMedia": true,
        });
        console.log(data);
        setResults(data["Items"]);
        setLastQueryTime(Date.now() - queryStartTime);
    }

    return (
        <>
            <input
                type="text"
                placeholder="Search for something"
                value={search}
                onChange={(ev) => {
                    setSearch(ev.target.value);
                    updateResults(ev.target.value);
                }}
                className="w-full rounded-md border-2 border-gray-300 bg-gray-100 p-2 text-gray-900 focus:border-blue-500 focus:ring-blue-500"
            />
            {results.length > 0 && <p className="mt-8">Found <strong>{results.length}</strong> results, in {Math.floor(lastQueryTime)} ms.</p>} 
            <div className="grid grid-cols-4 gap-4 mt-2">
                {results.length > 0 && results.map((item) => {
                    const client = getDefaultClient();
                    const itemText = item["Name"] + " - " + item["Artists"].join(", ");
                    return (
                        <div key={item["Id"]}>
                            <a href={"/prepare/" + item["Id"]}><img src={client.getPrimaryImageUrl(item["AlbumId"] || item["Id"]) + "?fillHeight=384&fillWidth=384"} alt={itemText} className="w-full rounded-md border-2 border-gray-300 bg-gray-100 p-2 text-gray-900 focus:border-blue-500 focus:ring-blue-500 img-optimize" decoding="async" loading="lazy" /></a>
                            <h1>{itemText}</h1>
                        </div>
                    );
                })}
            </div>
            {results.length == 0 && <p>No results found =(</p>}
            {error && <p className="text-red-500">{error}</p>}
        </>
    );
}