// ISOLATED-world relay: forwards submission messages from the page hook to the service worker.
// The service worker re-validates everything; this only filters out unrelated window messages.
window.addEventListener("message", (event) => {
  if (event.source !== window || event.origin !== location.origin) return;
  const data = event.data;
  if (!data || data.source !== "codequest-companion" || data.type !== "submission") return;
  chrome.runtime.sendMessage({ type: "cq-submission", data }).catch(() => {
    // The extension was reloaded or updated while this page stayed open; nothing to do.
  });
});
