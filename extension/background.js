// Service worker: only opens the side panel. All logic lives in the panel page, which is not
// subject to the MV3 service-worker 30-second lifetime, and all analysis runs on the CodeQuest server.
chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch((error) => {
    console.error("CodeQuest: could not set side panel behaviour", error);
  });
});
