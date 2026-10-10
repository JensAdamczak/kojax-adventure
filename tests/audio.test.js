import test from "node:test";
import assert from "node:assert/strict";
import { actionSounds, audioBiomes } from "../src/campaign/audio-config.js";
import { GameAudio } from "../src/campaign/audio.js";

test("one surface cue per safe cell, and no surface cue on hazards/failed moves", () => {
  for (const [biome, { surface, obstacle }] of Object.entries(audioBiomes)) {
    assert.deepEqual(actionSounds({ type: "step" }, biome, 250), [
      [`cell-${surface}`, biome === "lava" ? 230 : 175],
    ]);
    assert.deepEqual(
      actionSounds({ type: "fall", jumped: true }, biome, 1700, 520),
      [
        ["jump", 0],
        [`hazard-${biome}`, 520],
      ],
    );
    assert.deepEqual(actionSounds({ type: "fall" }, biome, 1550), [
      [`hazard-${biome}`, 341],
    ]);
    for (const type of ["edge", "blocked", "busy", "no-jump"])
      assert.deepEqual(actionSounds({ type }, biome), []);
    assert.deepEqual(actionSounds({ type: "object" }, biome), [
      ["push-effort", 0],
    ]);
    assert.deepEqual(actionSounds({ type: "win", jumped: true }, biome, 520), [
      ["jump", 0],
      [`cell-${surface}`, biome === "lava" ? 500 : 520],
      ["level-complete", 600],
    ]);
    if (obstacle)
      assert.deepEqual(actionSounds({ type: "bridge" }, biome, 900), [
        [`topple-${obstacle}`, 0],
        [`cell-${surface}`, biome === "lava" ? 880 : 630],
      ]);
  }
});
function harness(fetcher) {
  const sources = [],
    requests = [];
  const context = {
    state: "suspended",
    currentTime: 0,
    destination: {},
    resume: async () => {
      context.state = "running";
    },
    suspend: async () => {
      context.state = "suspended";
    },
    createGain: () => ({
      gain: {
        setValueAtTime() {},
        linearRampToValueAtTime() {},
        setTargetAtTime() {},
      },
      connect() {},
      disconnect() {},
    }),
    decodeAudioData: async (data) => data,
    createBufferSource: () => {
      const s = {
        connect() {},
        disconnect() {},
        start(t) {
          s.started = t ?? 0;
        },
        stop() {
          s.stopped = true;
        },
      };
      sources.push(s);
      return s;
    },
  };
  const audio = new GameAudio({
    createContext: () => context,
    storage: () => ({ getItem: () => null, setItem() {} }),
    fetcher: async (url, options) => {
      requests.push(String(url));
      return fetcher
        ? fetcher(url, options)
        : { ok: true, arrayBuffer: async () => new ArrayBuffer(8) };
    },
  });
  return { audio, context, sources, requests };
}
const settle = () => new Promise((r) => setTimeout(r, 15));
test("no autoplay or fetch before gesture; same biome and repeated unlock do not duplicate ambience", async () => {
  const { audio, sources, requests } = harness();
  audio.setBiome("water");
  assert.equal(requests.length, 0);
  audio.unlock();
  await settle();
  assert.equal(sources.filter((s) => s.loop).length, 1);
  audio.unlock();
  audio.setBiome("water");
  await settle();
  assert.equal(sources.filter((s) => s.loop).length, 1);
  assert.ok(requests.every((r) => r.includes("/campaign/audio/")));
  audio.action({ type: "step" }, 250, 0);
  assert.equal(sources.at(-1).started, 0.175);
  audio.setHidden(true);
  assert.ok(sources.every((s) => s.stopped));
  audio.setHidden(false);
  await settle();
  assert.equal(sources.filter((s) => s.loop && !s.stopped).length, 1);
  audio.setSettings({ muted: true });
  assert.ok(sources.every((s) => s.stopped));
  const n = sources.length;
  audio.action({ type: "win" }, 250, 0);
  assert.equal(sources.length, n);
});
test("missing or rejected audio never rejects unlock or schedules a late effect", async () => {
  const { audio, sources } = harness(async () => {
    throw Error("offline");
  });
  audio.setBiome("jungle");
  audio.unlock();
  audio.action({ type: "step" }, 250);
  await settle();
  assert.equal(sources.length, 0);
});
test("changing biome during loading does not start or retain stale ambience", async () => {
  let resolveWater;
  const { audio, sources } = harness(async (url) => ({
    ok: true,
    arrayBuffer: () =>
      String(url).includes("water-ambience")
        ? new Promise((r) => (resolveWater = r))
        : Promise.resolve(new ArrayBuffer(8)),
  }));
  audio.setBiome("water");
  audio.unlock();
  await settle();
  audio.setBiome("snow");
  await settle();
  resolveWater(new ArrayBuffer(8));
  await settle();
  assert.equal(sources.filter((s) => s.loop && !s.stopped).length, 1);
  assert.equal(audio.buffers.has("water-ambience"), false);
  assert.equal(audio.buffers.has("snow-ambience"), true);
});
test("blocked audio context and storage cannot prevent construction/interaction", () => {
  const audio = new GameAudio({
    createContext: () => {
      throw Error("unsupported");
    },
    storage: () => {
      throw Error("private storage");
    },
  });
  assert.doesNotThrow(() => {
    audio.setBiome("water");
    audio.unlock();
    audio.setSettings({ muted: false, effects: 7 });
    audio.action({ type: "step" }, 250);
    audio.setHidden(true);
  });
  assert.equal(audio.settings.effects, 1);
});

test("rescue cues follow the animation and cancel on mute", async () => {
  const { audio, sources, requests } = harness();
  audio.setBiome("snow");
  audio.unlock();
  await settle();
  assert.ok(requests.some((r) => r.endsWith("torch-ignite.wav")));
  audio.rescue();
  assert.deepEqual(
    sources.filter((s) => !s.loop).map((s) => s.started),
    [0, 0, 1.8, 7.4],
  );
  audio.setSettings({ muted: true });
  assert.ok(sources.every((s) => s.stopped));
});

test("former saved mute settings cannot silently disable a game without audio controls", () => {
  const audio = new GameAudio({
    storage: () => ({
      getItem: () => JSON.stringify({ muted: true, effects: 0, ambience: 0 }),
    }),
  });
  assert.deepEqual(audio.settings, {
    muted: false,
    effects: 0.8,
    ambience: 0.4,
  });
});

test("hazard audio meets the animated contact, including jumps and reduced motion", async () => {
  const { fallPose } = await import("../src/campaign/view.js");
  for (const [duration, landDelay] of [
    [1550, 0],
    [1729, 520],
    [120, 0],
    [120, 40],
  ]) {
    const cue = actionSounds(
      { type: "fall", jumped: !!landDelay },
      "jungle",
      duration,
      landDelay,
    ).at(-1);
    const motion = { start: 0, duration, landDelay, from: [0, 0], to: [1, 0] };
    const before = fallPose(motion, cue[1] - 1, 100, "jungle");
    const after = fallPose(motion, cue[1] + 1, 100, "jungle");
    assert.ok(before.pos[0] < 1);
    assert.deepEqual(after.pos, [1, 0]);
    assert.ok(after.sink > 0);
  }
});

test("airborne replay plays theme without relighting the torch", async () => {
  const { audio, sources, requests } = harness();
  audio.setBiome("snow");
  audio.unlock();
  await settle();
  const cues = [];
  audio.effect = (...args) => cues.push(args);
  audio.rescue(false, true);
  assert.deepEqual(cues, [["rescue-theme"], ["balloon-burner", 1800]]);
});

test("playback session is requested before context creation/resume during the gesture", async () => {
  const events = [];
  let type = "auto";
  const session = {
    get type() {
      return type;
    },
    set type(value) {
      type = value;
      events.push(value);
    },
  };
  const { audio, context, sources } = harness();
  audio.getAudioSession = () => session;
  audio.createContext = () => {
    events.push("create");
    return context;
  };
  const resume = context.resume;
  context.resume = () => {
    events.push("resume");
    return resume();
  };
  audio.setBiome("water");
  assert.deepEqual(events, []);
  audio.unlock();
  assert.deepEqual(events, ["playback", "create", "resume"]);
  await settle();
  assert.equal(sources.filter((s) => s.loop).length, 1);
  audio.setSettings({ muted: true });
  events.length = 0;
  audio.unlock();
  assert.deepEqual(events, []);
  audio.setSettings({ muted: false });
  await settle();
  assert.equal(sources.filter((s) => s.loop && !s.stopped).length, 1);
});

test("missing or rejecting Audio Session API still allows normal playback", async () => {
  for (const getAudioSession of [
    () => undefined,
    () => {
      throw Error("unavailable");
    },
    () => ({
      get type() {
        return "auto";
      },
      set type(value) {
        throw Error("unsupported");
      },
    }),
  ]) {
    const { audio, context, sources } = harness();
    audio.getAudioSession = getAudioSession;
    audio.setBiome("snow");
    audio.unlock();
    await settle();
    assert.equal(context.state, "running");
    assert.equal(sources.filter((s) => s.loop).length, 1);
  }
});
