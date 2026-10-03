import { build } from "esbuild";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../", import.meta.url));
const output = path.join(root, "dist");
// dist is generated, ignored by Git, and contains no manually maintained files.
await fs.rm(output, { recursive: true, force: true });
await fs.cp(path.join(root, "public"), output, { recursive: true });
const result = await build({
  absWorkingDir: root,
  entryPoints: {
    boot: "src/campaign/boot.js",
    style: "src/campaign/campaign.css",
  },
  outdir: "dist/campaign",
  entryNames: "[name]-[hash]",
  chunkNames: "chunk-[hash]",
  bundle: true,
  splitting: true,
  format: "esm",
  target: ["es2020"],
  minify: true,
  sourcemap: false,
  metafile: true,
  external: ["assets/*"],
  legalComments: "none",
  banner: {
    js: "/*! Kojax Adventure code and original artwork/audio: MIT. See ../LICENSE.txt and ../ASSET-RIGHTS.txt. */",
  },
});
const entry = (source) =>
  Object.entries(result.metafile.outputs).find(
    ([, meta]) => meta.entryPoint === source,
  )?.[0];
const boot = path.basename(entry("src/campaign/boot.js"));
const style = path.basename(entry("src/campaign/campaign.css"));
let html = await fs.readFile(
  path.join(root, "src/campaign/index.html"),
  "utf8",
);
html = html
  .replace(/<link\s+rel="modulepreload"[^>]*>\s*/g, "")
  .replace('src="boot.js"', `src="${boot}"`)
  .replace('href="campaign.css"', `href="${style}"`);
await fs.writeFile(path.join(output, "campaign/index.html"), html);
await fs.copyFile(
  path.join(root, "src/index.html"),
  path.join(output, "index.html"),
);
await fs.copyFile(path.join(root, "LICENSE"), path.join(output, "LICENSE.txt"));
await fs.copyFile(
  path.join(root, "ASSET-RIGHTS.md"),
  path.join(output, "ASSET-RIGHTS.txt"),
);
console.log(
  "Built dist: hashed, minified modules and CSS; original artwork; no source maps.",
);
