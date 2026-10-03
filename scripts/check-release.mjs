// Validate exactly the folder GitHub Pages publishes. No network or dependencies.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import { levels } from "../src/campaign/levels.js";
import { sceneKey, scenePath } from "../src/campaign/assets.js";

const root = fileURLToPath(new URL("../dist/", import.meta.url));
function files(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    assert.ok(
      !entry.isSymbolicLink(),
      `Release must not contain symlinks: ${full}`,
    );
    return entry.isDirectory() ? files(full) : [full];
  });
}
const all = files(root);
const reachable = new Set();
function visit(file) {
  assert.ok(file.startsWith(root), `Reference escapes release: ${file}`);
  assert.ok(fs.existsSync(file), `Missing release file: ${file}`);
  if (reachable.has(file)) return;
  reachable.add(file);
  if (!/\.(html|css|js)$/.test(file)) return;
  const source = fs.readFileSync(file, "utf8");
  const patterns = [
    /(?:src|href)=["']([^"']+)["']/g,
    /url\(['"]?([^)'"\s]+)['"]?\)/g,
    /(?:from\s*|import\s*(?:\()?)["']([^"']+)["']/g,
  ];
  for (const pattern of patterns)
    for (const match of source.matchAll(pattern)) {
      const ref = match[1];
      if (ref.includes("${") || ref.startsWith("#") || ref.startsWith("data:"))
        continue;
      assert.ok(
        !/^(?:https?:|\/)/.test(ref),
        `Use a local relative asset URL in ${file}: ${ref}`,
      );
      const clean = ref.split(/[?#]/)[0];
      let target = path.resolve(path.dirname(file), clean);
      if (fs.existsSync(target) && fs.statSync(target).isDirectory())
        target = path.join(target, "index.html");
      visit(target);
    }
}
visit(path.join(root, "index.html"));
visit(path.join(root, "LICENSE.txt"));
visit(path.join(root, "ASSET-RIGHTS.txt"));
// Runtime-selected art cannot be discovered by scanning static imports.
const assets = new Set([
  "terrain.webp",
  "map.webp",
  "torch.webp",
  "torch-lit.webp",
  "balloon-teal.webp",
  "balloon-coral.webp",
  "rescuer.webp",
  "walk.webp",
  "frames.json",
]);
for (const level of levels) {
  visit(path.join(root, "campaign", scenePath(sceneKey(level))));
  if (level.prop)
    for (const pose of ["standing", "fallen"])
      assets.add(`${level.prop}-${pose}.webp`);
}
for (const asset of assets) visit(path.join(root, "campaign/assets", asset));
assert.deepEqual(
  all.filter((file) => !reachable.has(file)),
  [],
  "Remove unused files from dist or register new runtime assets above.",
);
const script = fs
  .readFileSync(path.join(root, "index.html"), "utf8")
  .match(/<script>([\s\S]*?)<\/script>/)[1];
for (const prefix of ["/", "/kojax-adventure/"])
  for (const search of ["", "?level=5"]) {
    let destination;
    const href = `https://example.github.io${prefix}${search}#test`;
    vm.runInNewContext(script, {
      URL,
      location: {
        protocol: "https:",
        href,
        search,
        hash: "#test",
        replace: (url) => (destination = String(url)),
      },
    });
    assert.equal(
      destination,
      `https://example.github.io${prefix}campaign/${search}#test`,
    );
  }
for (const file of all)
  assert.ok(
    !/\.map$|cheat|solver|reference/i.test(file),
    "Unexpected private/debug artifact: " + file,
  );
const bytes = all.reduce((sum, file) => sum + fs.statSync(file).size, 0);
console.log(
  `Release verified: ${all.length} files, ${(bytes / 1024 / 1024).toFixed(2)} MiB; all 10 levels and project-subpath entry links resolve.`,
);
