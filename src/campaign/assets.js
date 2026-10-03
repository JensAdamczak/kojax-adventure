// Resolve against the module, not the document URL or a browser's cached <base>.
export const assetURL = (path) => new URL(path, import.meta.url).href;
export function loadBitmap(
  src,
  { ImageType = globalThis.Image, timeout = 20000 } = {},
) {
  return new Promise((resolve, reject) => {
    const image = new ImageType();
    let done = false;
    const finish = (error) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      image.onload = image.onerror = null;
      if (error) reject(error);
      else resolve(image);
    };
    const timer = setTimeout(
      () => finish(new Error(`Timed out loading ${src}`)),
      timeout,
    );
    image.onload = () => finish();
    image.onerror = () => finish(new Error(`Could not load ${src}`));
    image.src = src;
  });
}
export async function loadJSON(path, { timeout = 20000 } = {}) {
  const controller = new AbortController(),
    timer = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(assetURL(path), { signal: controller.signal });
    if (!response.ok)
      throw Error(`Could not load ${path} (${response.status})`);
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

// Each water crossing has its own shoreline so the boat stays behind in level 1.
export const sceneKey = (level) =>
  level.id === 0 ? "water-boat" : level.id === 1 ? "water-lagoon" : level.biome;
export const scenePath = (name) =>
  `assets/${name}-${["water-boat", "water-lagoon"].includes(name) ? "v26" : ["jungle", "lava"].includes(name) ? "v25" : "v12"}.webp`;
