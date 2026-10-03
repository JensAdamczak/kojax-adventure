import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { captureScreens } from "./campaign-copy-harness.js";
import { levels } from "../src/campaign/levels.js";
import { text, levelText } from "../src/campaign/text.js";
import {
  escapeHTML,
  formatText,
  applyShellText,
} from "../src/campaign/text-format.js";
const source = fs.readFileSync(
  new URL("../src/campaign/campaign.js", import.meta.url),
  "utf8",
);
test("All ten intros, help menus, restart and result screens preserve the approved copy and markup", () => {
  const expected = JSON.parse(
    fs.readFileSync(new URL("./fixtures/campaign-copy.json", import.meta.url)),
  );
  assert.deepEqual(captureScreens(source, levels), expected);
});
test("Manually edited copy is escaped without changing menu controls or score element IDs", () => {
  const edited = structuredClone(text);
  edited.help.title = 'Kojax & friends <ready> "yes"';
  edited.ending.steps = "Paw steps";
  const screens = captureScreens(source, levels, edited);
  assert.ok(
    screens[1].includes("Kojax &amp; friends &lt;ready&gt; &quot;yes&quot;"),
  );
  assert.ok(screens[1].includes('id="play"'));
  assert.equal(escapeHTML("Kojax's"), "Kojax&#39;s");
  assert.equal(
    formatText(text.progress.crossed, { level: "The Lagoon" }),
    "The Lagoon crossed",
  );
  assert.equal(Object.keys(levelText).length, 10);
});
test("Loading screen and button labels are populated once from editable copy", () => {
  const heading = { dataset: { text: "app.loadingTitle" } };
  const button = {
    dataset: { label: "buttons.restartCrossing" },
    hasAttribute: () => true,
    setAttribute(k, v) {
      this[k] = v;
    },
  };
  applyShellText(
    { querySelectorAll: (s) => (s === "[data-text]" ? [heading] : [button]) },
    text,
  );
  assert.equal(heading.textContent, text.app.loadingTitle);
  assert.equal(button.title, text.buttons.restartCrossing);
  assert.equal(button["aria-label"], text.buttons.restartCrossing);
});
