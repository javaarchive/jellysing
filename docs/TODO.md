* On screen info display.
* Custom fonts
* Better display of lyrics (just impl more stuff).
* Dockerfile for backend processing server.
* Try transcoding processed audio files from WAV to something smaller, like MP3 and OPUS (Webm container).
  * [ffmpeg in wasm](https://ffmpegwasm.netlify.app/)
  * there's some audio specific build of ffmpeg
* Allow playing vocals to specific audio device only (headphones likely).
* Investigate bug that persists in dev that cause ERR 200 (some cors thing even though cors is fine), but never shows up in a new guest tab. 