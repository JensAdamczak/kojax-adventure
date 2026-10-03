import test from "node:test";
import assert from "node:assert/strict";
import {
  createState,
  move,
  safe,
  parseProgress,
  directions,
} from "../src/campaign/engine.js";
const fixture = (overrides = {}) => ({
  size: 5,
  start: [0, 4],
  end: [4, 0],
  ground: [
    [4, 0],
    [0, 4],
    [0, 3],
  ],
  objects: [],
  jump: true,
  ...overrides,
});
test("Ground order does not define entrance, exit, or movement", () => {
  const level = fixture(),
    state = createState(level);
  assert.deepEqual(state.pos, level.start);
  assert.equal(move(level, state, "up").type, "step");
  state.pos = [4, 1];
  assert.equal(move(level, state, "up").type, "win");
});
test("Objects topple in all four directions and cover hazardous ground", () => {
  for (const [direction, delta] of Object.entries(directions)) {
    const at = [2, 2],
      start = at.map((v, i) => v - delta[i]);
    const level = fixture({
        start,
        ground: [start],
        objects: [{ at, movable: true }],
      }),
      state = createState(level);
    assert.equal(move(level, state, direction).type, "object");
    assert.equal(move(level, state, direction, true).type, "bridge");
    const landing = at.map((v, i) => v + delta[i]);
    assert.ok(safe(level, state, landing));
    assert.equal(move(level, state, direction).type, "step");
  }
});
test("Hazards restore objects and entrance while retaining accumulated scores", () => {
  const level = fixture(),
    state = createState(level);
  state.fallen = [{ at: [2, 2], end: [2, 1], dir: "up" }];
  assert.equal(move(level, state, "right").type, "fall");
  assert.deepEqual(state, {
    pos: level.start,
    steps: 1,
    attempts: 2,
    fallen: [],
    won: false,
  });
});
test("Jumps work in all directions, with unsafe landings and standing objects handled", () => {
  for (const [dir, delta] of Object.entries(directions)) {
    const start = [2, 2],
      end = start.map((v, i) => v + delta[i] * 2),
      level = fixture({ start, end, ground: [start, end] });
    assert.equal(move(level, createState(level), dir, true).type, "win");
    assert.equal(
      move({ ...level, ground: [start] }, createState(level), dir, true).type,
      "fall",
    );
    assert.equal(
      move(
        { ...level, objects: [{ at: end, movable: true }] },
        createState(level),
        dir,
        true,
      ).type,
      "blocked",
    );
    assert.equal(
      move({ ...level, jump: false }, createState(level), dir, true).type,
      "no-jump",
    );
  }
});
test("Corrupt saved progress does not break startup", () => {
  for (const raw of [
    "oops",
    "null",
    "{}",
    '{"version":1,"results":[{"steps":-1,"attempts":1}]}',
  ])
    assert.deepEqual(parseProgress(raw), { results: [] });
});
