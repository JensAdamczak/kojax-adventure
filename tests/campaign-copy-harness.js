import { GameAudio } from "../src/campaign/audio.js";
import vm from "node:vm";
import { text, levelText, biomeText } from "../src/campaign/text.js";
import { escapeHTML, formatText } from "../src/campaign/text-format.js";
import { createState, directions, standing } from "../src/campaign/engine.js";
import { journeyScore, restartedCrossing } from "../src/campaign/score.js";
import { assetURL, sceneKey, scenePath } from "../src/campaign/assets.js";

export function captureScreens(source, levels, copy = text) {
  const nodes = new Map();
  const getNode = (id) => {
    if (!nodes.has(id))
      nodes.set(id, {
        dataset: {},
        style: {},
        innerHTML: "",
        open: false,
        setAttribute() {},
        append() {},
        querySelector() {
          return null;
        },
        focus() {},
        addEventListener() {},
        showModal() {
          this.open = true;
        },
        close() {
          this.open = false;
        },
      });
    return nodes.get(id);
  };
  const context = vm.createContext({
    text: copy,
    GameAudio,
    levelText,
    biomeNames: biomeText,
    escapeHTML,
    formatText,
    levels,
    createState,
    directions,
    standing,
    journeyScore,
    restartedCrossing,
    assetURL,
    sceneKey,
    scenePath,
    key: (p) => p.join(","),
    URLSearchParams,
    location: { search: "" },
    localStorage: { getItem: () => null },
    parseProgress: () => ({ results: [] }),
    document: {
      getElementById: getNode,
      addEventListener() {},
      createElement: () => ({ dataset: {}, setAttribute() {} }),
    },
    window: { addEventListener() {} },
    MovementInput: class {
      clear() {}
    },
    bindFullscreen() {},
  });
  vm.runInContext(
    source.replace(/^import[\s\S]*?;\s*$/gm, "").replace(/\bload\(\);\s*$/, ""),
    context,
  );
  const screens = [];
  const capture = () =>
    screens.push(
      getNode("dialogContent")
        .innerHTML.replace(/src="[^"]*"/g, 'src="ASSET"')
        .replace(/>\s+</g, "><")
        .trim(),
    );
  for (let i = 0; i < 10; i++) {
    vm.runInContext(
      `index=${i};level=levels[index];state=createState(level);introduction();`,
      context,
    );
    capture();
    vm.runInContext("help();", context);
    capture();
  }
  vm.runInContext("confirmNew();", context);
  capture();
  vm.runInContext("busy=false;restartMenu();", context);
  capture();
  vm.runInContext("completion();", context);
  capture();
  vm.runInContext("ending();", context);
  capture();
  return screens;
}
