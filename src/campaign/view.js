import { sceneKey } from "./assets.js";
import { key } from "./levels.js";
const biomes = ["water", "beach", "jungle", "lava", "snow"];
const clamp = (x) => Math.max(0, Math.min(1, x));
// A failed jump must visibly reach its landing before the hazard reacts.
export function fallPose(m, now, s, biome) {
  const elapsed = Math.max(0, now - m.start),
    lead = m.landDelay || 0;
  if (lead && elapsed < lead) {
    const t = clamp(elapsed / lead),
      e = t * t * (3 - 2 * t);
    return {
      pos: m.from.map((v, i) => v + (m.to[i] - v) * e),
      lift: Math.sin(t * Math.PI) * s * 0.65,
      sink: 0,
      clip: false,
      opacity: 1,
    };
  }
  const p = lead
    ? 0.22 + 0.78 * clamp((elapsed - lead) / (m.duration - lead))
    : clamp(elapsed / m.duration);
  let pos = m.from.map((v, i) => v + (m.to[i] - v) * clamp(p / 0.22)),
    lift = 0,
    sink = 0,
    clip = false,
    opacity = 1;
  if (p < 0.82) {
    if (biome === "lava") {
      const back = clamp((p - 0.28) / 0.45);
      pos = m.to.map((v, i) => v + (m.from[i] - v) * back);
      lift = Math.sin(back * Math.PI) * s * 0.45;
      opacity = 1 - clamp((p - 0.65) / 0.17);
    } else {
      sink = clamp((p - 0.22) / 0.57);
      clip = p > 0.22;
    }
  } else {
    pos = null;
    opacity = (p - 0.82) / 0.18;
  }
  return { pos, lift, sink, clip, opacity };
}
export class CampaignView {
  constructor(canvas, cells, assets, read) {
    Object.assign(this, {
      canvas,
      cells,
      assets,
      read,
      ctx: canvas.getContext("2d"),
      facing: "right",
      motion: null,
      hover: null,
      last: 0,
      rescueStart: null,
    });
    this.reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(canvas);
    this.resize();
    this.loop = this.loop.bind(this);
    requestAnimationFrame(this.loop);
  }
  resize() {
    const { width: w, height: h } = this.canvas.getBoundingClientRect();
    this.w = w;
    this.h = h;
    const d = Math.min(devicePixelRatio || 1, 2);
    this.canvas.width = w * d;
    this.canvas.height = h * d;
    this.ctx.setTransform(d, 0, 0, d, 0, 0);
    this.side = Math.min(w, h) * 1.08;
    this.x = (w - this.side) / 2;
    this.y = (h - this.side) / 2;
    this.floor = this.side * 0.64;
    this.fx = this.x + this.side * 0.18;
    this.fy = this.y + this.side * 0.18;
    const { level } = this.read();
    this.cell = this.floor / level.size;
    Object.assign(this.cells.style, {
      left: this.fx + "px",
      top: this.fy + "px",
      width: this.floor + "px",
      height: this.floor + "px",
      gridTemplateColumns: `repeat(${level.size},1fr)`,
      gridTemplateRows: `repeat(${level.size},1fr)`,
    });
    this.prepare();
  }
  rounded(c, x, y, w, h, r) {
    c.beginPath();
    c.moveTo(x + r, y);
    c.lineTo(x + w - r, y);
    c.bezierCurveTo(x + w, y, x + w, y, x + w, y + r);
    c.lineTo(x + w, y + h - r);
    c.bezierCurveTo(x + w, y + h, x + w, y + h, x + w - r, y + h);
    c.lineTo(x + r, y + h);
    c.bezierCurveTo(x, y + h, x, y + h, x, y + h - r);
    c.lineTo(x, y + r);
    c.bezierCurveTo(x, y, x, y, x + r, y);
    c.closePath();
  }
  prepare() {
    const { level } = this.read(),
      size = 1024,
      n = level.size,
      g = document.createElement("canvas");
    g.width = g.height = size;
    const c = g.getContext("2d"),
      im = this.assets[sceneKey(level)],
      step = size / n;
    // The cushion faces reuse the exact scenery pixels beneath them. This preserves
    // material, colour and scale all the way to the entry instead of laying on a rug.
    for (let row = 0; row < n; row++)
      for (let col = 0; col < n; col++) {
        const x = col * step,
          y = row * step,
          pad = step * 0.006,
          r = step * 0.085;
        c.save();
        this.rounded(c, x + pad, y + pad, step - pad * 2, step - pad * 2, r);
        c.shadowColor = "#17292230";
        c.shadowBlur = step * 0.025;
        c.shadowOffsetY = step * 0.012;
        c.fillStyle = "#34473322";
        c.fill();
        c.shadowBlur = 0;
        c.shadowOffsetY = 0;
        c.clip();
        c.drawImage(
          im,
          (0.18 + (col * 0.64) / n) * im.width,
          (0.18 + (row * 0.64) / n) * im.height,
          (im.width * 0.64) / n,
          (im.height * 0.64) / n,
          x,
          y,
          step,
          step,
        );
        const vertical = c.createLinearGradient(0, y, 0, y + step);
        vertical.addColorStop(0, "#ffffff35");
        vertical.addColorStop(0.055, "#ffffff00");
        vertical.addColorStop(0.88, "#00000000");
        vertical.addColorStop(1, "#18261938");
        c.fillStyle = vertical;
        c.fillRect(x, y, step, step);
        const horizontal = c.createLinearGradient(x, 0, x + step, 0);
        horizontal.addColorStop(0, "#ffffff16");
        horizontal.addColorStop(0.045, "#ffffff00");
        horizontal.addColorStop(0.95, "#00000000");
        horizontal.addColorStop(1, "#17261925");
        c.fillStyle = horizontal;
        c.fillRect(x, y, step, step);
        c.restore();
      }
    this.ground = g;
    // Cache a feathered cutout: keep the original hole and its felt rim intact,
    // but let the actual scene show through the outer material of the atlas tile.
    const hazard = document.createElement("canvas");
    hazard.width = hazard.height = 256;
    const hc = hazard.getContext("2d"),
      atlas = this.assets.terrain,
      b = biomes.indexOf(level.biome);
    hc.drawImage(
      atlas,
      (b * atlas.width) / 5 + 4,
      atlas.height / 2 + 4,
      atlas.width / 5 - 8,
      atlas.height / 2 - 8,
      0,
      0,
      256,
      256,
    );
    hc.globalCompositeOperation = "destination-in";
    hc.setTransform(1, 0, 0, 0.9, 0, 12.8);
    const feather = hc.createRadialGradient(128, 128, 80, 128, 128, 126);
    feather.addColorStop(0, "rgba(0,0,0,1)");
    feather.addColorStop(0.35, "rgba(0,0,0,.85)");
    feather.addColorStop(0.75, "rgba(0,0,0,.2)");
    feather.addColorStop(1, "rgba(0,0,0,0)");
    hc.fillStyle = feather;
    hc.fillRect(0, -16, 256, 288);
    this.hazardCutout = hazard;
  }
  point(p) {
    return [
      this.fx + (p[0] + 0.5) * this.cell,
      this.fy + (p[1] + 0.5) * this.cell,
    ];
  }
  animate(from, to, dir, type, fallen, jumped = false) {
    this.facing = dir;
    const landDelay = type === "fall" && jumped ? (this.reduced ? 40 : 520) : 0;
    const duration = this.reduced
      ? 120
      : landDelay
        ? 520 + 1550 * 0.78
        : { fall: 1550, bridge: 900, jump: 520, rooted: 360 }[type] || 250;
    this.motion = {
      from: [...from],
      to: [...to],
      dir,
      type,
      fallen,
      jumped,
      landDelay,
      start: performance.now(),
      duration,
    };
    return duration;
  }
  reset() {
    this.motion = null;
    this.rescueStart = null;
    this.facing = "right";
    this.resize();
  }
  loop(t) {
    requestAnimationFrame(this.loop);
    if (document.hidden || t - this.last < (this.reduced ? 100 : 1000 / 40))
      return;
    this.last = t;
    this.draw(t);
  }
  ellipse(x, y, rx, ry, color) {
    const c = this.ctx;
    c.beginPath();
    c.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), 0, 0, Math.PI * 2);
    c.fillStyle = color;
    c.fill();
  }
  image(im, x, y, w, h) {
    this.ctx.drawImage(im, x - w / 2, y - h, w, h);
  }
  hazard(p, alpha = 1) {
    const [x, y] = this.point(p),
      s = this.cell,
      c = this.ctx;
    c.save();
    // Constrain the effect to its own cell, including at the outer board edges.
    this.rounded(
      c,
      x - s / 2 + s * 0.006,
      y - s / 2 + s * 0.006,
      s * 0.988,
      s * 0.988,
      s * 0.085,
    );
    c.clip();
    c.globalAlpha = alpha;
    c.drawImage(this.hazardCutout, x - s / 2, y - s / 2, s, s);
    c.restore();
  }
  lip(c, x, y, s) {
    c.lineTo(x + s * 0.5, y - s * 0.06);
    c.lineTo(x + s * 0.3, y + s * 0.04);
    c.bezierCurveTo(
      x + s * 0.2,
      y + s * 0.24,
      x - s * 0.2,
      y + s * 0.24,
      x - s * 0.3,
      y + s * 0.04,
    );
    c.lineTo(x - s * 0.5, y - s * 0.06);
  }
  character(
    pos,
    frame = 0,
    { lift = 0, sink = 0, opacity = 1, clip = false, tilt = 0 } = {},
  ) {
    const c = this.ctx,
      s = this.cell,
      [x, y] = this.point(pos),
      row = { right: 0, left: 1, down: 2, up: 3 }[this.facing],
      rect = this.assets.frames[row][frame],
      all = this.assets.frames[row];
    const scale =
        Math.min(
          (s * 0.91) / Math.max(...all.map((r) => r[2])),
          (s * 0.91) / Math.max(...all.map((r) => r[3])),
        ) *
        (1 - sink * 0.22),
      w = rect[2] * scale,
      h = rect[3] * scale;
    if (!clip) this.ellipse(x, y + s * 0.08, s * 0.23, s * 0.075, "#10282735");
    c.save();
    c.globalAlpha = opacity;
    if (clip) {
      c.beginPath();
      c.moveTo(x - s, y - s * 2);
      c.lineTo(x + s, y - s * 2);
      this.lip(c, x, y, s);
      c.closePath();
      c.clip();
    }
    c.translate(x, y + s * 0.16 - lift + sink * s * 0.95);
    c.rotate(tilt);
    c.drawImage(this.assets.walk, ...rect, -w / 2, -h, w, h);
    c.restore();
    if (clip) {
      c.save();
      c.beginPath();
      c.moveTo(x + s, y - s * 2);
      this.lip(c, x, y, s);
      c.lineTo(x - s, y + s);
      c.lineTo(x + s, y + s);
      c.closePath();
      c.clip();
      this.hazard(pos);
      c.restore();
    }
  }
  rescue(now, level) {
    const c = this.ctx,
      elapsed = (now - this.rescueStart) / 1000,
      approach = this.reduced ? 1 : clamp((elapsed - 1) / 5),
      depart = this.reduced ? 0 : clamp((elapsed - 7.4) / 2.6);
    for (let i = 0; i < 5; i++) {
      const im = this.assets[i % 2 ? "balloon-coral" : "balloon-teal"],
        w = this.side * (i === 2 ? 0.2 : 0.13),
        h = (w * im.height) / im.width;
      const x =
          this.x +
          this.side * (i === 2 ? 0.78 - 0.28 * depart : 0.14 + i * 0.18),
        endY =
          this.y +
          this.side * (i === 2 ? 0.34 : 0.34 + Math.abs(i - 2) * 0.085);
      const y =
        this.y -
        h +
        (endY - this.y + h) * approach -
        depart * this.side * 0.08 +
        (this.reduced ? 0 : Math.sin(now / 1000 + i) * 4);
      this.image(im, x, y, w, h);
      // Pilots travel with the baskets from the moment the fleet arrives.
      const pilot = this.assets.rescuer,
        ph = h * 0.17,
        pw = (ph * pilot.width) / pilot.height;
      this.image(pilot, x - (i === 2 ? w * 0.1 : 0), y - h * 0.12, pw, ph);
      if (i === 2 && (elapsed >= 6 || this.reduced)) {
        const t = this.reduced ? 1 : clamp((elapsed - 6) / 1.2),
          e = t * t * (3 - 2 * t),
          rect = this.assets.frames[t < 1 ? 1 : 2][0];
        const [sx, sy] = this.point(level.end),
          ex = x + w * 0.1,
          ey = y - h * 0.12;
        const ch = this.cell * 0.85 * (1 - e) + h * 0.16 * e,
          cw = (ch * rect[2]) / rect[3];
        const px = sx + (ex - sx) * e,
          py =
            sy +
            this.cell * 0.16 +
            (ey - sy - this.cell * 0.16) * e -
            Math.sin(t * Math.PI) * this.cell * 0.9;
        c.drawImage(this.assets.walk, ...rect, px - cw / 2, py - ch, cw, ch);
      }
      // The original basket front hides the passengers' bodies, not their faces.
      c.drawImage(
        im,
        0,
        im.height * 0.82,
        im.width,
        im.height * 0.18,
        x - w / 2,
        y - h * 0.18,
        w,
        h * 0.18,
      );
    }
  }

  draw(now) {
    const { level, state, marks, prepared } = this.read(),
      c = this.ctx,
      s = this.cell;
    c.clearRect(0, 0, this.w, this.h);
    c.drawImage(
      this.assets[sceneKey(level)],
      this.x,
      this.y,
      this.side,
      this.side,
    );
    c.drawImage(this.ground, this.fx, this.fy, this.floor, this.floor);
    const m = this.motion,
      p = m ? clamp((now - m.start) / m.duration) : 1;
    for (const [k, mark] of marks) {
      const age = (now - mark.time) / 3400;
      if (age < 0) continue;
      if (age >= 1) {
        marks.delete(k);
        continue;
      }
      const pos = k.split(",").map(Number),
        [x, y] = this.point(pos);
      if (mark.type === "fall") {
        this.hazard(
          pos,
          Math.min(clamp((now - mark.time) / 350), (1 - age) * 2),
        );
        continue;
      }
      c.save();
      c.globalAlpha = (1 - age) * 0.65;
      if (level.biome === "water") {
        c.strokeStyle = "#d4f1e4";
        c.lineWidth = 1.5;
        c.beginPath();
        c.ellipse(
          x,
          y,
          s * (0.15 + age * 0.15),
          s * (0.08 + age * 0.08),
          0,
          0,
          Math.PI * 2,
        );
        c.stroke();
      } else {
        c.translate(x, y);
        c.rotate(
          { up: 0, right: Math.PI / 2, down: Math.PI, left: -Math.PI / 2 }[
            mark.dir || "up"
          ],
        );
        for (let j = 0; j < 4; j++) {
          const xx = (j % 2 ? 1 : -1) * s * 0.105,
            yy = (j < 2 ? -0.13 : 0.13) * s + (j % 2 ? s * 0.025 : 0);
          this.ellipse(
            xx,
            yy,
            s * 0.045,
            s * 0.03,
            level.biome === "snow" ? "#668393" : "#253326",
          );
          for (let k = 0; k < 3; k++)
            this.ellipse(
              xx + (k - 1) * s * 0.028,
              yy - s * 0.035,
              s * 0.012,
              s * 0.012,
              level.biome === "snow" ? "#668393" : "#253326",
            );
        }
      }
      c.restore();
    }
    for (const f of state.fallen) {
      const im = this.assets[level.prop + "-fallen"],
        [x, y] = this.point(f.at),
        angle = {
          right: 0,
          down: Math.PI / 2,
          left: Math.PI,
          up: -Math.PI / 2,
        }[f.dir],
        moving = m?.type === "bridge" && key(m.to) === key(f.at) && p < 1;
      const progress = moving ? clamp(p / 0.85) : 1,
        w = s * 1.9,
        h = Math.min(s * 0.95, (w * im.height) / im.width);
      c.save();
      c.translate(x, y);
      c.rotate(angle);
      c.globalAlpha = progress;
      c.translate(0, -Math.sin(progress * Math.PI) * s * 0.25);
      c.rotate(-(1 - progress) * 0.6);
      c.drawImage(im, -s * 0.42, -h * 0.5, w, h);
      c.restore();
    }
    let pos = state.pos,
      lift = 0,
      sink = 0,
      clip = false,
      opacity = 1,
      frame = 0;
    if (m && p < 1) {
      const e = p * p * (3 - 2 * p);
      if (m.type === "fall") {
        const pose = fallPose(m, now, s, level.biome);
        pos = pose.pos || state.pos;
        ({ lift, sink, clip, opacity } = pose);
      } else if (m.type === "rooted") {
        pos = m.from;
      } else {
        pos = m.from.map((v, i) => v + (m.to[i] - v) * e);
        if (m.type === "jump") lift = Math.sin(p * Math.PI) * s * 0.65;
      }
      frame = this.reduced ? 0 : Math.floor(p * 4) % 4;
    }
    if (prepared && !m) {
      const d = { right: [1, 0], left: [-1, 0], up: [0, -1], down: [0, 1] }[
        prepared.dir
      ];
      const lean = this.reduced ? 1 : clamp((now - prepared.time) / 180);
      pos = state.pos.map((v, i) => v + d[i] * 0.075 * lean);
    }
    const objects = level.objects
      .filter((o) => !state.fallen.some((f) => key(f.at) === key(o.at)))
      .map((o) => ({
        depth: o.at[1] + 0.1,
        draw: () => {
          const [x, y] = this.point(o.at),
            im = this.assets[level.prop + "-standing"],
            h = s * (level.prop === "palm" ? 1.45 : 1.25),
            w = (h * im.width) / im.height;
          c.save();
          c.translate(x, y + s * 0.12);
          if (prepared?.object === key(o.at)) {
            const lean = this.reduced ? 1 : clamp((now - prepared.time) / 180);
            const direction = { right: 1, left: -1, up: 0.35, down: -0.35 }[
              prepared.dir
            ];
            c.rotate(direction * 0.13 * lean);
            c.translate(
              0,
              (prepared.dir === "up" ? -1 : prepared.dir === "down" ? 1 : 0) *
                s *
                0.035 *
                lean,
            );
          }
          if (m?.type === "rooted" && key(m.to) === key(o.at))
            c.rotate(Math.sin(p * Math.PI * 5) * 0.035 * (1 - p));
          c.drawImage(im, -w / 2, -h, w, h);
          c.restore();
        },
      }));
    if (
      this.rescueStart === null ||
      (!this.reduced && now - this.rescueStart < 6000)
    )
      objects.push({
        depth: pos[1],
        draw: () =>
          this.character(pos, frame, {
            lift,
            sink,
            opacity,
            clip,
            tilt: clip ? Math.sin(sink * Math.PI) * 0.12 : 0,
          }),
      });
    objects.sort((a, b) => a.depth - b.depth).forEach((o) => o.draw());
    if (level.id === 9) {
      const [x, y] = this.point(level.end),
        lit = this.rescueStart !== null,
        im = this.assets[lit ? "torch-lit" : "torch"];
      const h = s * (lit ? 1.9 : 1.55);
      this.image(im, x + s * 0.55, y + s * 0.45, (h * im.width) / im.height, h);
    }
    if (this.rescueStart !== null) this.rescue(now, level);
    if (m && now >= m.start + m.duration) this.motion = null;
  }
}
