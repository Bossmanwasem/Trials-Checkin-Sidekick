// Sidekick role permissions and audit logging.
(() => {
  const INSTALL_KEY = "__ttmtSidekickAccessInstalled";
  if (window[INSTALL_KEY]) return;
  window[INSTALL_KEY] = true;

  const DEFAULT_ROLE_ID = "deviceCoordinator";
  const ROLE_STORAGE_KEY = "ttmtSidekickUserRole";
  const AUDIT_MESSAGE_TYPE = "SIDEKICK_AUDIT_LOG";
  const AUDIT_STORAGE_KEY = "ttmtSidekickAuditLog";
  const LOCAL_AUDIT_LIMIT = 500;
  const HANDLE_DB = "ttmtSidekickHandles";
  const HANDLE_STORE = "handles";
  const LOGS_HANDLE_KEY = "logsFolder";

  const SIDEKICK_ROLES = Object.freeze({
    deviceCoordinator: Object.freeze({
      id: "deviceCoordinator",
      name: "Device Coordinator",
      description: "Full access to every Sidekick tool currently available.",
      tools: Object.freeze(["*"])
    }),
    trialsPreprep: Object.freeze({
      id: "trialsPreprep",
      name: "Trials Preprep",
      description: "Reserved for the separate Trials Preprep tool set that will be designed later.",
      tools: Object.freeze([])
    })
  });

  const SIDEKICK_TOOLS = Object.freeze([
    { id: "crmNavigator", label: "CRM Navigator", selectors: ["#landingCrmNavigatorForm", "#qaCrmNavigatorForm"] },
    { id: "deviceLookup", label: "Device Number Lookup Sidekick", selectors: ["#deviceLookupBtn", "#deviceLookupForm", "#lookupOpenCrmBtn", "#lookupBeginLtlUpdateBtn", "#lookupOpenWorkbookBtn"] },
    { id: "checkin", label: "Check-in Sidekick", selectors: ["#startCheckinBtn", "#checkinForm", "#submitBtn", "#finishCheckinBtn", "#startAnotherBtn"] },
    { id: "ltlUpdate", label: "LTL Update Sidekick", selectors: ["#startLtlUpdateBtn", "#ltlCompletionRunBtn", "#ltlCompletionReturnBtn"] },
    { id: "gridSidekick", label: "Grid Sidekick", selectors: ["#gridSidekickBtn", "#gridRefreshBtn", "#gridRegisterLicenseBtn", "#gridLockChangesBtn"] },
    { id: "ageCalculator", label: "Age Calculator", selectors: ["#ageCalculatorBtn", "#ageCalculatorForm"] },
    { id: "talkPadPrep", label: "TalkPad Prep Sidekick", selectors: ["#talkPadPrepBtn", "#prepTypeSlBtn", "#prepTypeClBtn", "#prepSlCrmForm", "#prepFinishBtn"] },
    { id: "gridPadPrep", label: "GridPad Prep Sidekick", selectors: ["#gridPadPrepBtn", "#gridPadPrepFinishBtn"] },
    { id: "qaForm", label: "QA Form", selectors: ["#qaFormBtn", "#qaFinishedBtn", "#qaReturnBtn"] },
    { id: "trialLinks", label: "Trials Links", selectors: ["#appOverridesBtn", "#kgRequestsBtn", "#touchchatOverrideBtn", "#p2gOverrideBtn"] },
    { id: "dailyCounters", label: "Daily task counter", selectors: ["#dailyCounterSection", "#clearDailyCountersBtn", "#toggleDailyCounterBtn", "[data-counter][data-delta]"] },
    { id: "weeklyCounters", label: "Weekly task counter", selectors: ["#weeklyCounterSection", "#clearWeeklyCountersBtn", "#toggleWeeklyCounterBtn", "[data-weekly-delta]"] },
    { id: "userSettings", label: "User settings", selectors: ["#themeMenuBtn", "#settingsView", "#settingsReturnBtn", "#editUserProfileBtn"] },
    { id: "themeBuilder", label: "Theme builder", selectors: ["#openThemeBuilderBtn", "#themeBuilderView"] },
    { id: "workbookConnections", label: "SharePoint workbook connections", selectors: ["[data-workbook-connect]", "[data-workbook-open]"] },
    { id: "outlookSetup", label: "Outlook setup", selectors: ["#beginOutlookSetupBtn", "#finishOutlookSetupBtn"] },
    { id: "smartboxRepair", label: "Smartbox Repair Tracker", selectors: ["#openSmartboxRepairBtn", "#smartboxContinueBtn"] },
    { id: "inventory", label: "Manage Inventory", selectors: ["#inventoryNextStepBtn"] },
    { id: "dafRecap", label: "DAF Recap", selectors: ["#dafRecapView", "#finishCheckinBtn"] },
    { id: "emailFallback", label: "Email fallback", selectors: ["#emailView"] }
  ]);

  let currentRoleId = DEFAULT_ROLE_ID;
  let applyingPermissions = false;

  function hasChromeStorage() {
    return typeof chrome !== "undefined" && Boolean(chrome.storage?.local);
  }

  function storageGet(keys) {
    return new Promise(resolve => {
      if (!hasChromeStorage()) {
        resolve({});
        return;
      }
      chrome.storage.local.get(keys, result => resolve(result || {}));
    });
  }

  function storageSet(values) {
    return new Promise(resolve => {
      if (!hasChromeStorage()) {
        resolve();
        return;
      }
      chrome.storage.local.set(values, () => resolve());
    });
  }

  function normalizeRoleId(roleId) {
    const safe = String(roleId || "").trim();
    if (SIDEKICK_ROLES[safe]) return safe;
    const compact = safe.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (compact === "devicecoordinator") return "deviceCoordinator";
    if (compact === "trialspreprep") return "trialsPreprep";
    return DEFAULT_ROLE_ID;
  }

  async function getCurrentRole() {
    const result = await storageGet(ROLE_STORAGE_KEY);
    const roleId = normalizeRoleId(result[ROLE_STORAGE_KEY]);
    currentRoleId = roleId;
    if (result[ROLE_STORAGE_KEY] !== roleId) {
      await storageSet({ [ROLE_STORAGE_KEY]: roleId });
    }
    return SIDEKICK_ROLES[roleId] || SIDEKICK_ROLES[DEFAULT_ROLE_ID];
  }

  async function setCurrentRole(roleId) {
    const nextRoleId = normalizeRoleId(roleId);
    await storageSet({ [ROLE_STORAGE_KEY]: nextRoleId });
    currentRoleId = nextRoleId;
    await applyRolePermissions();
    await emitAuditLog({
      eventType: "permission.role.changed",
      severity: "info",
      action: "Role changed",
      metadata: { roleId: nextRoleId, roleName: SIDEKICK_ROLES[nextRoleId].name }
    });
    return SIDEKICK_ROLES[nextRoleId];
  }

  function roleAllowsTool(role, toolId) {
    if (!role) return false;
    if (role.tools.includes("*")) return true;
    return role.tools.includes(toolId);
  }

  function getActiveViewId() {
    const visibleView = Array.from(document.querySelectorAll(".container[id]")).find(view => {
      const style = window.getComputedStyle(view);
      return style.display !== "none" && style.visibility !== "hidden";
    });
    return visibleView?.id || "";
  }

  function getProfileLabel() {
    const greeting = document.getElementById("landingGreeting")?.textContent?.trim();
    const onboardingName = document.getElementById("userFirstName")?.value?.trim();
    return greeting || onboardingName || "";
  }

  function limitText(value, maxLength = 160) {
    const text = String(value ?? "").replace(/\s+/g, " ").trim();
    if (text.length <= maxLength) return text;
    return `${text.slice(0, maxLength)}...`;
  }

  function serializeError(value) {
    if (value instanceof Error) {
      return {
        name: value.name,
        message: value.message,
        stack: value.stack
      };
    }
    if (typeof value === "string") return { message: limitText(value, 500) };
    try {
      return { message: limitText(JSON.stringify(value), 500) };
    } catch {
      return { message: String(value) };
    }
  }

  function createAuditEntry(entry) {
    const role = SIDEKICK_ROLES[currentRoleId] || SIDEKICK_ROLES[DEFAULT_ROLE_ID];
    return {
      id: typeof crypto?.randomUUID === "function" ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
      timestamp: new Date().toISOString(),
      source: window.top === window ? "sidekick-shell" : "sidekick-panel",
      severity: entry.severity || "info",
      eventType: entry.eventType || "user.action",
      action: entry.action || "",
      viewId: entry.viewId ?? getActiveViewId(),
      roleId: role.id,
      roleName: role.name,
      profileLabel: entry.profileLabel ?? getProfileLabel(),
      toolId: entry.toolId || "",
      toolLabel: entry.toolLabel || "",
      metadata: entry.metadata || {},
      error: entry.error || null
    };
  }

  async function appendLocalAuditLog(entry) {
    const result = await storageGet(AUDIT_STORAGE_KEY);
    const existing = Array.isArray(result[AUDIT_STORAGE_KEY]) ? result[AUDIT_STORAGE_KEY] : [];
    const next = [...existing, entry].slice(-LOCAL_AUDIT_LIMIT);
    await storageSet({ [AUDIT_STORAGE_KEY]: next });
  }

  function openHandleDb() {
    return new Promise((resolve, reject) => {
      if (!("indexedDB" in window)) {
        resolve(null);
        return;
      }
      const request = indexedDB.open(HANDLE_DB, 1);
      request.onerror = () => reject(request.error);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(HANDLE_STORE)) {
          db.createObjectStore(HANDLE_STORE);
        }
      };
      request.onsuccess = () => resolve(request.result);
    });
  }

  async function getStoredDirectoryHandle(key) {
    const db = await openHandleDb().catch(() => null);
    if (!db) return null;
    return new Promise(resolve => {
      const transaction = db.transaction(HANDLE_STORE, "readonly");
      const store = transaction.objectStore(HANDLE_STORE);
      const request = store.get(key);
      request.onerror = () => resolve(null);
      request.onsuccess = () => {
        const value = request.result;
        resolve(value?.handle || value || null);
      };
      transaction.oncomplete = () => db.close();
      transaction.onerror = () => {
        db.close();
        resolve(null);
      };
    });
  }

  async function writeEntryToLogsFolder(entry) {
    if (!("FileSystemDirectoryHandle" in window)) return false;
    const handle = await getStoredDirectoryHandle(LOGS_HANDLE_KEY);
    if (!handle || typeof handle.getFileHandle !== "function") return false;

    const permission = typeof handle.queryPermission === "function"
      ? await handle.queryPermission({ mode: "readwrite" })
      : "granted";
    if (permission !== "granted") return false;

    const day = entry.timestamp.slice(0, 10);
    const fileHandle = await handle.getFileHandle(`sidekick-audit-${day}.jsonl`, { create: true });
    const file = await fileHandle.getFile();
    const writable = await fileHandle.createWritable({ keepExistingData: true });
    await writable.seek(file.size);
    await writable.write(`${JSON.stringify(entry)}\n`);
    await writable.close();
    return true;
  }

  async function emitAuditLog(rawEntry) {
    const entry = createAuditEntry(rawEntry || {});
    void writeEntryToLogsFolder(entry).catch(() => false);

    if (typeof chrome !== "undefined" && chrome.runtime?.sendMessage) {
      try {
        await chrome.runtime.sendMessage({ type: AUDIT_MESSAGE_TYPE, entry });
        return entry;
      } catch {
        await appendLocalAuditLog(entry);
        return entry;
      }
    }

    await appendLocalAuditLog(entry);
    return entry;
  }

  function emitErrorLog(action, error, metadata = {}) {
    return emitAuditLog({
      eventType: "error",
      severity: "error",
      action,
      metadata,
      error: serializeError(error)
    });
  }

  function selectorForTool(tool) {
    return tool.selectors.join(",");
  }

  function getToolForElement(element) {
    if (!element?.closest) return null;
    return SIDEKICK_TOOLS.find(tool => {
      try {
        return Boolean(element.closest(selectorForTool(tool)));
      } catch {
        return false;
      }
    }) || null;
  }

  function setDisabledState(element, disabled) {
    const targets = element.matches("form, section, div")
      ? [element, ...element.querySelectorAll("button, input, select, textarea, a")]
      : [element];

    targets.forEach(target => {
      target.dataset.sidekickPermissionManaged = "true";
      if (disabled) {
        target.setAttribute("aria-disabled", "true");
        target.classList.add("sidekick-permission-denied");
        if ("disabled" in target) target.disabled = true;
        return;
      }
      target.removeAttribute("aria-disabled");
      target.classList.remove("sidekick-permission-denied");
      if (target.dataset.sidekickPermissionManaged === "true" && "disabled" in target) {
        target.disabled = false;
      }
    });
  }

  async function applyRolePermissions() {
    if (applyingPermissions) return;
    applyingPermissions = true;
    try {
      const role = await getCurrentRole();
      SIDEKICK_TOOLS.forEach(tool => {
        const allowed = roleAllowsTool(role, tool.id);
        tool.selectors.forEach(selector => {
          document.querySelectorAll(selector).forEach(element => {
            element.dataset.sidekickTool = tool.id;
            element.dataset.sidekickToolLabel = tool.label;
            setDisabledState(element, !allowed);
          });
        });
      });
    } finally {
      applyingPermissions = false;
    }
  }

  function describeActionElement(target) {
    const actionable = target?.closest?.("button, a, input, select, textarea, form, [role='button']");
    if (!actionable) return null;
    const tagName = actionable.tagName.toLowerCase();
    const type = actionable.getAttribute("type") || "";
    const label = actionable.getAttribute("aria-label")
      || actionable.dataset.tooltip
      || actionable.textContent
      || actionable.value
      || actionable.name
      || actionable.id
      || tagName;
    return {
      id: actionable.id || "",
      tagName,
      type,
      name: actionable.getAttribute("name") || "",
      label: limitText(label, 140)
    };
  }

  function installActionCapture() {
    document.addEventListener("click", event => {
      const actionElement = describeActionElement(event.target);
      if (!actionElement) return;

      const tool = getToolForElement(event.target);
      const role = SIDEKICK_ROLES[currentRoleId] || SIDEKICK_ROLES[DEFAULT_ROLE_ID];
      if (tool && !roleAllowsTool(role, tool.id)) {
        event.preventDefault();
        event.stopImmediatePropagation();
        void emitAuditLog({
          eventType: "permission.denied",
          severity: "warn",
          action: `Blocked ${tool.label}`,
          toolId: tool.id,
          toolLabel: tool.label,
          metadata: { element: actionElement }
        });
        alert(`${role.name} does not have access to ${tool.label}.`);
        return;
      }

      void emitAuditLog({
        eventType: "user.click",
        action: actionElement.label || "Clicked",
        toolId: tool?.id || "",
        toolLabel: tool?.label || "",
        metadata: { element: actionElement }
      });
    }, true);

    document.addEventListener("submit", event => {
      const form = event.target;
      const tool = getToolForElement(form);
      void emitAuditLog({
        eventType: "user.submit",
        action: form.id || "Form submitted",
        toolId: tool?.id || "",
        toolLabel: tool?.label || "",
        metadata: { formId: form.id || "", fieldCount: form.elements?.length || 0 }
      });
    }, true);

    document.addEventListener("change", event => {
      const input = event.target;
      if (!input?.matches?.("input, select, textarea")) return;
      const tool = getToolForElement(input);
      const safeType = input.getAttribute("type") || input.tagName.toLowerCase();
      const metadata = {
        id: input.id || "",
        name: input.getAttribute("name") || "",
        type: safeType
      };
      if (safeType === "checkbox" || safeType === "radio") {
        metadata.checked = Boolean(input.checked);
      } else if (input.tagName === "SELECT") {
        metadata.selectedIndex = input.selectedIndex;
      } else {
        metadata.hasValue = Boolean(input.value);
      }
      void emitAuditLog({
        eventType: "user.change",
        action: input.id || input.name || "Field changed",
        toolId: tool?.id || "",
        toolLabel: tool?.label || "",
        metadata
      });
    }, true);
  }

  function wrapMethod(target, methodName, describeCall) {
    if (!target || typeof target[methodName] !== "function") return;
    const original = target[methodName].bind(target);
    if (original.__sidekickAuditWrapped) return;

    const wrapped = function sidekickAuditWrappedMethod(...args) {
      try {
        const description = describeCall(args);
        if (description) void emitAuditLog(description);
      } catch {
        // Logging should never block the original extension behavior.
      }

      try {
        return original(...args);
      } catch (error) {
        void emitErrorLog(`Chrome API failed: ${methodName}`, error, { methodName });
        throw error;
      }
    };
    wrapped.__sidekickAuditWrapped = true;
    target[methodName] = wrapped;
  }

  function installChromeApiAudit() {
    if (typeof chrome === "undefined") return;

    wrapMethod(chrome.tabs, "create", args => ({
      eventType: "chrome.tabs.create",
      action: "Opened tab",
      metadata: { url: limitText(args[0]?.url || "", 220) }
    }));

    wrapMethod(chrome.tabs, "sendMessage", args => ({
      eventType: "chrome.tabs.sendMessage",
      action: "Sent message to page",
      metadata: { tabId: args[0] || null, messageType: args[1]?.type || "" }
    }));

    wrapMethod(chrome.runtime, "sendMessage", args => {
      if (args[0]?.type === AUDIT_MESSAGE_TYPE) return null;
      return {
        eventType: "chrome.runtime.sendMessage",
        action: "Sent runtime message",
        metadata: { messageType: args[0]?.type || "" }
      };
    });

    wrapMethod(chrome.downloads, "download", args => ({
      eventType: "chrome.downloads.download",
      action: "Started download",
      metadata: { filename: args[0]?.filename || "", url: limitText(args[0]?.url || "", 220) }
    }));
  }

  function installErrorAudit() {
    const originalError = console.error.bind(console);
    const originalWarn = console.warn.bind(console);

    console.error = (...args) => {
      void emitErrorLog("Console error", args.map(serializeError));
      originalError(...args);
    };

    console.warn = (...args) => {
      void emitAuditLog({
        eventType: "console.warn",
        severity: "warn",
        action: "Console warning",
        metadata: { messages: args.map(arg => serializeError(arg).message) }
      });
      originalWarn(...args);
    };

    window.addEventListener("error", event => {
      void emitErrorLog("Unhandled error", event.error || event.message, {
        filename: event.filename || "",
        lineno: event.lineno || 0,
        colno: event.colno || 0
      });
    });

    window.addEventListener("unhandledrejection", event => {
      void emitErrorLog("Unhandled promise rejection", event.reason);
    });
  }

  function schedulePermissionRefresh() {
    let timeoutId = null;
    const refresh = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => void applyRolePermissions(), 80);
    };
    const observer = new MutationObserver(refresh);
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }

  function injectAccessIntoPanelFrame(frame) {
    try {
      const doc = frame.contentDocument;
      if (!doc || doc.getElementById("sidekickAccessScript")) return;
      const script = doc.createElement("script");
      script.id = "sidekickAccessScript";
      script.src = chrome.runtime.getURL("sidekick-access.js");
      doc.documentElement.appendChild(script);
      void emitAuditLog({
        eventType: "panel.frame.loaded",
        action: "Loaded Sidekick panel frame"
      });
    } catch (error) {
      void emitErrorLog("Failed to install Sidekick access layer in panel frame", error);
    }
  }

  function initShellIfPresent() {
    const frame = document.getElementById("sidekickPanelFrame");
    if (!frame) return false;
    frame.addEventListener("load", () => injectAccessIntoPanelFrame(frame));
    if (frame.contentDocument?.readyState === "complete") {
      injectAccessIntoPanelFrame(frame);
    }
    return true;
  }

  async function initPanelAccess() {
    await getCurrentRole();
    installErrorAudit();
    installChromeApiAudit();
    installActionCapture();
    await applyRolePermissions();
    schedulePermissionRefresh();
    void emitAuditLog({
      eventType: "permission.ready",
      action: "Sidekick permission and audit layer ready"
    });
  }

  window.SidekickAccess = {
    roles: SIDEKICK_ROLES,
    tools: SIDEKICK_TOOLS,
    defaultRoleId: DEFAULT_ROLE_ID,
    getCurrentRole,
    setCurrentRole,
    canUseTool: toolId => roleAllowsTool(SIDEKICK_ROLES[currentRoleId], toolId),
    applyRolePermissions,
    logAction: emitAuditLog,
    logError: emitErrorLog
  };

  if (!initShellIfPresent()) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => void initPanelAccess(), { once: true });
    } else {
      void initPanelAccess();
    }
  }
})();
