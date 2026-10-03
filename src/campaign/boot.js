// Keep error handling independent of the editable copy: even a missing quote
// in text.js should show a recovery screen, not an endless loading indicator.
let copy;
let escape;

Promise.all([import("./text.js"), import("./text-format.js")])
  .then(([content, formatting]) => {
    copy = content.text;
    escape = formatting.escapeHTML;
    formatting.applyShellText(document, copy);
    return import("./campaign.js");
  })
  .catch((error) => {
    const loading = document.getElementById("loading");
    loading.hidden = false;
    if (copy && escape) {
      loading.innerHTML = `
        <p>${escape(copy.errors.bootTitle)}</p>
        <small>${escape(copy.errors.bootDescription)}</small>
        <button class="primary" id="retry">${escape(copy.buttons.reloadGame)}</button>
        <a href="./">${escape(copy.buttons.openGame)}</a>
      `;
    } else {
      // Emergency fallback only; cannot depend on a broken text.js.
      loading.innerHTML =
        '<p>The adventure could not start.</p><small>Please reload to retry.</small><button class="primary" id="retry">Reload game</button>';
    }
    document.getElementById("retry").onclick = () => location.reload();
    console.error(error);
  });
