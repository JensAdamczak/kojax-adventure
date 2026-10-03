import test from "node:test";
import assert from "node:assert/strict";
import { journeyScore, restartedCrossing } from "../src/campaign/score.js";
test("Campaign totals include previous crossings and live attempts without double counting a saved win", () => {
  const previous = [
    { attempts: 2, steps: 10 },
    { attempts: 3, steps: 18 },
  ];
  assert.deepEqual(journeyScore(previous, 1, previous[1]), {
    attempts: 5,
    steps: 28,
  });
  assert.deepEqual(journeyScore(previous, 1, { attempts: 1, steps: 4 }), {
    attempts: 3,
    steps: 14,
  });
  assert.deepEqual(journeyScore(previous, 1, previous[1], true), previous[1]);
});
test("Restarting a crossing retains score, adds an attempt and restores entrance and objects", () => {
  assert.deepEqual(
    restartedCrossing({ start: [0, 6] }, { attempts: 2, steps: 8 }),
    { pos: [0, 6], attempts: 3, steps: 8, fallen: [], won: false },
  );
});
