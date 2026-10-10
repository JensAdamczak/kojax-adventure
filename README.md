# Kojax Adventure

A browser puzzle adventure through ten felt-and-wool landscapes. Guide Kojax—a jaguar with a koala head—across hidden hazards, turn fallen objects into bridges, and reach the mountain beacon for a balloon rescue.

## Play locally

Install Node.js 22+ and Python 3, then run from this repository:

```sh
npm ci
npm start
```

Open http://127.0.0.1:4173/. The preview builds the game and serves it on your computer only.

## Controls

- **Walk:** WASD or arrow keys; on touch, tap an adjacent cell.
- **Push:** press toward an adjacent object twice, or tap it twice. No timing limit. R then a direction also works.
- **Jump:** from level 4, hold Space and press a direction, or press J then a direction. On touch, tap a landing two cells away.
- Hazards return Kojax to the entrance and restore the objects. Retries are unlimited.
- Mute, help, restart, and fullscreen controls sit in the scenery border.

Progress and scores are stored in your browser. A practice link such as `campaign/?level=5` leaves campaign progress untouched.

## Sound

Each environment has ambience and surface sounds, with effects for hazards, jumps, and obstacles. The balloon rescue plays the Kojax theme. Sound starts after interaction; the speaker button toggles mute for the session. See [AUDIO.md](AUDIO.md) to adjust the mix or replace clips.

## Development

The game uses Canvas 2D and native JavaScript with no runtime framework or backend. See [CONTRIBUTING.md](CONTRIBUTING.md) for the source layout, editing text, and verification commands.

## GitHub Pages

In your repository, select **Settings → Pages → Source → GitHub Actions**, then run **Actions → Deploy Kojax Adventure → Run workflow** on `main`.

The workflow tests and builds the game, validates the release, and publishes only the generated `dist/` folder. Pushing source runs CI but does not automatically publish. No deployment secrets are required. Project subpaths are supported, so forks can use their own repository names.

## License

Code, documentation, and original artwork and audio are [MIT licensed](LICENSE). Retain the copyright and license notice when reusing them. Separately identified third-party materials retain their own terms; see [ASSET-RIGHTS.md](ASSET-RIGHTS.md).
