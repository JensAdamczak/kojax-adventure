import {
  audioBiomes,
  audioMix,
  soundGain,
  commonSounds,
  rescueSounds,
  actionSounds,
} from "./audio-config.js";

export class GameAudio {
  constructor({
    createContext = () =>
      new (globalThis.AudioContext || globalThis.webkitAudioContext)(),
    fetcher = (...args) => fetch(...args),
    getAudioSession = () => globalThis.navigator?.audioSession,
  } = {}) {
    Object.assign(this, { createContext, fetcher, getAudioSession });
    this.settings = { muted: false, ...audioMix };
    // Fixed volume mix; the HUD mute toggle lasts for this session.
    this.buffers = new Map();
    this.jobs = new Map();
    this.voices = new Set();
    this.hidden = false;
    this.biome = null;
    this.generation = 0;
  }
  // Called synchronously from a user gesture; audio never blocks entering/moving.
  unlock() {
    if (this.settings.muted || this.hidden) return;
    // iOS otherwise treats Web Audio as ambient sound and can silence it with
    // the phone's Silent Mode switch. Request media playback during the gesture.
    // The optional API must never prevent audio on browsers that lack/reject it.
    try {
      const session = this.getAudioSession();
      if (session && session.type !== "playback") session.type = "playback";
    } catch {}
    try {
      if (!this.context) {
        this.context = this.createContext();
        this.ambientGain = this.context.createGain();
        this.effectGain = this.context.createGain();
        this.ambientGain.connect(this.context.destination);
        this.effectGain.connect(this.context.destination);
        this.applyGains();
      }
      Promise.resolve(this.context.resume())
        .then(() => this.prepare())
        .catch(() => {});
    } catch {
      /* Unsupported/blocked audio leaves the game playable. */
    }
  }
  setBiome(biome) {
    if (!audioBiomes[biome] || biome === this.biome) return;
    this.generation++;
    this.biome = biome;
    this.cancelActions();
    this.stopAmbience();
    this.buffers.clear(); // Keep only the active environment decoded.
    this.prepare();
  }
  async load(name, generation) {
    if (this.buffers.has(name)) return this.buffers.get(name);
    const key = `${generation}:${name}`;
    if (!this.jobs.has(key)) {
      const job = (async () => {
        const response = await this.fetcher(
          new URL(`audio/${name}.wav`, import.meta.url),
          { signal: AbortSignal.timeout(15000) },
        );
        if (!response.ok) throw Error("Audio unavailable");
        const data = await response.arrayBuffer();
        const buffer = await this.context.decodeAudioData(data);
        if (generation === this.generation) this.buffers.set(name, buffer);
        return buffer;
      })()
        .catch(() => null)
        .finally(() => this.jobs.delete(key));
      this.jobs.set(key, job);
    }
    return this.jobs.get(key);
  }
  prepare() {
    if (!this.context || !this.biome || this.settings.muted || this.hidden)
      return;
    const generation = this.generation,
      biome = this.biome,
      spec = audioBiomes[biome];
    const names = [
      ...commonSounds,
      ...(biome === "snow" ? rescueSounds : []),
      `cell-${spec.surface}`,
      `hazard-${biome}`,
      ...(spec.obstacle ? [`topple-${spec.obstacle}`] : []),
    ];
    for (const name of names) void this.load(name, generation);
    void this.load(`${biome}-ambience`, generation)
      .then((buffer) => {
        if (
          buffer &&
          generation === this.generation &&
          !this.hidden &&
          !this.settings.muted &&
          !this.ambientSource &&
          this.context.state === "running"
        ) {
          const source = this.context.createBufferSource();
          source.buffer = buffer;
          source.loop = true;
          source.connect(this.ambientGain);
          this.ambientGain.gain.setValueAtTime(0, this.context.currentTime);
          this.ambientGain.gain.linearRampToValueAtTime(
            this.settings.ambience,
            this.context.currentTime + 0.4,
          );
          source.start();
          this.ambientSource = source;
        }
      })
      .catch(() => {});
  }
  effect(name, delay = 0, offset = 0) {
    if (
      !this.context ||
      this.context.state !== "running" ||
      this.hidden ||
      this.settings.muted ||
      !this.buffers.has(name)
    )
      return;
    // Do not defer missed effects until a file finishes loading.
    const step = name.startsWith("cell-");
    const peers = [...this.voices].filter((v) => !step || v.step);
    if (peers.length >= (step ? 2 : 8)) this.stopVoice(peers[0]);
    const source = this.context.createBufferSource(),
      gain = this.context.createGain();
    gain.gain.setValueAtTime(soundGain(name), this.context.currentTime);
    source.buffer = this.buffers.get(name);
    source.connect(gain);
    gain.connect(this.effectGain);
    const voice = { source, gain, step };
    this.voices.add(voice);
    source.onended = () => {
      this.voices.delete(voice);
      source.disconnect();
      gain.disconnect();
    };
    source.start(this.context.currentTime + Math.max(0, delay) / 1000, offset);
  }
  action(result, duration, landDelay) {
    for (const [name, delay] of actionSounds(
      result,
      this.biome,
      duration,
      landDelay,
    ))
      this.effect(name, delay);
  }
  rescue(reduced = false, replay = false) {
    this.cancelActions();
    const token = this.actionGeneration,
      started = performance.now();
    if (this.buffers.has("rescue-theme")) this.effect("rescue-theme");
    else if (this.context && !this.settings.muted && !this.hidden) {
      // On a freshly loaded replay, join at the current scene position once decoded.
      void this.load("rescue-theme", this.generation).then((buffer) => {
        const offset = (performance.now() - started) / 1000;
        if (
          buffer &&
          token === this.actionGeneration &&
          offset < buffer.duration
        )
          this.effect("rescue-theme", 0, offset);
      });
    }
    if (!replay) this.effect("torch-ignite");
    // Match the fleet approach and departure in CampaignView.rescue.
    this.effect("balloon-burner", reduced ? 250 : 1800);
    if (!reduced && !replay) this.effect("balloon-burner", 7400);
  }
  stopVoice(voice) {
    this.voices.delete(voice);
    try {
      voice.gain.gain.setTargetAtTime(0, this.context.currentTime, 0.012);
      voice.source.stop(this.context.currentTime + 0.05);
    } catch {}
  }
  cancelActions() {
    this.actionGeneration = (this.actionGeneration || 0) + 1;
    for (const voice of [...this.voices]) this.stopVoice(voice);
  }
  stopAmbience() {
    if (this.ambientSource) {
      try {
        this.ambientSource.stop();
        this.ambientSource.disconnect();
      } catch {}
      this.ambientSource = null;
    }
  }
  applyGains() {
    if (!this.context) return;
    const quiet = this.settings.muted || this.hidden;
    for (const [node, value] of [
      [this.ambientGain, this.settings.ambience],
      [this.effectGain, this.settings.effects],
    ])
      node.gain.setTargetAtTime(
        quiet ? 0 : value,
        this.context.currentTime,
        0.03,
      );
  }
  setSettings(patch) {
    if (typeof patch.muted === "boolean") this.settings.muted = patch.muted;
    for (const k of ["ambience", "effects"])
      if (Number.isFinite(patch[k]))
        this.settings[k] = Math.max(0, Math.min(1, patch[k]));
    this.applyGains();
    if (this.settings.muted) {
      this.cancelActions();
      this.stopAmbience();
    } else this.unlock();
  }
  setHidden(hidden) {
    this.hidden = hidden;
    this.applyGains();
    if (hidden) {
      this.cancelActions();
      this.stopAmbience();
      try {
        this.context?.suspend()?.catch(() => {});
      } catch {}
    } else if (this.context && !this.settings.muted) this.unlock();
  }
}
