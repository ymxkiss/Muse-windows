// Keep the native context menu usable even when a site registers handlers that cancel it.
window.addEventListener('contextmenu', (event) => {
  event.stopImmediatePropagation();
}, true);
