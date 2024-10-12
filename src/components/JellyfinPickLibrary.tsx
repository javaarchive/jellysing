import {useState, useEffect} from "react";
import { getDefaultClient, tryGetLocalStorage } from "../lib/jellyfin_client";

export default function JellyfinPicklibrary() {

    const [libraries, setLibraries] = useState(null);
    
    async function refreshLibraries() {
        const client = getDefaultClient();
        const basicInfo = client.tryGetBasicInfo();
        try{
            const serverLibrariesResponse = await client.getLibraries();
            const musicLibraries = serverLibrariesResponse["Items"].filter(library => library["CollectionType"] == "music");
            console.log(musicLibraries);
            setLibraries(musicLibraries);
        }catch(ex){
            alert("Error fetching libraries: " + ex);
        }
    }
    
    function selectLibrary(library: any) {
        if(!confirm(`Are you sure you want to select ${library["Name"]}?`)) return;
        if(tryGetLocalStorage()){
            tryGetLocalStorage().setItem("jellyfin-library-id", library["Id"]);
            location.href = "/"; // hack because we can't do an astro redirect here.
        }else{
            alert("Error: local storage not available");
        }
    }

    useEffect(() => {
        refreshLibraries();
    }, []);

    return (
        <>
            {libraries && libraries.map((item) => {
                return (
                    <div className="m-auto p-4 max-w-md" key={item["Id"]} onClick={() => selectLibrary(item)}>
                        <h1>{item["Name"]}</h1>
                        <p>{item["Path"]}</p>
                    </div>
                );
            })}
            {!libraries && <p>Loading...</p>}
           {/* TODO add refresh button instead of forcing a hard refresh for the user*/} 
        </>
    );
}