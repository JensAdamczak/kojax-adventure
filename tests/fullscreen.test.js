import test from "node:test";
import assert from "node:assert/strict";
import { bindFullscreen } from "../src/campaign/fullscreen.js";
function fixture(enabled = true, reject = false) {
  const attributes = {},
    button = { setAttribute: (k, v) => (attributes[k] = v) };
  let event,
    failures = 0;
  const doc = {
    fullscreenEnabled: enabled,
    fullscreenElement: null,
    addEventListener: (name, fn) => (event = fn),
    documentElement: {
      requestFullscreen: async () => {
        if (reject) throw Error("denied");
        doc.fullscreenElement = doc.documentElement;
        event();
      },
    },
    exitFullscreen: async () => {
      doc.fullscreenElement = null;
      event();
    },
  };
  bindFullscreen(button, doc, () => failures++);
  return {
    button,
    doc,
    attributes,
    get failures() {
      return failures;
    },
    externalExit() {
      doc.fullscreenElement = null;
      event();
    },
  };
}
test("Fullscreen toggles entry/exit and follows browser Escape", async () => {
  const f = fixture();
  await f.button.onclick();
  assert.equal(f.attributes["aria-label"], "Exit fullscreen");
  assert.equal(f.attributes["aria-pressed"], "true");
  await f.button.onclick();
  assert.equal(f.doc.fullscreenElement, null);
  await f.button.onclick();
  f.externalExit();
  assert.equal(f.attributes["aria-label"], "Enter fullscreen");
});
test("Unavailable or rejected fullscreen leaves game in normal mode", async () => {
  for (const f of [fixture(false), fixture(true, true)]) {
    await f.button.onclick();
    assert.equal(f.failures, 1);
    assert.equal(f.attributes["aria-pressed"], "false");
  }
});
