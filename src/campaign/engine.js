import { key } from "./levels.js";
export const directions = {
  up: [0, -1],
  right: [1, 0],
  down: [0, 1],
  left: [-1, 0],
};
export const inside = (l, p) =>
  p.every((v) => Number.isInteger(v) && v >= 0 && v < l.size);
export function createState(l) {
  return { pos: [...l.start], attempts: 1, steps: 0, fallen: [], won: false };
}
export const standing = (l, s, p) =>
  l.objects.find(
    (o) => key(o.at) === key(p) && !s.fallen.some((f) => key(f.at) === key(p)),
  );
export function safe(l, s, p) {
  return (
    s.fallen.some((f) => key(f.at) === key(p) || key(f.end) === key(p)) ||
    l.ground.some((q) => key(q) === key(p))
  );
}
export function move(l, s, direction, special = false) {
  const d = directions[direction];
  if (!d || s.won) return { type: "ignored" };
  const from = [...s.pos],
    next = from.map((v, i) => v + d[i]);
  if (!inside(l, next)) return { type: "edge" };
  const object = standing(l, s, next);
  if (object) {
    if (!special) return { type: "object", at: next };
    if (!object.movable) return { type: "rooted", at: next };
    const end = next.map((v, i) => v + d[i]);
    if (
      !inside(l, end) ||
      standing(l, s, end) ||
      s.fallen.some((f) => key(f.end) === key(end) || key(f.at) === key(end))
    )
      return { type: "blocked", at: next };
    const fallen = { at: [...next], end, dir: direction };
    s.fallen.push(fallen);
    s.pos = next;
    s.steps++;
    return { type: "bridge", at: next, fallen };
  }
  let target = next;
  if (special) {
    if (!l.jump) return { type: "no-jump" };
    target = from.map((v, i) => v + d[i] * 2);
    if (!inside(l, target)) return { type: "edge" };
    if (standing(l, s, target)) return { type: "blocked" };
  }
  s.steps++;
  if (!safe(l, s, target)) {
    s.attempts++;
    s.pos = [...l.start];
    s.fallen = [];
    return { type: "fall", at: target, jumped: special };
  }
  s.pos = target;
  s.won = key(target) === key(l.end);
  return {
    type: s.won ? "win" : special ? "jump" : "step",
    at: target,
    jumped: special,
  };
}
// Progress contains only validated completed-level results. Current attempt restarts safely.
export function parseProgress(raw) {
  try {
    const p = JSON.parse(raw);
    if (p.version !== 1 || !Array.isArray(p.results)) return { results: [] };
    const results = [];
    for (const r of p.results.slice(0, 10)) {
      if (
        !r ||
        !Number.isInteger(r.attempts) ||
        r.attempts < 1 ||
        !Number.isInteger(r.steps) ||
        r.steps < 1
      )
        break;
      results.push({ attempts: r.attempts, steps: r.steps });
    }
    return { results };
  } catch {
    return { results: [] };
  }
}
