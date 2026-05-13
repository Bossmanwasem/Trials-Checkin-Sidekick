// background.js

try {
  importScripts("sidekick-supabase-config.js");
} catch (error) {
  console.warn("Sidekick Supabase config was not loaded.", error);
}

const SIDE_PANEL_PATH = "panel-shell.html";
const AUDIT_MESSAGE_TYPE = "SIDEKICK_AUDIT_LOG";
const AUTH_UPSERT_MESSAGE_TYPE = "SIDEKICK_AUTH_UPSERT_SESSION";
const AUTH_GET_SESSION_MESSAGE_TYPE = "SIDEKICK_AUTH_GET_SESSION";
const AUTH_SIGN_OUT_MESSAGE_TYPE = "SIDEKICK_AUTH_SIGN_OUT";
const AUTH_CLAIM_ADMIN_MESSAGE_TYPE = "SIDEKICK_AUTH_CLAIM_ADMIN";
const ADMIN_ACTION_MESSAGE_TYPE = "SIDEKICK_ADMIN_ACTION";
const AUTH_SESSION_STORAGE_KEY = "ttmtSidekickSupabaseSession";
const DEFAULT_AUDIT_FUNCTION_NAME = "sidekick-audit-log";
const DEFAULT_ADMIN_FUNCTION_NAME = "sidekick-admin-tools";

function getSupabaseConfig() {
  const config = self.SidekickSupabaseConfig || {};
  const projectUrl = String(config.projectUrl || "").replace(/\/+$/, "");
  const anonKey = String(config.anonKey || "");

  if (!projectUrl || !anonKey) {
    throw new Error("Sidekick Supabase is not configured.");
  }

  return {
    projectUrl,
    anonKey,
    auditFunctionName: String(config.auditFunctionName || DEFAULT_AUDIT_FUNCTION_NAME),
    adminFunctionName: String(config.adminFunctionName || DEFAULT_ADMIN_FUNCTION_NAME)
  };
}

function getSupabaseAuditConfig() {
  const config = getSupabaseConfig();

  return {
    endpoint: `${config.projectUrl}/functions/v1/${config.auditFunctionName}`,
    anonKey: config.anonKey
  };
}

function storageGet(keys) {
  return new Promise(resolve => {
    chrome.storage.local.get(keys, result => resolve(result || {}));
  });
}

function storageSet(values) {
  return new Promise(resolve => {
    chrome.storage.local.set(values, () => resolve());
  });
}

function storageRemove(keys) {
  return new Promise(resolve => {
    chrome.storage.local.remove(keys, () => resolve());
  });
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

function getErrorMessage(data, fallback) {
  if (!data) return fallback;
  return data.error_description || data.msg || data.message || data.error || fallback;
}

async function supabaseAuthFetch(path, { method = "POST", body = null, accessToken = "" } = {}) {
  const config = getSupabaseConfig();
  const response = await fetch(`${config.projectUrl}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      "apikey": config.anonKey,
      "Authorization": `Bearer ${accessToken || config.anonKey}`
    },
    body: body ? JSON.stringify(body) : null
  });
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(getErrorMessage(data, `Supabase Auth request failed: ${response.status}`));
  }

  return data;
}

function normalizeSession(data = {}) {
  if (!data.access_token) return null;
  const now = Math.floor(Date.now() / 1000);
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token || "",
    token_type: data.token_type || "bearer",
    expires_at: data.expires_at || now + Number(data.expires_in || 3600),
    user: data.user || null
  };
}

async function storeAuthSession(data = {}, roleResult = null) {
  const session = normalizeSession(data);
  if (!session) {
    return {
      ok: true,
      session: null,
      user: data.user || null,
      role: roleResult?.role || ""
    };
  }

  if (roleResult?.user) {
    session.user = roleResult.user;
  }

  await storageSet({ [AUTH_SESSION_STORAGE_KEY]: session });

  return {
    ok: true,
    session,
    user: session.user,
    role: roleResult?.role || getSidekickRole(session.user)
  };
}

function getSidekickRole(user = null) {
  const metadata = user?.app_metadata || {};
  return metadata.sidekick_role || metadata.role || "deviceCoordinator";
}

async function getStoredAuthSession() {
  const result = await storageGet(AUTH_SESSION_STORAGE_KEY);
  return result[AUTH_SESSION_STORAGE_KEY] || null;
}

async function clearAuthSession() {
  await storageRemove(AUTH_SESSION_STORAGE_KEY);
}

async function refreshAuthSession(session) {
  if (!session?.refresh_token) return null;
  const data = await supabaseAuthFetch("/auth/v1/token?grant_type=refresh_token", {
    body: { refresh_token: session.refresh_token }
  });
  const stored = await storeAuthSession(data);
  return stored.session;
}

async function getCurrentAuthSession({ refreshIfNeeded = true } = {}) {
  const session = await getStoredAuthSession();
  if (!session) return null;
  const now = Math.floor(Date.now() / 1000);
  if (!refreshIfNeeded || Number(session.expires_at || 0) > now + 60) {
    return session;
  }

  try {
    return await refreshAuthSession(session);
  } catch {
    await clearAuthSession();
    return null;
  }
}

async function callAdminFunction(action, payload = {}, sessionOverride = null) {
  const config = getSupabaseConfig();
  const session = sessionOverride || await getCurrentAuthSession();
  if (!session?.access_token) {
    throw new Error("Sign in to Supabase before using admin tools.");
  }

  const response = await fetch(`${config.projectUrl}/functions/v1/${config.adminFunctionName}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": config.anonKey,
      "Authorization": `Bearer ${session.access_token}`
    },
    body: JSON.stringify({ action, ...payload })
  });
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(getErrorMessage(data, `Sidekick admin request failed: ${response.status}`));
  }

  return data;
}

async function upsertAuthSession({ email, password, adminKey, displayName } = {}) {
  const safeEmail = String(email || "").trim();
  const safePassword = String(password || "");
  if (!safeEmail || !safePassword) {
    throw new Error("Email and password are required for Supabase sign-in.");
  }

  let authData;
  try {
    authData = await supabaseAuthFetch("/auth/v1/token?grant_type=password", {
      body: { email: safeEmail, password: safePassword }
    });
  } catch {
    authData = await supabaseAuthFetch("/auth/v1/signup", {
      body: {
        email: safeEmail,
        password: safePassword,
        data: { display_name: displayName || "" }
      }
    });
  }

  const initial = await storeAuthSession(authData);
  if (!initial.session) {
    return {
      ...initial,
      message: "Check your email to confirm your Supabase account, then sign in again."
    };
  }

  const roleResult = await callAdminFunction("ensure-profile", { adminKey, displayName }, initial.session);
  let refreshedSession = initial.session;
  if (initial.session.refresh_token) {
    refreshedSession = await refreshAuthSession(initial.session).catch(() => initial.session);
  }

  if (roleResult?.user && refreshedSession) {
    refreshedSession.user = roleResult.user;
    await storageSet({ [AUTH_SESSION_STORAGE_KEY]: refreshedSession });
  }

  return {
    ok: true,
    session: refreshedSession,
    user: roleResult?.user || refreshedSession?.user || initial.user,
    role: roleResult?.role || getSidekickRole(refreshedSession?.user || initial.user)
  };
}

async function claimAdminRole(adminKey) {
  const result = await callAdminFunction("claim-admin", { adminKey });
  const session = await getCurrentAuthSession({ refreshIfNeeded: false });
  if (session?.refresh_token) {
    await refreshAuthSession(session).catch(() => null);
  }
  return result;
}

async function signOutAuthSession() {
  const session = await getCurrentAuthSession({ refreshIfNeeded: false });
  if (session?.access_token) {
    await supabaseAuthFetch("/auth/v1/logout", {
      method: "POST",
      accessToken: session.access_token
    }).catch(() => null);
  }
  await clearAuthSession();
  return { ok: true };
}

function respondWith(promise, sendResponse) {
  promise
    .then(result => sendResponse({ ok: true, ...result }))
    .catch(error => {
      console.error(error);
      sendResponse({
        ok: false,
        message: error?.message || "Sidekick request failed."
      });
    });
  return true;
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
  if (message?.type === AUDIT_MESSAGE_TYPE) {
    return respondWith(
      sendAuditLog(message.entry, sender).then(entry => ({ entryId: entry.id })),
      sendResponse
    );
  }

  if (message?.type === AUTH_UPSERT_MESSAGE_TYPE) {
    return respondWith(upsertAuthSession(message), sendResponse);
  }

  if (message?.type === AUTH_GET_SESSION_MESSAGE_TYPE) {
    return respondWith(
      getCurrentAuthSession().then(session => ({
        session,
        user: session?.user || null,
        role: getSidekickRole(session?.user || null)
      })),
      sendResponse
    );
  }

  if (message?.type === AUTH_CLAIM_ADMIN_MESSAGE_TYPE) {
    return respondWith(claimAdminRole(message.adminKey), sendResponse);
  }

  if (message?.type === AUTH_SIGN_OUT_MESSAGE_TYPE) {
    return respondWith(signOutAuthSession(), sendResponse);
  }

  if (message?.type === ADMIN_ACTION_MESSAGE_TYPE) {
    return respondWith(callAdminFunction(message.action, message.payload || {}), sendResponse);
  }

  return false;
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
