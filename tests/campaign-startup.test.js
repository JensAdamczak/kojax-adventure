import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { loadBitmap, assetURL } from "../src/campaign/assets.js";
test("Root entry redirects to the canonical working campaign route and preserves practice parameters", () => {
  const source = fs.readFileSync(
    new URL("../src/index.html", import.meta.url),
    "utf8",
  );
  const script = source.match(/<script>([\s\S]*?)<\/script>/)[1];
  for (const search of ["", "?level=3"]) {
    let destination;
    vm.runInNewContext(script, {
      URL,
      location: {
        protocol: "http:",
        href: "http://127.0.0.1:4173/" + search,
        search,
        hash: "",
        replace: (url) => (destination = String(url)),
      },
    });
    assert.equal(destination, "http://127.0.0.1:4173/campaign/" + search);
  }
});
test("Asset paths resolve from their module rather than the document entry URL", () => {
  assert.ok(
    assetURL("assets/water-v12.webp").endsWith(
      "/src/campaign/assets/water-v12.webp",
    ),
  );
  assert.ok(
    assetURL("assets/walk.webp").endsWith("/src/campaign/assets/walk.webp"),
  );
});
test("Bitmap loading resolves successful assets and rejects both errors and stalled requests", async () => {
  class Success {
    set src(value) {
      this.url = value;
      queueMicrotask(() => this.onload());
    }
  }
  assert.equal(
    (await loadBitmap("good.webp", { ImageType: Success, timeout: 100 })).url,
    "good.webp",
  );
  class Failure {
    set src(_) {
      queueMicrotask(() => this.onerror());
    }
  }
  await assert.rejects(
    loadBitmap("bad.webp", { ImageType: Failure, timeout: 100 }),
    /Could not load/,
  );
  class Stalled {
    set src(_) {}
  }
  await assert.rejects(
    loadBitmap("stalled.webp", { ImageType: Stalled, timeout: 5 }),
    /Timed out/,
  );
});
