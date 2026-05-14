// background.js

chrome.runtime.onInstalled.addListener(() => {
  // The overlay is now the primary workflow. Keep the side panel files available
  // as a fallback, but do not open the side panel when the extension icon is clicked.
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false })
    .catch(console.error);
});

chrome.action.onClicked.addListener(async (tab) => {
  if (!tab?.id) return;

  const response = await chrome.tabs.sendMessage(tab.id, { type: "TOGGLE_SIDEKICK_OVERLAY" })
    .catch(() => null);
  if (response?.ok) return;

  // Fallback only: if a restricted page cannot receive content scripts, leave the
  // legacy panel configured so users can still open it from browser UI if needed.
  await chrome.sidePanel.setOptions({
    tabId: tab.id,
    path: "panel.html",
    enabled: true
  }).catch(console.error);
});
