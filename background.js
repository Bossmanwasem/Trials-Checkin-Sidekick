// background.js

chrome.runtime.onInstalled.addListener(() => {
  // This makes the side panel open automatically when the user clicks the extension icon.
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
    .catch(console.error);
});

// Optional: ensure the correct panel page is set for the current tab when clicked
chrome.action.onClicked.addListener(async (tab) => {
  if (!tab?.id) return;

  await chrome.sidePanel.setOptions({
    tabId: tab.id,
    path: "panel.html",
    enabled: true
  }).catch(console.error);

  // IMPORTANT: do NOT call chrome.sidePanel.open() here
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type !== "DASHBOARD_PREP_ASSIGNED") return false;

  chrome.notifications.create({
    type: "basic",
    iconUrl: "assets/SB logo.png",
    title: "CRM Sidekick",
    message: "You've Been Assigned a Prep",
    priority: 2
  }).then(notificationId => {
    sendResponse({ ok: true, notificationId });
  }).catch(error => {
    console.error("Unable to show prep assignment notification.", error);
    sendResponse({ ok: false });
  });
  return true;
});
