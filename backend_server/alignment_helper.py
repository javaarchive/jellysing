print("=== LOADING WHISPERX FOR ALIGNMENT ===")
import whisperx
import whisperx.alignment
import whisperx.audio
import os

device  = os.getenv("TORCH_DEVICE", "cuda")

# TODO support other languages
alignable_chars = "abcdefghijklmnopqrstuvwxyz'"
# so the elepahnt in the room is how do I highlight quotation marks when I need to?
# also punctuation

from pydantic import BaseModel

class LyricSegment:
    word: str

    def __init__(self, word: str):        
        self.word = word

    def compute_alignable_mask(self):
        return [c in alignable_chars for c in self.word]
    
    def get_alignable(self):
        return "".join([c for c, mask in zip(self.word, self.compute_alignable_mask()) if mask])

    def __repr__(self):
        return self.word

class LyricLine(BaseModel):
    startTime: float
    endTime: float
    text: str

    def get_segments(self):
        return [LyricSegment(word) for word in self.text.split(" ")]
        

class AlignmentTask(BaseModel):
    lyrics: list[LyricLine]
    reference: str = "vocals"
    input_hash: str

    def get_word_align_segments(self):
        return [segment for line in self.lyrics for segment in line.get_segments()]
    
    def get_alignable_segments(self):
        return [
            {
                # convert ms to seconds
                # also hack is to add padding
                "start": float(line.startTime) / 1000.0,
                "end": float(line.endTime) / 1000.0,
                "text": line.text
            } for line in self.lyrics
        ]
# load model
print("=== LOAD ALIGNEMNT MODEL ===")
# model_name = os.getenv("ALIGN_MODEL_NAME", "jonatasgrosman/wav2vec2-large-xlsr-53-english")
model_sel = {}
if os.getenv("ALIGN_MODEL_NAME"):
    model_sel["model_name"] = os.getenv("ALIGN_MODEL_NAME")
model, model_metadata = whisperx.alignment.load_align_model(os.getenv("ALIGN_MODEL", "en"), device = device, **model_sel)
print("=== ALIGNMENT MODEL LOADED ===")
print(model, model_metadata)

def align(task: AlignmentTask, input_path: str):
    print("aligning")
    audio = whisperx.audio.load_audio(input_path)
    transcript = task.get_alignable_segments()
    # old: replace input_path with audio
    alignment = whisperx.alignment.align(transcript, model, model_metadata, audio, device, print_progress=True, return_char_alignments=True)
    return alignment