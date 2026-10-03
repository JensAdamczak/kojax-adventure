import { text } from "./text.js";
// Fullscreen the document so dialogs remain available above the game.
export function bindFullscreen(button, doc, onUnavailable) {
  const update = () => {
    const active = !!doc.fullscreenElement;
    button.title = active
      ? text.accessibility.exitFullscreen
      : text.accessibility.enterFullscreen;
    button.setAttribute("aria-label", button.title);
    button.setAttribute("aria-pressed", String(active));
    button.textContent = active ? "⤡" : "⤢";
  };
  button.onclick = async () => {
    try {
      if (doc.fullscreenElement) await doc.exitFullscreen();
      else if (doc.fullscreenEnabled && doc.documentElement.requestFullscreen)
        await doc.documentElement.requestFullscreen();
      else onUnavailable();
    } catch {
      onUnavailable();
    }
    update();
  };
  doc.addEventListener("fullscreenchange", update);
  update();
}
