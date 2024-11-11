# Jellysing
just another karaoke app, but with a tad bit of machine learning, currently work in progress.

## Features
* semiautomated song to karaoke data conversion
* video background support

## Notes
* The jsz file creation flow is not optimized for mobile yet and especially not bandwidth efficient. Thus I recommend against opening it on a mobile device.

## Bugs?
* Try opening a new guest tab, for some reason there's some very persistent bug that I haven't figured out yet. Update: [this funnily occurs when you are low on disk space](https://github.com/gildas-lormeau/zip.js/issues/442)??? 
* background videos do not work on ios, will fix when I figure out how to log errors from there.
* older browsers may not work as well, some new apis are used.
* background videos may desync if you switch tabs due to browser's being lazy. Auto resyncing of videos is not implemented yet, but if you seek 5 secs forward and then back, it'll force the vide to resync.