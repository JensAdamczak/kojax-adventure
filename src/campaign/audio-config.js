import { hazardContactDelay } from "./motion-timing.js";
// Fixed ambience/effects mix, including the rescue theme.
export const audioMix = { ambience: 0.4, effects: 0.8 };
// Match peak 400 ms K-weighted loudness to the approved jump (-28.6 LUFS).
// Measured offline: no real-time analysis or changes to the recordings/timing.
export const footstepGainDb = {
  "cell-water": 3.4,
  "cell-sand": -1.6,
  "cell-grass": 3.0,
  "cell-rubble": -3.4,
  "cell-snow": -1.2,
};
export const soundGain = (name) =>
  name === "rescue-theme" ? 0.65 : 10 ** ((footstepGainDb[name] || 0) / 20);

export const audioBiomes = {
  water: { surface: "water", obstacle: null },
  beach: { surface: "sand", obstacle: "driftwood" },
  jungle: { surface: "grass", obstacle: "palm" },
  lava: { surface: "rubble", obstacle: "rock" },
  snow: { surface: "snow", obstacle: "ice" },
};
export const rescueDurationMs = 10800;
export const rescueSounds = ["torch-ignite", "balloon-burner", "rescue-theme"];
export const commonSounds = ["jump", "push-effort", "level-complete"];
export const audioFiles = [
  ...Object.keys(audioBiomes).flatMap((b) => [
    `${b}-ambience.wav`,
    `hazard-${b}.wav`,
  ]),
  ...Object.values(audioBiomes).map((b) => `cell-${b.surface}.wav`),
  ...["driftwood", "palm", "rock", "ice"].map((b) => `topple-${b}.wav`),
  ...rescueSounds.map((s) => `${s}.wav`),
  ...commonSounds.map((s) => `${s}.wav`),
  "CREDITS.txt",
];
// One contact cue per entered safe cell. Failed moves never produce footsteps.
export function actionSounds(result, biome, duration = 0, landDelay = 0) {
  const spec = audioBiomes[biome];
  if (!spec) return [];
  const cues = [];
  if (result.jumped || result.type === "jump") cues.push(["jump", 0]);
  if (result.type === "fall")
    return [
      ...cues,
      [`hazard-${biome}`, hazardContactDelay(duration, landDelay)],
    ];
  if (["object", "rooted"].includes(result.type)) return [["push-effort", 0]];
  if (result.type === "bridge" && spec.obstacle)
    cues.push([`topple-${spec.obstacle}`, 0]);
  if (["step", "jump", "bridge", "win"].includes(result.type)) {
    cues.push([
      `cell-${spec.surface}`,
      // The rubble recording peaks 20 ms after onset: align that peak with arrival.
      biome === "lava"
        ? Math.max(0, duration - 20)
        : result.jumped || result.type === "jump"
          ? duration
          : duration * 0.7,
    ]);
    if (result.type === "win") cues.push(["level-complete", duration + 80]);
  }
  return cues;
}
