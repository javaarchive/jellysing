import {useState, useEffect, useCallback} from "react";
import {useDropzone} from "react-dropzone";
import Jsz from "../lib/jsz";
import { BlobReader, ZipReader } from "@zip.js/zip.js";

interface SelectJszFileProps {
    onJszLoaded: (jsz: Jsz) => any;
}

export default function SelectJszFile(props: SelectJszFileProps){
    const [jsz, setJsz] = useState<Jsz>();
    const [isLoading, setIsLoading] = useState(false);

    const onDrop = useCallback(async (acceptedFiles: File[]) => {
        if(acceptedFiles.length == 0){
            alert("No file selected");
            return;
        }
        setIsLoading(true);
        let zipReader = new ZipReader(new BlobReader(acceptedFiles[0]));
        let jsz = new Jsz();
        try{
            await jsz.readFromZip(zipReader);
        }catch(ex){
            setIsLoading(false);
            return;
        }
        setJsz(jsz);
        props.onJszLoaded(jsz);
    }, []);

    const {getRootProps, getInputProps, isDragActive} = useDropzone({
        onDrop: onDrop,
        maxFiles: 1,
        accept: {
            "application/zip": [".jsz"]
        }
    });

    return <div className="p-4 h-full w-full min-h-full">
        <div {...getRootProps()} className="w-full min-h-full bg-gray-200 border-dashed border-2 border-accent rounded-md flex flex-col justify-center items-center">
            <input {...getInputProps()} />
            <p>{
                isLoading ? "Loading..." :
                isDragActive ? "Drop the jsz file here..." :
                "Drag and drop a jsz file here, or click to select a file."
            }</p>
        </div>
    </div>
}