import test from "node:test";
import assert from "node:assert/strict";
import { MovementInput } from "../src/campaign/input.js";
function setup() {
  let t = 0;
  const state = {
      blocked: false,
      busy: false,
      canQueue: true,
      objectKey: () => null,
    },
    calls = [];
  const input = new MovementInput({
    read: () => state,
    execute: (...a) => calls.push(a),
    now: () => t,
  });
  return { state, calls, input, time: (n) => (t = n) };
}
test("Walking starts immediately; rapid repeated directions remain walks", () => {
  const { input, calls } = setup();
  input.direction("right");
  assert.deepEqual(calls, [["right", "walk"]]);
  input.direction("right");
  assert.deepEqual(calls[1], ["right", "walk"]);
});
test("Buffer only one next move during animation, then consume once", () => {
  const { input, state, calls } = setup();
  state.busy = true;
  input.direction("up");
  input.direction("left");
  assert.equal(calls.length, 0);
  state.busy = false;
  input.drain();
  input.drain();
  assert.deepEqual(calls, [["up", "walk"]]);
});
test("Two presses topple the same object even after a long pause", () => {
  const { input, state, calls, time } = setup();
  state.objectKey = () => "2,3";
  input.direction("right");
  assert.equal(input.objectPress.object, "2,3");
  time(60000);
  input.direction("right");
  assert.deepEqual(calls, [
    ["right", "walk"],
    ["right", "push"],
  ]);
  assert.equal(input.objectPress, null);
});
test("Walking away or approaching another object requires a new first push", () => {
  const { input, state, calls } = setup();
  state.objectKey = (dir) => (dir === "right" ? "2,3" : null);
  input.direction("right");
  input.direction("left");
  input.direction("right");
  assert.equal(calls.at(-1)[1], "walk");
  state.objectKey = () => "4,5";
  input.direction("right");
  assert.equal(calls.at(-1)[1], "walk");
  input.direction("right");
  assert.equal(calls.at(-1)[1], "push");
});
test("Jump intent survives buffering, and does not become a push", () => {
  const { input, state, calls } = setup();
  state.objectKey = () => "2,3";
  state.busy = true;
  input.direction("up", "jump");
  state.busy = false;
  input.drain();
  assert.deepEqual(calls, [["up", "jump"]]);
});
test("Falls, dialogs and focus resets discard buffered input and push gestures", () => {
  const { input, state, calls } = setup();
  state.busy = true;
  input.direction("up");
  state.blocked = true;
  input.direction("right");
  state.blocked = false;
  state.busy = false;
  input.drain();
  assert.equal(calls.length, 0);
  state.busy = true;
  input.direction("up");
  input.clear();
  state.busy = false;
  input.drain();
  assert.equal(calls.length, 0);
});
import fs from "node:fs";
import vm from "node:vm";
test("Keyboard Space is a held jump modifier; release restores walking and repeats do not move", () => {
  const handlers = {},
    calls = [],
    src = fs.readFileSync(
      new URL("../src/campaign/campaign.js", import.meta.url),
      "utf8",
    );
  const context = vm.createContext({
    document: { addEventListener: (n, f) => (handlers[n] = f) },
    window: { addEventListener() {} },
    dialog: { open: false },
    view: {},
    state: { won: false },
    controls: { direction: (...a) => calls.push(a) },
    say() {},
    cancelPending() {},
  });
  vm.runInContext(
    "let mode=null,spaceHeld=false;" +
      src.slice(
        src.indexOf("function input(dir)"),
        src.indexOf("dialog.addEventListener("),
      ),
    context,
  );
  const event = (key, repeat = false) => ({ key, repeat, preventDefault() {} });
  handlers.keydown(event(" "));
  handlers.keydown(event("ArrowUp"));
  handlers.keyup(event(" "));
  handlers.keydown(event("ArrowRight"));
  handlers.keydown(event("ArrowRight", true));
  assert.deepEqual(calls, [
    ["up", "jump"],
    ["right", "walk"],
  ]);
});
