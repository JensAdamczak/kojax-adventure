// Copy is plain text, including when a menu is rendered with innerHTML.
export function escapeHTML(value) {
  return String(value).replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[character],
  );
}

export function formatText(template, values = {}) {
  return template.replace(/\{(\w+)\}/g, (placeholder, name) =>
    Object.hasOwn(values, name) ? String(values[name]) : placeholder,
  );
}

// Static shell labels are applied once, before the campaign starts.
export function applyShellText(document, text) {
  const lookup = (path) =>
    path.split(".").reduce((value, key) => value[key], text);
  for (const element of document.querySelectorAll("[data-text]")) {
    element.textContent = lookup(element.dataset.text);
  }
  for (const element of document.querySelectorAll("[data-label]")) {
    const label = lookup(element.dataset.label);
    element.setAttribute("aria-label", label);
    if (element.hasAttribute("title")) element.title = label;
  }
}
