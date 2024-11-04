# setup
`.env` example
```
SEP_MODEL=UVR-MDX-NET-Inst_HQ_3.onnx
# can also override wav2vec model here
```

# requirements
* torch capable gpu (so nvidia likely), with at least 6gb of vram, I test with 8gb of vram so I'm not sure if 6gb will OOM or not.
* this is not a hard requirement, everything can run on cpu, in fact I've accidentally done so, but it's annoyingly slow.