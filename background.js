// background.js

try {
  importScripts("sidekick-supabase-config.js");
} catch (error) {
  console.warn("Sidekick Supabase config was not loaded.", error);
}

const SIDE_PANEL_PATH = "panel-shell.html";
const AUDIT_MESSAGE_TYPE = "SIDEKICK_AUDIT_LOG";
const DEFAULT_AUDIT_FUNCTION_NAME = "sidekick-audit-log";

function getSupabaseAuditConfig() {
  const config = self.SidekickSupabaseConfig || {};
  const projectUrl = String(config.projectUrl || "").replace(/\/+$/, "");
  const anonKey = String(config.anonKey || "");
  const functionName = String(config.auditFunctionName || DEFAULT_AUDIT_FUNCTION_NAME);

  if (!projectUrl || !anonKey) {
    throw new Error("Sidekick Supabase audit logging is not configured.");
  }

  return {
    endpoint: `${projectUrl}/functions/v1/${functionName}`,
    anonKey
  };
}

function normalizeAuditEntry(entry = {}, sender = {}) {
  return {
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
    extensionVersion: chrome.runtime.getManifest?.().version || "",
    metadata: {
      ...(entry.metadata || {}),
      senderTabId: sender?.tab?.id ?? null,
      senderUrl: sender?.url || sender?.tab?.url || ""
    },
    error: entry.error || null
  };
}

async function sendAuditLog(entry = {}, sender = {}) {
  const config = getSupabaseAuditConfig();
  const normalizedEntry = normalizeAuditEntry(entry, sender);
  const response = await fetch(config.endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": config.anonKey,
      "Authorization": `Bearer ${config.anonKey}`
    },
    body: JSON.stringify(normalizedEntry)
  });

  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error(`Supabase audit log write failed: ${response.status} ${message}`.trim());
  }

  return normalizedEntry;
}

function logAuditDeliveryError(error) {
  console.warn(error?.message || "Sidekick audit log was not delivered to Supabase.");
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
    .then(() => {
      void sendAuditLog({
        eventType: "extension.installed",
        action: "Side panel behavior set",
        severity: "info"
      }).catch(logAuditDeliveryError);
    })
    .catch(error => {
      console.error(error);
      void sendAuditLog({
        eventType: "extension.error",
        action: "Failed to set side panel behavior",
        severity: "error",
        error: {
          name: error?.name || "Error",
          message: error?.message || String(error)
        }
      }).catch(logAuditDeliveryError);
    });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type !== AUDIT_MESSAGE_TYPE) return false;

  sendAuditLog(message.entry, sender)
    .then(entry => sendResponse({ ok: true, entryId: entry.id }))
    .catch(error => {
      console.error(error);
      sendResponse({
        ok: false,
        message: error?.message || "Failed to write audit log to Supabase."
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
    void sendAuditLog({
      eventType: "extension.action.clicked",
      action: "Opened CRM Sidekick",
      severity: "info",
      metadata: { tabId: tab.id, tabUrl: tab.url || "" }
    }).catch(logAuditDeliveryError);
  } catch (error) {
    console.error(error);
    void sendAuditLog({
      eventType: "extension.error",
      action: "Failed to open CRM Sidekick",
      severity: "error",
      metadata: { tabId: tab.id, tabUrl: tab.url || "" },
      error: {
        name: error?.name || "Error",
        message: error?.message || String(error)
      }
    }).catch(logAuditDeliveryError);
  }

  // IMPORTANT: do NOT call chrome.sidePanel.open() here
});
