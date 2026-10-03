import test from "node:test";
import assert from "node:assert/strict";
import { CampaignView } from "../src/campaign/view.js";
import { levels } from "../src/campaign/levels.js";
import { createState } from "../src/campaign/engine.js";
test("Every campaign scene renders hazards, four-direction bridges, motion and rescue at desktop and mobile sizes", () => {
  const ctx = {};
  for (const m of [
    "setTransform",
    "clearRect",
    "drawImage",
    "fillRect",
    "save",
    "restore",
    "translate",
    "rotate",
    "beginPath",
    "ellipse",
    "fill",
    "stroke",
    "moveTo",
    "lineTo",
    "bezierCurveTo",
    "closePath",
    "clip",
  ])
    ctx[m] = (...args) => {
      for (const a of args)
        if (typeof a === "number") assert.ok(Number.isFinite(a), m);
    };
  ctx.createRadialGradient = ctx.createLinearGradient = () => ({
    addColorStop() {},
  });
  globalThis.document = {
    hidden: false,
    createElement: () => ({ getContext: () => ctx }),
  };
  globalThis.ResizeObserver = class {
    observe() {}
  };
  globalThis.matchMedia = () => ({ matches: false });
  globalThis.devicePixelRatio = 2;
  globalThis.requestAnimationFrame = () => 0;
  const assets = Object.fromEntries(
    [
      "water",
      "water-boat",
      "water-lagoon",
      "beach",
      "jungle",
      "lava",
      "snow",
      "terrain",
      "walk",
      "torch",
      "torch-lit",
      "balloon-teal",
      "balloon-coral",
      "rescuer",
      ...["driftwood", "palm", "basalt", "ice"].flatMap((p) => [
        p + "-standing",
        p + "-fallen",
      ]),
    ].map((n) => [n, { width: 500, height: 500 }]),
  );
  assets.frames = Array.from({ length: 4 }, () =>
    Array.from({ length: 4 }, () => [0, 0, 80, 80]),
  );
  let level = levels[0],
    state = createState(level),
    width = 855,
    height = 855;
  const cells = { style: {} },
    marks = new Map(),
    view = new CampaignView(
      {
        getContext: () => ctx,
        getBoundingClientRect: () => ({ width, height }),
      },
      cells,
      assets,
      () => ({ level, state, marks }),
    );
  for (const l of levels) {
    level = l;
    state = createState(l);
    for (const size of [855, 390, 320]) {
      width = height = size;
      view.resize();
      assert.ok(view.fx > 0 && view.fy > 0);
      assert.ok(view.fx + view.floor < width);
      assert.equal(parseFloat(cells.style.width), view.cell * l.size);
      for (const type of ["step", "jump", "bridge", "fall", "rooted"]) {
        marks.set("1,1", {
          type: type === "fall" ? "fall" : "step",
          time: performance.now(),
        });
        for (const dir of ["right", "left", "up", "down"]) {
          state.fallen = l.prop ? [{ at: [1, 1], end: [2, 1], dir }] : [];
          view.animate([0, 1], [1, 1], dir, type);
          const { start, duration } = view.motion;
          for (const p of [0, 0.3, 0.6, 0.9, 1])
            view.draw(start + duration * p);
          assert.equal(view.motion, null);
        }
      }
    }
    if (l.id === 9) {
      view.rescueStart = 0;
      for (const t of [500, 3000, 6500, 10000]) view.draw(t);
    }
  }
});
