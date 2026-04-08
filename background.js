// background.js

const SIDEKICK_NATIVE_HOST = "com.sidekick.helper";
const NATIVE_RESPONSE_TIMEOUT_MS = 120000;

let nativePort = null;
let nativeInitialized = false;
let nativeInitPromise = null;
const pendingNativeRequests = new Map();

function cleanupPendingNativeRequests(errorMessage) {
  for (const pending of pendingNativeRequests.values()) {
    clearTimeout(pending.timeoutId);
    pending.reject(new Error(errorMessage));
  }
  pendingNativeRequests.clear();
}

function handleNativePortMessage(message) {
  if (!message || typeof message !== "object") return;

  const requestId = typeof message.requestId === "string" ? message.requestId : "";
  if (!requestId || !pendingNativeRequests.has(requestId)) return;

  const pending = pendingNativeRequests.get(requestId);
  pendingNativeRequests.delete(requestId);
  clearTimeout(pending.timeoutId);

  if (message.type === "zip_complete") {
    pending.resolve(message);
    return;
  }

  if (message.type === "zip_error") {
    pending.reject(new Error(message.error || "Native zip request failed."));
    return;
  }

  pending.reject(new Error(`Unexpected native response type: ${message.type || "(empty)"}`));
}

function handleNativePortDisconnect() {
  const nativeError = chrome.runtime.lastError?.message || "Native messaging port disconnected.";
  cleanupPendingNativeRequests(nativeError);
  nativePort = null;
  nativeInitialized = false;
  nativeInitPromise = null;
}

function getNativePort() {
  if (nativePort) return nativePort;

  nativePort = chrome.runtime.connectNative(SIDEKICK_NATIVE_HOST);
  nativePort.onMessage.addListener(handleNativePortMessage);
  nativePort.onDisconnect.addListener(handleNativePortDisconnect);
  nativeInitialized = false;
  return nativePort;
}

function postNativeMessageAwaitingResponse(message, expectedType) {
  return new Promise((resolve, reject) => {
    const requestId = typeof message.requestId === "string" && message.requestId
      ? message.requestId
      : `${expectedType}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

    const timeoutId = setTimeout(() => {
      pendingNativeRequests.delete(requestId);
      reject(new Error(`Timed out waiting for native response "${expectedType}".`));
    }, NATIVE_RESPONSE_TIMEOUT_MS);

    pendingNativeRequests.set(requestId, { resolve, reject, timeoutId });
    try {
      const port = getNativePort();
      port.postMessage({ ...message, requestId });
    } catch (error) {
      clearTimeout(timeoutId);
      pendingNativeRequests.delete(requestId);
      reject(error instanceof Error ? error : new Error(String(error)));
    }
  }).then(response => {
    if (response?.type !== expectedType) {
      throw new Error(`Expected "${expectedType}" but received "${response?.type || "(empty)"}".`);
    }
    return response;
  });
}

async function initializeNativeBridge() {
  if (nativeInitialized) return { ok: true };
  if (!nativeInitPromise) {
    nativeInitPromise = (async () => {
      await postNativeMessageAwaitingResponse(
        { type: "initialize" },
        "initialize_complete"
      );
      nativeInitialized = true;
      return { ok: true };
    })().catch(error => {
      nativeInitPromise = null;
      throw error;
    });
  }
  return nativeInitPromise;
}

async function runNativeZipRequest(filePaths, zipName = "") {
  const filteredPaths = Array.isArray(filePaths)
    ? filePaths.filter(path => typeof path === "string" && path.trim())
    : [];
  if (!filteredPaths.length) {
    throw new Error("Native zip_request requires at least one absolute file path.");
  }
  await initializeNativeBridge();
  return postNativeMessageAwaitingResponse(
    {
      type: "zip_request",
      zipName,
      filePaths: filteredPaths
    },
    "zip_complete"
  );
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
    .catch(console.error);
});

chrome.action.onClicked.addListener(async tab => {
  if (!tab?.id) return;

  await chrome.sidePanel.setOptions({
    tabId: tab.id,
    path: "panel.html",
    enabled: true
  }).catch(console.error);
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === "NATIVE_BRIDGE_INITIALIZE") {
    initializeNativeBridge()
      .then(() => sendResponse({ ok: true }))
      .catch(error => sendResponse({ ok: false, message: error?.message || "Native initialize failed." }));
    return true;
  }

  if (message?.type === "NATIVE_ZIP_REQUEST") {
    runNativeZipRequest(message.filePaths, message.zipName)
      .then(response => sendResponse({ ok: true, response }))
      .catch(error => sendResponse({ ok: false, message: error?.message || "Native zip_request failed." }));
    return true;
  }

  return false;
});
