import os
import hashlib
import json
import tempfile
import time
import asyncio
import threading
import queue
# such a hack
import copy

infer_lock = asyncio.Lock()

from dotenv import load_dotenv

load_dotenv()

from typing import Annotated

from fastapi import FastAPI, File
from fastapi import UploadFile

from fastapi.staticfiles import StaticFiles
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# add wildcard cors
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
async def processing_generator(tempfile_path: str):
    file = open(tempfile_path, "rb")
    def format_message(type: str, data: str):
        return f"event: {type}\ndata: {data}\n\n"
    sha256summer = hashlib.sha256()
    yield format_message("init", json.dumps({
        "time": time.time()
    }))
    read_amount = 0
    while True:
        data = file.read(1024 * 1024)
        read_amount += len(data)
        if not data:
            break
        yield format_message("load_progress", json.dumps({
            "time": time.time(),
            "read": read_amount
        }))
        sha256summer.update(data)
    hash = sha256summer.hexdigest()
    yield format_message("load_complete", json.dumps({
        "time": time.time(),
        "read": read_amount,
        "hash": hash
    }))
    yield format_message("infer_queued", json.dumps({
        "time": time.time(),
    }))
    file.close()
    async with infer_lock:
        yield format_message("infer_start", json.dumps({
            "time": time.time(),
        }))
        result_queue = queue.Queue()
        thread = threading.Thread(target=seperate_file, args=(file.name,result_queue,))
        thread.start()
        ticks = 0
        while True:
            if not thread.is_alive():
                break
            await asyncio.sleep(0.1)
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
            final_filename = hash + "." + str(i) + ".wav"
            try:
                os.rename(os.path.join(os.getcwd(), "data", result[i]), os.path.join(os.getcwd(), "data", final_filename))
            except:
                # file alr exists so this failed
                os.unlink(os.path.join(os.getcwd(), "data", result[i]))
            filenames.append(final_filename)
        # TODO figure out deletion of files
        yield format_message("results", json.dumps({
            "time": time.time(),
            "filenames": filenames,
        }))
        os.unlink(tempfile_path)

@app.post("/seperate")
async def seperate_route(file: UploadFile):
    tmpfile_kwargs = {}
    if os.path.splitext(file.filename)[1] != "":
        tmpfile_kwargs["suffix"] = os.path.splitext(file.filename)[1]
    temp_file = tempfile.NamedTemporaryFile(**tmpfile_kwargs, delete = False) # dev windows machine is silly so it's not rlly a temp file
    # annoying copy to workaround fastapi bug
    # https://github.com/fastapi/fastapi/issues/10857
    while True:
        data = await file.read(1024 * 1024)
        if not data:
            break
        temp_file.write(data)
    path = temp_file.name
    temp_file.close()
    return StreamingResponse(processing_generator(path), media_type="text/event-stream")

@app.post("/exit")
def exit_route():
    if os.getenv("ALLOW_EXIT", False):
        import sys
        sys.exit(0)

# server data dir statically
app.mount("/data", StaticFiles(directory="data"), name="data")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("PORT", 8000)))