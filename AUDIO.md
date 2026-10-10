# Game audio

Audio runs in the browser through Web Audio; no server or external audio service is required. Playback starts after user interaction and failures leave the game playable.

## Edit the mix

- `src/campaign/audio-config.js`: ambience/effects levels, per-surface gain, environment-to-sound mapping, cue timing, and release asset list.
- `src/campaign/audio.js`: loading, playback, fades, mute, and rescue music.
- `src/campaign/motion-timing.js`: shared hazard contact timing for animation and sound.
- `public/campaign/audio/`: deployed clips and source credits.

The active environment's clips are loaded asynchronously and cached as decoded buffers. Footsteps play once per safe cell; hazards sound at the falling contact point. The speaker button mutes both ambience and effects for the current session. The rescue theme restarts when replaying the already-airborne balloon scene.

## Replace or add audio

Replace a WAV using the existing filename to preserve its cue mapping. Trim silence at the start for accurate timing, use gentle fades to prevent clicks, and avoid clipping. Ambience clips should loop seamlessly. Compare loudness in the game before adjusting gain: equal peak levels do not necessarily sound equally loud.

For a new filename, update `audio-config.js` and the playback mapping. The release check verifies all declared files. Keep source recordings, audition pages, and alternate takes outside the public assets folder. Document any third-party source and license in `public/campaign/audio/CREDITS.txt`; original project audio is MIT licensed.

Run `npm test`, `npm run build`, and `npm run check:release`, then test walking, falling, pushing, mute, and the finale through `npm start`. Test both a fresh load and a replay. Publishing still uses the manual GitHub Pages workflow.
