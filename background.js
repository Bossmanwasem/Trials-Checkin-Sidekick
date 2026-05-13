// background.js

const SIDE_PANEL_PATH = "panel-shell.html";
const AUDIT_STORAGE_KEY = "ttmtSidekickAuditLog";
const AUDIT_MAX_ENTRIES = 1000;

function appendAuditLog(entry = {}, sender = {}) {
  return new Promise((resolve, reject) => {
    if (!chrome?.storage?.local) {
      resolve();
      return;
    }

    const normalizedEntry = {
      id: entry.id || `${Date.now()}-${Math.random()}`,
      timestamp: entry.timestamp || new Date().toISOString(),
      source: entry.source || "background",
      severity: entry.severity || "info",
      eventType: entry.eventType || "extension.event",
      action: entry.action || "",
      viewId: entry.viewId || "",
      roleId: entry.roleId || "",
      roleName: entry.roleName || "",
      profileLabel: entry.profileLabel || "",
      toolId: entry.toolId || "",
      toolLabel: entry.toolLabel || "",
      metadata: {
        ...(entry.metadata || {}),
        senderTabId: sender?.tab?.id ?? null,
        senderUrl: sender?.url || sender?.tab?.url || ""
      },
      error: entry.error || null
    };

    chrome.storage.local.get(AUDIT_STORAGE_KEY, result => {
      const existing = Array.isArray(result?.[AUDIT_STORAGE_KEY])
        ? result[AUDIT_STORAGE_KEY]
        : [];
      const updated = [...existing, normalizedEntry].slice(-AUDIT_MAX_ENTRIES);
      chrome.storage.local.set({ [AUDIT_STORAGE_KEY]: updated }, () => {
        const error = chrome.runtime.lastError;
        if (error) {
          reject(error);
          return;
        }
        resolve(normalizedEntry);
      });
    });
  });
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
    .then(() => appendAuditLog({
      eventType: "extension.installed",
      action: "Side panel behavior set",
      severity: "info"
    }))
    .catch(error => {
      console.error(error);
      void appendAuditLog({
        eventType: "extension.error",
        action: "Failed to set side panel behavior",
        severity: "error",
        error: {
          name: error?.name || "Error",
          message: error?.message || String(error)
        }
      });
    });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type !== "SIDEKICK_AUDIT_LOG") return false;

  appendAuditLog(message.entry, sender)
    .then(entry => sendResponse({ ok: true, entryId: entry.id }))
    .catch(error => {
      console.error(error);
      sendResponse({
        ok: false,
        message: error?.message || "Failed to write audit log."
      });
    });

  return true;
});

chrome.action.onClicked.addListener(async (tab) => {
  if (!tab?.id) return;

  try {
    await chrome.sidePanel.setOptions({
      tabId: tab.id,
      path: SIDE_PANEL_PATH,
      enabled: true
    });
    await appendAuditLog({
      eventType: "extension.action.clicked",
      action: "Opened CRM Sidekick",
      severity: "info",
      metadata: { tabId: tab.id, tabUrl: tab.url || "" }
    });
  } catch (error) {
    console.error(error);
    void appendAuditLog({
      eventType: "extension.error",
      action: "Failed to open CRM Sidekick",
      severity: "error",
      metadata: { tabId: tab.id, tabUrl: tab.url || "" },
      error: {
        name: error?.name || "Error",
        message: error?.message || String(error)
      }
    });
  }

  // IMPORTANT: do NOT call chrome.sidePanel.open() here
});
