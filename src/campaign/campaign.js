import { rescueDurationMs } from "./audio-config.js";
import { text, levelText } from "./text.js";
import { escapeHTML, formatText } from "./text-format.js";
import { journeyScore, restartedCrossing } from "./score.js";
import {
  assetURL,
  loadBitmap,
  loadJSON,
  sceneKey,
  scenePath,
} from "./assets.js";
import { levels, key, biomeNames } from "./levels.js";
import {
  createState,
  move,
  directions,
  standing,
  parseProgress,
} from "./engine.js";
import { CampaignView } from "./view.js";
import { MovementInput } from "./input.js";
import { bindFullscreen } from "./fullscreen.js";
import { GameAudio } from "./audio.js";
const audio = new GameAudio();
// DOM references and persistent campaign state.
const $ = (id) => document.getElementById(id);
const dialog = $("dialog");
const storageKey = "kojax-felt-campaign-v2";
const assets = {};
const marks = new Map();
const requested = Number(new URLSearchParams(location.search).get("level"));
const practice =
  Number.isInteger(requested) && requested >= 1 && requested <= 10;
let progress = { results: [] };
let storageAvailable = true;
try {
  progress = parseProgress(localStorage.getItem(storageKey));
} catch {
  storageAvailable = false;
}
let index = practice ? requested - 1 : Math.min(progress.results.length, 9);
let level = levels[index];
let state = createState(level);
let view;
let busy = true;
let mode = null;
let spaceHeld = false;
let epoch = 0; // Invalidates animation callbacks when a crossing restarts.
let finished = false;
let boardLabel;
let cellLabels;
const say = (text) => ($("status").textContent = text);
const controls = new MovementInput({
  read: () => ({
    blocked: dialog.open || state.won || view?.motion?.type === "fall",
    busy,
    canQueue:
      !!view?.motion && ["step", "jump", "bridge"].includes(view.motion.type),
    objectKey: (dir) => {
      const d = directions[dir],
        p = state.pos.map((v, i) => v + d[i]);
      return standing(level, state, p) ? key(p) : null;
    },
  }),
  execute: (dir, kind) => {
    mode = kind === "jump" ? "jump" : kind === "push" ? "run" : null;
    return perform(dir, kind !== "walk");
  },
});
function cancelPending() {
  controls.clear();
  spaceHeld = false;
}
function display(html) {
  cancelPending();
  mode = null;
  $("dialogContent").innerHTML = html;
  if (!dialog.open) dialog.showModal();
}
function play() {
  audio.unlock();
  dialog.close();
  $("cells").focus({
    preventScroll: true,
  });
}
function save() {
  if (practice) return;
  try {
    localStorage.setItem(
      storageKey,
      JSON.stringify({
        version: 1,
        results: progress.results,
      }),
    );
    storageAvailable = true;
  } catch {
    storageAvailable = false;
  }
}
const score = () => journeyScore(progress.results, index, state, practice);
function refresh() {
  const total = score();
  const focus = document.activeElement?.dataset.cell;
  $("attempts").textContent = total.attempts;
  $("steps").textContent = total.steps;
  $("cells").setAttribute(
    "aria-label",
    formatText(text.accessibility.board, {
      level: level.name,
      size: level.size,
    }),
  );
  $("cells").innerHTML = "";
  for (let y = 0; y < level.size; y++)
    for (let x = 0; x < level.size; x++) {
      const p = [x, y],
        k = key(p),
        b = document.createElement("button");
      b.className = "cell";
      b.dataset.cell = k;
      let label = formatText(text.accessibility.cell, {
        row: y + 1,
        column: x + 1,
      });
      if (k === key(state.pos)) {
        label += ", " + text.accessibility.character;
        b.setAttribute("aria-current", "location");
      }
      if (standing(level, state, p)) label += ", " + level.prop;
      if (k === key(level.start)) label += ", " + text.accessibility.entrance;
      if (k === key(level.end)) label += ", " + text.accessibility.exit;
      b.setAttribute("aria-label", label);
      b.onclick = (e) => tap(p, e.detail > 1);
      $("cells").append(b);
    }
  if (focus)
    $("cells").querySelector(`[data-cell="${focus}"]`)?.focus({
      preventScroll: true,
    });
}
const lesson = () => levelText[index + 1].lesson;
// Level intro and menus. Wording is edited in text.js, not in these templates.
function introduction() {
  display(`<img class="dialog-art" src="${assetURL(scenePath(sceneKey(level)))}" alt="${escapeHTML(formatText(text.accessibility.scene, { biome: biomeNames[level.biome] }))}">
    <div class="dialog-body">
    <span class="eyebrow">${escapeHTML(practice ? text.intro.practice : text.app.eyebrow)}</span>
    <h1>${escapeHTML(level.name)}</h1>
    <p>${escapeHTML(level.story)}</p>
    <p>${escapeHTML(lesson())}</p>${!storageAvailable ? `<p>${escapeHTML(text.intro.savingUnavailable)}</p>` : ""}<button class="primary" id="play">${escapeHTML(index === 0 ? text.buttons.begin : text.buttons.enter)} →</button>${
      !practice && index > 0
        ? `<br>
    <button class="secondary" id="newJourney">${escapeHTML(text.buttons.newJourney)}</button>`
        : ""
    }</div>`);
  $("play").onclick = play;
  if ($("newJourney")) $("newJourney").onclick = () => confirmNew();
}
function help() {
  display(`<div class="dialog-body">
    <span class="eyebrow">${escapeHTML(level.name)}</span>
    <h2>${escapeHTML(text.help.title)}</h2>
    <ul>
    <li>${escapeHTML(text.help.walk)}</li>
    <li>${escapeHTML(text.help.push)}</li>
    <li>${escapeHTML(level.jump ? text.help.jump : text.help.jumpLocked)}</li>
    <li>${escapeHTML(text.help.shortcuts)}</li>
    <li>${escapeHTML(text.help.hazards)}</li>
    </ul>
    <button id="play" class="primary">${escapeHTML(text.buttons.back)}</button>
    </div>`);
  $("play").onclick = play;
}
const stations = [
  [0.15, 0.82],
  [0.3, 0.8],
  [0.42, 0.74],
  [0.46, 0.69],
  [0.62, 0.64],
  [0.7, 0.49],
  [0.5, 0.41],
  [0.33, 0.28],
  [0.46, 0.18],
  [0.56, 0.1],
];
function mapMarkup(count) {
  const points = stations.slice(0, count);
  return `<div class="journey-map">
    <img src="assets/map.webp" alt="${escapeHTML(text.accessibility.map)}">
    <svg viewBox="0 0 100 100" role="img" aria-label="${escapeHTML(formatText(text.accessibility.stations, { count, level: levels[count - 1].name }))}">${points.length > 1 ? `<polyline points="${points.map((p) => p.map((v) => v * 100).join(",")).join(" ")}" fill="none" stroke="#fff0c3" stroke-width="1" stroke-linecap="round" stroke-dasharray=".5 2"/>` : ""}${points
      .map(
        (
          p,
          i,
        ) => `<circle cx="${p[0] * 100}" cy="${p[1] * 100}" r="${i === points.length - 1 ? 2.1 : 1.3}" fill="${i === points.length - 1 ? "#edb858" : "#fff0c3"}" stroke="#405747" stroke-width=".5">
    <title>${escapeHTML(formatText(text.accessibility.completed, { level: levels[i].name }))}</title>
    </circle>`,
      )
      .join("")}</svg>
    <img class="map-kojax" src="../assets/kojax.png" alt="${escapeHTML(text.accessibility.character)}" style="left:${points.at(-1)[0] * 100}%;top:${points.at(-1)[1] * 100}%">
    </div>`;
}
function completion() {
  const count = index + 1,
    total = score();
  display(`${practice ? "" : mapMarkup(count)}<div class="dialog-body">
    <span class="eyebrow">${escapeHTML(practice ? text.progress.practice : text.progress.eyebrow)}</span>
    <h2>${escapeHTML(formatText(text.progress.crossed, { level: level.name }))}</h2>
    <div class="results">
    <div>
    <b>${total.attempts}</b>
    <small>${escapeHTML(practice ? text.progress.practiceAttempts : text.progress.totalAttempts)}</small>
    </div>
    <div>
    <b>${total.steps}</b>
    <small>${escapeHTML(practice ? text.progress.practiceSteps : text.progress.totalSteps)}</small>
    </div>
    </div>${!storageAvailable ? `<p>${escapeHTML(text.progress.savingFailed)}</p>` : ""}<button class="primary" id="next">${escapeHTML(text.buttons.next)}</button>
    </div>`);
  $("next").onclick = () => {
    dialog.close();
    start(index + 1);
  };
}
let rescueRun = 0;
function beginRescue(replay = false) {
  const run = ++rescueRun,
    currentEpoch = epoch;
  busy = true;
  view.rescueStart = performance.now() - (replay ? 10000 : 0);
  audio.rescue(view.reduced, replay);
  setTimeout(() => {
    if (currentEpoch === epoch && run === rescueRun) {
      busy = false;
      ending();
    }
  }, rescueDurationMs);
}
function ending() {
  finished = true;
  const results = practice
    ? [
        {
          attempts: state.attempts,
          steps: state.steps,
        },
      ]
    : progress.results;
  display(`${practice ? "" : mapMarkup(10)}<div class="dialog-body">
    <span class="eyebrow">${escapeHTML(text.ending.eyebrow)}</span>
    <h1>${escapeHTML(text.ending.title)}</h1>
    <p>${escapeHTML(text.ending.description)}</p>
    <div class="results">
    <div>
    <b>${results.reduce((a, r) => a + r.attempts, 0)}</b>
    <small>${escapeHTML(practice ? text.ending.practiceAttempts : text.ending.attempts)}</small>
    </div>
    <div>
    <b>${results.reduce((a, r) => a + r.steps, 0)}</b>
    <small>${escapeHTML(text.ending.steps)}</small>
    </div>
    </div>
    <button class="primary" id="watch">${escapeHTML(text.buttons.watch)}</button>
    <br>
    <button class="secondary" id="newJourney">${escapeHTML(text.buttons.newAdventure)}</button>
    </div>`);
  $("watch").onclick = () => {
    play();
    beginRescue(true);
  };
  $("newJourney").onclick = () => confirmNew();
}
function confirmNew(
  back = () =>
    finished ? ending() : state.won ? completion() : introduction(),
) {
  display(`<div class="dialog-body">
    <h2>${escapeHTML(text.restart.confirmTitle)}</h2>
    <p>${escapeHTML(text.restart.confirmDescription)}</p>
    <button class="primary" id="yes">${escapeHTML(text.buttons.startAgain)}</button>
    <br>
    <button class="secondary" id="no">${escapeHTML(text.buttons.keepJourney)}</button>
    </div>`);
  $("yes").onclick = () => {
    if (practice) {
      try {
        localStorage.removeItem(storageKey);
      } catch {}
      location.href = "./";
      return;
    }
    progress = {
      results: [],
    };
    save();
    dialog.close();
    start(0);
  };
  $("no").onclick = back;
}
// Movement and animation scheduling. Preserve durations and input behavior.
function perform(dir, special = false) {
  if (busy || dialog.open || state.won)
    return {
      type: "busy",
    };
  const from = [...state.pos],
    d = directions[dir],
    near = from.map((v, i) => v + d[i]),
    object = standing(level, state, near);
  if (mode === "run" && !object) {
    mode = null;
    return {
      type: "no-object",
    };
  }
  if (mode === "jump" && object) {
    mode = null;
    return {
      type: "blocked",
    };
  }
  mode = null;
  view.facing = dir;
  const result = move(level, state, dir, special);
  if (["object", "rooted"].includes(result.type)) audio.action(result, 0, 0);
  const active = ["step", "jump", "bridge", "rooted", "fall", "win"].includes(
    result.type,
  );
  if (active) {
    busy = true;
    const e = epoch,
      target = result.at || near,
      duration = view.animate(
        from,
        target,
        dir,
        result.type === "win" && result.jumped ? "jump" : result.type,
        result.fallen,
        result.jumped,
      );
    if (result.type !== "rooted")
      audio.action(result, duration, view.motion.landDelay || 0);
    if (result.type === "fall") {
      controls.clear();
      marks.set(key(target), {
        type: "fall",
        time: performance.now() + (view.motion.landDelay || 0),
      });
    }
    setTimeout(
      () => {
        if (e !== epoch) return;
        busy = false;
        if (["step", "jump", "bridge", "win"].includes(result.type))
          marks.set(key(target), {
            type: "step",
            dir,
            time: performance.now(),
          });
        if (result.type === "win") {
          if (!practice) {
            progress.results[index] = {
              attempts: state.attempts,
              steps: state.steps,
            };
            save();
          }
          if (index === 9) {
            beginRescue();
          } else completion();
        } else if (!dialog.open) controls.drain();
      },
      duration + (result.type === "step" ? 35 : 0),
    );
  }
  const messages = text.status;
  say(messages[result.type] || text.status.success);
  refresh();
  return result;
}
// Keyboard and touch controls.
function input(dir) {
  audio.unlock();
  const kind =
    mode === "run" ? "push" : mode === "jump" || spaceHeld ? "jump" : "walk";
  mode = null;
  controls.direction(dir, kind);
}
function tap(p) {
  audio.unlock();
  if (dialog.open || state.won || view?.motion?.type === "fall") return;
  const dx = p[0] - state.pos[0],
    dy = p[1] - state.pos[1],
    distance = Math.abs(dx) + Math.abs(dy),
    dir = dx > 0 ? "right" : dx < 0 ? "left" : dy > 0 ? "down" : "up";
  if (distance === 1) controls.direction(dir);
  else if (distance === 2 && (!dx || !dy)) controls.direction(dir, "jump");
  else say(text.status.chooseCell);
}
document.addEventListener("keydown", (e) => {
  if (e.target?.matches?.("input, select, textarea")) return;
  if (dialog.open || !view) return;
  const k = e.key.length === 1 ? e.key.toLowerCase() : e.key,
    dir = {
      ArrowUp: "up",
      ArrowRight: "right",
      ArrowDown: "down",
      ArrowLeft: "left",
      w: "up",
      d: "right",
      s: "down",
      a: "left",
    }[k];
  if (k === " ") {
    e.preventDefault();
    spaceHeld = true;
  } else if (dir) {
    e.preventDefault();
    if (!e.repeat) input(dir);
  } else if (k === "r" || k === "j") {
    if (!state.won && !e.repeat) {
      mode = k === "r" ? "run" : "jump";
      say(mode === "run" ? text.status.choosePush : text.status.chooseJump);
    }
  } else if (k === "Escape") {
    cancelPending();
    mode = null;
  }
});
document.addEventListener("keyup", (e) => {
  if (e.key === " ") {
    spaceHeld = false;
    if (!dialog.open) e.preventDefault();
  }
});
window.addEventListener("blur", () => {
  cancelPending();
  mode = null;
});
document.addEventListener("visibilitychange", () => {
  audio.setHidden(document.hidden);
  if (document.hidden) {
    cancelPending();
    mode = null;
  }
});
dialog.addEventListener("cancel", (e) => {
  if (state.won) e.preventDefault();
});
// Restart dialogs preserve the current journey until confirmed.
function restartMenu() {
  if (busy) return;
  if (finished) {
    confirmNew();
    return;
  }
  display(`<button class="dialog-close" id="closeRestart" aria-label="${escapeHTML(text.buttons.closeRestart)}">×</button>
    <div class="dialog-body">
    <h2>${escapeHTML(text.restart.title)}</h2>
    <p>${escapeHTML(text.restart.description)}</p>
    <button class="primary" id="restartCrossing">${escapeHTML(text.buttons.restartCrossing)}</button>
    <br>
    <button class="secondary" id="restartGame">${escapeHTML(text.buttons.restartGame)}</button>
    </div>`);
  $("closeRestart").onclick = play;
  $("restartCrossing").onclick = () => {
    dialog.close();
    epoch++;
    audio.cancelActions();
    cancelPending();
    state = restartedCrossing(level, state);
    marks.clear();
    view.reset();
    busy = false;
    refresh();
  };
  $("restartGame").onclick = () => confirmNew(restartMenu);
}
$("help").onclick = () =>
  finished ? ending() : state.won ? completion() : help();
$("reset").onclick = restartMenu;
function refreshSound() {
  const label = audio.settings.muted ? text.audio.unmute : text.audio.mute;
  $("sound").setAttribute("aria-label", label);
  $("sound").title = label;
  $("sound").setAttribute("aria-pressed", String(audio.settings.muted));
}
$("sound").onclick = () => {
  audio.setSettings({ muted: !audio.settings.muted });
  refreshSound();
};
refreshSound();
bindFullscreen($("fullscreen"), document, () => {
  display(`<div class="dialog-body">
    <h2>${escapeHTML(text.errors.fullscreenTitle)}</h2>
    <p>${escapeHTML(text.errors.fullscreenDescription)}</p>
    <button class="primary" id="play">${escapeHTML(text.buttons.back)}</button>
    </div>`);
  $("play").onclick = play;
});
const imageJobs = new Map();
// Assets are cached once per session; only the current scene is loaded on entry.
function loadImage(name, path) {
  if (assets[name]) return Promise.resolve();
  if (imageJobs.has(name)) return imageJobs.get(name);
  path ??= [
    "water",
    "water-boat",
    "water-lagoon",
    "beach",
    "jungle",
    "lava",
    "snow",
  ].includes(name)
    ? scenePath(name)
    : `assets/${name}.webp`;
  const job = loadBitmap(assetURL(path))
    .then((image) => {
      assets[name] = image;
    })
    .catch((error) => {
      imageJobs.delete(name);
      throw error;
    });
  imageJobs.set(name, job);
  return job;
}
async function start(n) {
  epoch++;
  audio.cancelActions();
  cancelPending();
  busy = true;
  finished = false;
  index = n;
  level = levels[n];
  audio.setBiome(level.biome);
  // Labels depend on the crossing, not on movement; format them only once.
  boardLabel = formatText(text.accessibility.board, {
    level: level.name,
    size: level.size,
  });
  cellLabels = Array.from({ length: level.size }, (_, y) =>
    Array.from({ length: level.size }, (_, x) =>
      formatText(text.accessibility.cell, { row: y + 1, column: x + 1 }),
    ),
  );
  state = createState(level);
  marks.clear();
  $("loading").hidden = false;
  try {
    await Promise.all([
      loadImage(sceneKey(level)),
      ...(level.prop
        ? [
            loadImage(level.prop + "-standing"),
            loadImage(level.prop + "-fallen"),
          ]
        : []),
    ]);
    if (!view)
      view = new CampaignView(
        $("scene"),
        $("cells"),
        assets,
        () => ({
          level,
          state,
          marks,
          prepared: controls.objectPress,
          total: score(),
          scoreText: {
            ...text.rescueScore,
            title: practice
              ? text.rescueScore.practice
              : text.rescueScore.title,
          },
        }),
        $("rescueScore"),
      );
    else view.reset();
    refresh();
    $("loading").hidden = true;
    busy = false;
    introduction();
  } catch (error) {
    loadError(error);
  }
}
function loadError(error) {
  $("loading").innerHTML = `<p>${escapeHTML(text.errors.assetTitle)}</p>
    <small>${escapeHTML(text.errors.assetDescription)}</small>
    <button class="primary" id="retry">${escapeHTML(text.buttons.reload)}</button>`;
  $("retry").onclick = () => location.reload();
  console.error(error);
}
async function load() {
  try {
    await Promise.all(
      [
        "terrain",
        "map",
        "torch",
        "torch-lit",
        "balloon-teal",
        "balloon-coral",
        "rescuer",
      ]
        .map((n) => loadImage(n))
        .concat(loadImage("walk", "assets/walk.webp")),
    );
    assets.frames = await loadJSON("assets/frames.json");
    await start(index);
    if (!practice && progress.results.length === 10 && view) {
      Object.assign(state, progress.results[9]);
      state.won = true;
      state.pos = [...level.end];
      view.rescueStart = performance.now() - 6000;
      refresh();
      ending();
    }
    registerTools();
  } catch (error) {
    loadError(error);
  }
}
// Optional browser testing interface.
function registerTools() {
  if (!document.modelContext?.registerTool) return;
  const read = () => ({
    level: index + 1,
    name: level.name,
    position: state.pos,
    attempts: state.attempts,
    steps: state.steps,
    busy,
    dialogOpen: dialog.open,
    won: state.won,
    bridges: state.fallen.length,
  });
  for (const tool of [
    {
      name: "read_kojax_campaign",
      description:
        "Read current campaign status without revealing safe ground.",
      inputSchema: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
      annotations: {
        readOnlyHint: true,
      },
      execute: read,
    },
    {
      name: "move_kojax_campaign",
      description:
        "Move Kojax one direction; special pushes an object or jumps. Returns after the move animation, unless the summit rescue is still playing.",
      inputSchema: {
        type: "object",
        properties: {
          direction: {
            type: "string",
            enum: Object.keys(directions),
          },
          special: {
            type: "boolean",
          },
        },
        required: ["direction"],
        additionalProperties: false,
      },
      execute: async (arg) => {
        if (!arg || !Object.hasOwn(directions, arg.direction))
          throw Error("Invalid direction");
        const r = perform(arg.direction, arg.special === true);
        if (view.motion)
          await new Promise((resolve) =>
            setTimeout(resolve, view.motion.duration + 30),
          );
        return {
          ...read(),
          result: r.type,
        };
      },
    },
  ])
    try {
      Promise.resolve(document.modelContext.registerTool(tool)).catch(() => {});
    } catch {}
}
load();
