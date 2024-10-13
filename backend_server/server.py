import os
import hashlib
import json
import tempfile
import time
import asyncio
import threading
import queue

infer_lock = asyncio.Lock()

from dotenv import load_dotenv

load_dotenv()

from typing import Annotated

from fastapi import FastAPI, File, UploadFile
from fastapi.responses import StreamingResponse

app = FastAPI()

try:
    os.mkdir("data")
    print("Created data directory")
except:
    print("Data directory exists")

from audio_separator.separator import Separator

print("=== Loading model ===")
sep = Separator(output_dir = os.path.join(os.getcwd(), "data"))
sep.load_model(model_filename = os.getenv("SEP_MODEL", "model.onnx"))
print("=== Model loaded ===")

def seperate_file(filepath: str, queue: queue.Queue):
    output = sep.separate(filepath)
    queue.put(output)
    return output

# sse stream
async def processing_generator(file: UploadFile):
    def format_message(type: str, data: str):
        return f"event: {type}\ndata: {data}\n\n"
    sha256summer = hashlib.sha256()
    with tempfile.NamedTemporaryFile() as temp_file:
        yield format_message("init", json.dumps({
            "time": time.time()
        }))
        read_amount = 0
        while True:
            data = await file.read(1024 * 1024)
            read_amount += len(data)
            yield format_message("load_progress", json.dumps({
                "time": time.time(),
                "read": read_amount
            }))
            if not data:
                break
            sha256summer.update(data)
            temp_file.write(data)
        temp_file.flush()
        temp_file.seek(0)
        hash = sha256summer.hexdigest()
        yield format_message("load_complete", json.dumps({
            "time": time.time(),
            "read": read_amount,
            "sha256": hash
        }))
        yield format_message("infer_queued", json.dumps({
            "time": time.time(),
        }))
        async with infer_lock:
            yield format_message("infer_start", json.dumps({
                "time": time.time(),
            }))
            result_queue = queue.Queue()
            thread = threading.Thread(target=seperate_file, args=(temp_file.name,result_queue,))
            thread.start()
            ticks = 0
            while True:
                if not thread.is_alive():
                    break
                asyncio.sleep(0.1)
                ticks += 1
                if ticks % 100 == 0:
                    # this is to stop stuff like cloudflare from closing connection when it takes too long
                    yield format_message("infer_progress", json.dumps({
                        "time": time.time(),
                    }))
            yield format_message("infer_complete", json.dumps({
                "time": time.time(),
                "hash": hash,
            }))
            result = result_queue.get()
            # move results
            filenames = []
            for i in range(len(result)):
                final_filename = hash + "." + str(i + 1) + ".wav"
                os.rename(os.path.join(os.getcwd(), "data", result[i]), os.path.join(os.getcwd(), "data", final_filename))
                filenames.append(final_filename)
            # TODO figure out deletion of files
            yield format_message("results", json.dumps({
                "time": time.time(),
                "filenames": filenames,
            }))

@app.post("/seperate")
async def seperate_file(file: UploadFile):
    return StreamingResponse(processing_generator(file), media_type="text/event-stream")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("PORT", 8000)))