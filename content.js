// content.js

/* ---------------- Utilities ---------------- */

function getElementByXPath(xpath) {
  try {
    return document.evaluate(
      xpath,
      document,
      null,
      XPathResult.FIRST_ORDERED_NODE_TYPE,
      null
    ).singleNodeValue;
  } catch {
    return null;
  }
}

function isVisible(el) {
  if (!el) return false;
  const style = window.getComputedStyle(el);
  return (
    style.display !== "none" &&
    style.visibility !== "hidden" &&
    (el.offsetParent !== null || style.position === "fixed")
  );
}

function waitForElementByXPath(
  xpath,
  { timeoutMs = 7000, pollMs = 150, visibleOnly = false } = {}
) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const check = () => {
      const el = getElementByXPath(xpath);
      if (el && (!visibleOnly || isVisible(el))) {
        resolve(el);
        return;
      }
      if (Date.now() - start >= timeoutMs) {
        reject(new Error("Timed out waiting for element: " + xpath));
        return;
      }
      setTimeout(check, pollMs);
    };
    check();
  });
}

function dispatchChangeEvents(el, value = "") {
  if (typeof InputEvent === "function") {
    el.dispatchEvent(new InputEvent("input", { bubbles: true, data: value, inputType: "insertText" }));
  } else {
    el.dispatchEvent(new Event("input", { bubbles: true }));
  }
  el.dispatchEvent(new Event("change", { bubbles: true }));
  el.dispatchEvent(new Event("focusout", { bubbles: true }));
}

function setNativeValue(el, value) {
  if (!el) return;
  const prototype = el.tagName === "TEXTAREA" ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  const descriptor = Object.getOwnPropertyDescriptor(prototype, "value");
  const previousValue = el.value;
  if (descriptor?.set) {
    descriptor.set.call(el, value);
  } else {
    el.value = value;
  }
  if (el._valueTracker) {
    el._valueTracker.setValue(previousValue);
  }
}

function resolveInputTarget(el) {
  if (!el) return null;
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) return el;
  return el.querySelector("input, textarea");
}

const UNSAFE_NAME_REGEX = /\s?(\*\d{5}|\*.*?\*|\(.*?\)|\b\d{5}\b|"[^"]*")/g;
const DAF_DATA_STORAGE_KEY = "ttmtLastCheckinForDaf";
const DAILY_COUNTER_STORAGE_KEY = "ttmtDailyTaskCounters";
const DAILY_COUNTER_ENABLED_STORAGE_KEY = "ttmtDailyTaskCounterEnabled";
const DAF_CONSULTANT_LISTBOX_XPATHS = [
  '//*[@id="CommonEditorCalloutId"]/div',
  '//*[@id="CommonEditorCalloutId"]/div/div',
  '//*[@id="CommonEditorCalloutId"]'
];
const DAF_AAC_FIELD_XPATH = "/html/body/div/div/div/form/div/div/div/div[6]/div/span/div/div/div/input";

function sanitizeName(name) {
  return (name || "").replace(UNSAFE_NAME_REGEX, "").trim();
}

function getStoredValue(key) {
  return new Promise(resolve => {
    if (chrome?.storage?.local) {
      chrome.storage.local.get(key, res => resolve(res?.[key] ?? null));
      return;
    }
    const raw = localStorage.getItem(key);
    if (!raw) {
      resolve(null);
      return;
    }
    try {
      resolve(JSON.parse(raw));
    } catch {
      resolve(raw);
    }
  });
}

function setStoredValue(key, value) {
  return new Promise(resolve => {
    if (chrome?.storage?.local) {
      chrome.storage.local.set({ [key]: value }, () => resolve());
      return;
    }
    localStorage.setItem(key, JSON.stringify(value));
    resolve();
  });
}

function getDefaultDailyCounters() {
  return {
    checkins: 0,
    qas: 0,
    preps: 0,
    custom: 0
  };
}

async function getDailyCounterEnabled() {
  const stored = await getStoredValue(DAILY_COUNTER_ENABLED_STORAGE_KEY);
  if (stored === null || typeof stored === "undefined") return true;
  return Boolean(stored);
}

async function incrementDailyCounter(key) {
  const enabled = await getDailyCounterEnabled();
  if (!enabled) return null;
  const stored = await getStoredValue(DAILY_COUNTER_STORAGE_KEY);
  const counters = { ...getDefaultDailyCounters(), ...(stored || {}) };
  const nextValue = (counters[key] ?? 0) + 1;
  const updated = { ...counters, [key]: nextValue };
  await setStoredValue(DAILY_COUNTER_STORAGE_KEY, updated);
  return updated;
}

function safeTrimLower(str) {
  return (str || "").trim().toLowerCase();
}

function normalizeText(str) {
  return (str || "").replace(/\s+/g, " ").trim().toLowerCase();
}

function levenshteinDistance(a, b) {
  const first = a || "";
  const second = b || "";
  if (!first.length) return second.length;
  if (!second.length) return first.length;

  const matrix = Array.from({ length: first.length + 1 }, () => []);
  for (let i = 0; i <= first.length; i += 1) matrix[i][0] = i;
  for (let j = 0; j <= second.length; j += 1) matrix[0][j] = j;

  for (let i = 1; i <= first.length; i += 1) {
    for (let j = 1; j <= second.length; j += 1) {
      const cost = first[i - 1] === second[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  return matrix[first.length][second.length];
}

function scoreNameSimilarity(target, candidate) {
  const normalizedTarget = normalizeText(target);
  const normalizedCandidate = normalizeText(candidate);
  if (!normalizedTarget || !normalizedCandidate) return 0;
  if (normalizedTarget === normalizedCandidate) return 1;
  if (normalizedCandidate.includes(normalizedTarget) || normalizedTarget.includes(normalizedCandidate)) {
    return 0.9;
  }
  const distance = levenshteinDistance(normalizedTarget, normalizedCandidate);
  const maxLen = Math.max(normalizedTarget.length, normalizedCandidate.length);
  return maxLen ? 1 - distance / maxLen : 0;
}

function selectClosestConsultantFromListBox(listBox, targetName) {
  if (!listBox || !targetName) return false;

  const candidates = Array.from(
    listBox.querySelectorAll("[role='option'], li, div, span, button")
  ).filter(el => isVisible(el) && normalizeText(el.textContent));

  const seen = new Map();
  candidates.forEach(el => {
    const text = normalizeText(el.textContent);
    if (!seen.has(text)) seen.set(text, el);
  });

  const uniqueCandidates = Array.from(seen.entries()).map(([text, el]) => ({
    text,
    el
  }));

  if (!uniqueCandidates.length) return false;

  uniqueCandidates.sort((a, b) => {
    const aRole = a.el.getAttribute("role") === "option" ? 1 : 0;
    const bRole = b.el.getAttribute("role") === "option" ? 1 : 0;
    return bRole - aRole;
  });

  let best = null;
  let bestScore = 0;
  uniqueCandidates.forEach(candidate => {
    const score = scoreNameSimilarity(targetName, candidate.text);
    if (score > bestScore) {
      bestScore = score;
      best = candidate.el;
    }
  });

  if (!best || bestScore <= 0) return false;

  best.click();
  dispatchChangeEvents(best);
  return true;
}

/* ---------------- Existing CRM Data Grab ---------------- */

function getCrmIdFromUrl() {
  try {
    const url = new URL(window.location.href);
    return (url.searchParams.get("ID") || "").trim();
  } catch {
    return "";
  }
}

function getInputValueById(id) {
  const el = document.getElementById(id);
  return (el?.value || "").trim();
}

function getAacSelectedText() {
  const el = document.getElementById(
    "ctl00_MainContent_Tabs_tpClient_ClientTabs_tpClientInfo_ddlSalesperson"
  );
  if (!el || el.tagName !== "SELECT") return "";
  return el.options[el.selectedIndex]?.textContent?.trim() || "";
}

function collectClientData() {
  return {
    crmId: getCrmIdFromUrl(),
    firstName: sanitizeName(
      getInputValueById(
      "ctl00_MainContent_Tabs_tpClient_ClientTabs_tpClientInfo_txtClientFirstName"
      )
    ),
    lastName: sanitizeName(
      getInputValueById(
      "ctl00_MainContent_Tabs_tpClient_ClientTabs_tpClientInfo_txtClientLastName"
      )
    ),
    aac: getAacSelectedText()
  };
}

/* ---------------- DOM Actions ---------------- */

function setValueByXPath(xpath, value) {
  const el = getElementByXPath(xpath);
  if (!el) return false;

  const input = resolveInputTarget(el);
  if (input) {
    setNativeValue(input, value);
    dispatchChangeEvents(input, value);
    return true;
  }

  el.textContent = value;
  dispatchChangeEvents(el, value);
  return true;
}

function setDropdownByVisibleText(xpath, text) {
  const el = getElementByXPath(xpath);
  if (!el || el.tagName !== "SELECT") return false;

  const option = [...el.options].find(o => o.textContent.trim() === text);
  if (!option) return false;

  el.value = option.value;
  dispatchChangeEvents(el);
  return true;
}

function clickByXPath(xpath) {
  const el = getElementByXPath(xpath);
  if (!el) return false;
  el.click();
  return true;
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function waitForCondition(check, { timeoutMs = 7000, pollMs = 150 } = {}) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const tick = () => {
      try {
        const result = check();
        if (result) {
          resolve(result);
          return;
        }
      } catch (err) {
        reject(err);
        return;
      }
      if (Date.now() - start >= timeoutMs) {
        reject(new Error("Timed out waiting for condition."));
        return;
      }
      setTimeout(tick, pollMs);
    };
    tick();
  });
}

async function waitForEnabledElementByXPath(xpath, options = {}) {
  const el = await waitForElementByXPath(xpath, options);
  await waitForCondition(() => !el.disabled, options);
  return el;
}

async function setFileInputByXPath(xpath, file) {
  const input = await waitForElementByXPath(xpath);
  if (!input || !(input instanceof HTMLInputElement)) {
    throw new Error("File upload input not found.");
  }
  const dataTransfer = new DataTransfer();
  dataTransfer.items.add(file);
  input.files = dataTransfer.files;
  dispatchChangeEvents(input, file.name);
  return input;
}

async function uploadDocumentViaCrmUi({ zipArrayBuffer, zipName, documentTitle, xpaths }) {
  const file = new File([zipArrayBuffer], zipName, { type: "application/zip" });
  await setFileInputByXPath(xpaths.fileInput, file);
  await waitForEnabledElementByXPath(xpaths.uploadButton, { visibleOnly: true });
  clickByXPath(xpaths.uploadButton);
  if (xpaths.uploadSuccessMessage) {
    await waitForElementByXPath(xpaths.uploadSuccessMessage, { visibleOnly: true });
  }

  const titleValue = documentTitle || zipName;
  await waitForEnabledElementByXPath(xpaths.documentTitle, { visibleOnly: true });
  const setTitleOk = setValueByXPath(xpaths.documentTitle, titleValue);
  if (!setTitleOk) throw new Error("Could not set document title.");
  await waitForEnabledElementByXPath(xpaths.addButton, { visibleOnly: true });
  clickByXPath(xpaths.addButton);
  await waitForCondition(() => {
    const el = getElementByXPath(xpaths.documentTitle);
    const input = el ? resolveInputTarget(el) : null;
    return input !== null && input.value === "";
  }, { timeoutMs: 3000, pollMs: 100 }).catch(() => delay(400));
  return true;
}

function findUploadTarget() {
  const fileInputs = Array.from(document.querySelectorAll('input[type="file"]'));
  if (!fileInputs.length) return null;

  const candidate = fileInputs.find(isVisible) || fileInputs[0];
  if (!candidate) return null;

  const form = candidate.form || candidate.closest("form");
  if (!form) return null;

  return { fileInput: candidate, form };
}

async function uploadZipDirectlyToPage(zipArrayBuffer, zipName) {
  const target = findUploadTarget();
  if (!target) throw new Error("Could not find a file upload form on this CRM page.");

  const { fileInput, form } = target;
  const action = form.getAttribute("action") || window.location.href;
  const method = (form.getAttribute("method") || "POST").toUpperCase();
  const resolvedAction = new URL(action, window.location.href).toString();

  const formData = new FormData(form);
  const zipFile = new File([zipArrayBuffer], zipName, { type: "application/zip" });
  formData.set(fileInput.name || "file", zipFile);

  const res = await fetch(resolvedAction, {
    method,
    body: formData,
    credentials: "include"
  });

  if (!res.ok) {
    throw new Error(`Upload failed with status ${res.status}.`);
  }

  return true;
}

async function uploadDocumentsSequentially(uploads, xpaths) {
  const tasks = Array.isArray(uploads) ? uploads : [];
  if (!tasks.length) return true;
  for (const upload of tasks) {
    await uploadDocumentViaCrmUi({ ...upload, xpaths });
  }
  return true;
}

/* ---------------- Message Listener ---------------- */

function pickInventorySearchValue({ deviceNumber = "", cameraNumber = "", luminNumber = "" } = {}) {
  const camera = cameraNumber.trim();
  const lumin = luminNumber.trim();
  const device = deviceNumber.trim();
  return camera || lumin || device || "";
}

function splitInventoryIdentifiers(value = "") {
  return value
    .split(/[,;\n]+/)
    .map(part => part.trim())
    .filter(Boolean);
}

const INVENTORY_SEARCH_INPUT_XPATH = "/html/body/form/div[3]/table/tbody/tr[2]/td[2]/div/div[2]/div[2]/table/tbody/tr/td[1]/input";
const INVENTORY_SEARCH_BUTTON_XPATH = "/html/body/form/div[3]/table/tbody/tr[2]/td[2]/div/div[2]/div[2]/table/tbody/tr/td[2]/input";

function waitForXPath(xpath, timeoutMs = 12000, pollMs = 200) {
  return new Promise(resolve => {
    const start = Date.now();
    const timer = setInterval(() => {
      const node = getElementByXPath(xpath);
      if (node) {
        clearInterval(timer);
        resolve(node);
        return;
      }
      if (Date.now() - start >= timeoutMs) {
        clearInterval(timer);
        resolve(null);
      }
    }, pollMs);
  });
}

async function runInventoryManageFlow(searchValue) {
  const searchInput = await waitForXPath(INVENTORY_SEARCH_INPUT_XPATH);
  if (!searchInput) return { ok: false, message: "Inventory search textbox not found." };

  searchInput.focus();
  searchInput.value = searchValue;
  searchInput.dispatchEvent(new Event("input", { bubbles: true }));
  searchInput.dispatchEvent(new Event("change", { bubbles: true }));

  const searchButton = await waitForXPath(INVENTORY_SEARCH_BUTTON_XPATH);
  if (!searchButton) return { ok: false, message: "Inventory search button not found." };
  searchButton.click();
  return { ok: true, searchValue };
}

const runtime = typeof chrome !== "undefined" ? chrome.runtime : undefined;

if (runtime?.onMessage?.addListener) {
  runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === "GET_CLIENT_DATA") {
      sendResponse({ ok: true, data: collectClientData() });
      return true;
    }

  if (msg.type === "SET_CRM_NOTE") {
    const ok = setValueByXPath(msg.xpath, msg.noteText);
    sendResponse({ ok });
    return true;
  }

  if (msg.type === "SET_VALUE_BY_XPATH") {
    const ok = setValueByXPath(msg.xpath, msg.value);
    sendResponse({ ok });
    return true;
  }

  if (msg.type === "SET_DROPDOWN_BY_TEXT") {
    const ok = setDropdownByVisibleText(msg.xpath, msg.text);
    sendResponse({ ok });
    return true;
  }

  if (msg.type === "CLICK_BY_XPATH") {
    const ok = clickByXPath(msg.xpath);
    sendResponse({ ok });
    return true;
  }

  if (msg.type === "UPLOAD_ZIP_TO_CRM") {
    uploadZipDirectlyToPage(msg.zipArrayBuffer, msg.zipName)
      .then(() => sendResponse({ ok: true }))
      .catch(err => {
        console.error(err);
        sendResponse({ ok: false, message: err?.message || "Upload failed." });
      });
    return true;
  }

  if (msg.type === "UPLOAD_CRM_DOCUMENTS") {
    uploadDocumentsSequentially(msg.uploads, msg.xpaths)
      .then(() => sendResponse({ ok: true }))
      .catch(err => {
        console.error(err);
        sendResponse({ ok: false, message: err?.message || "Upload failed." });
      });
    return true;
  }

  if (msg.type === "APPLY_CRM_THEME_STYLE") {
    const result = applyCrmThemeStyle(msg.themeVars || {}, msg.mode || "");
    sendResponse(result);
    return true;
  }

    if (msg.type === "RUN_INVENTORY_SCRIPT") {
      const identifiers = msg.identifiers || {};
      const cameraNumbers = splitInventoryIdentifiers(identifiers.cameraNumber || "");
      const fallbackSearchValue = pickInventorySearchValue({
        deviceNumber: identifiers.deviceNumber,
        cameraNumber: cameraNumbers.length > 1 ? "" : identifiers.cameraNumber || "",
        luminNumber: identifiers.luminNumber
      });

      if (!cameraNumbers.length && !fallbackSearchValue) {
        sendResponse({ ok: false, message: "No device, camera, or Lumin-I number provided." });
        return true;
      }

      const searchValue = cameraNumbers[0] || fallbackSearchValue;
      runInventoryManageFlow(searchValue)
        .then(result => sendResponse(result))
        .catch(err => {
          console.error(err);
          sendResponse({ ok: false, message: err?.message || "Failed to run inventory script." });
        });
      return true;
    }

    if (msg.type === "PASTE_LTL_COMPLETED_ROW") {
      pasteLtlCompletedRow(msg.rowValues || [])
        .then(ok => sendResponse({ ok }))
        .catch(err => {
          console.error(err);
          sendResponse({ ok: false, message: err?.message || "Failed to paste LTL update row." });
        });
      return true;
    }

    if (msg.type === "RUN_DAF_AUTOFILL") {
      fillDafFormFromStorage()
        .then(ok => sendResponse({ ok }))
        .catch(err => {
          console.error(err);
          sendResponse({ ok: false, message: err?.message || "DAF autofill failed." });
        });
      return true;
    }

  });
} else {
  console.warn("Chrome runtime not available; skipping message listener setup.");
}

/* ---------------- Excel workbook helpers ---------------- */

const LTL_COMPLETED_SHEET_NAME = "Completed LTL Update List";

function findSheetTabByName(sheetName) {
  const normalizedTarget = normalizeText(sheetName);
  const candidates = Array.from(document.querySelectorAll('[role="tab"], button, li, span'));
  return candidates.find(el => normalizeText(el.textContent).includes(normalizedTarget)) || null;
}

function findExcelGrid() {
  return document.querySelector('[role="grid"]')
    || document.querySelector('div[aria-label*="Sheet"]')
    || document.querySelector('div[aria-label*="Worksheet"]');
}

function sendKey(target, key, options = {}) {
  const event = new KeyboardEvent("keydown", {
    key,
    bubbles: true,
    cancelable: true,
    ...options
  });
  target.dispatchEvent(event);
}

async function pasteLtlCompletedRow(rowValues) {
  if (!Array.isArray(rowValues) || rowValues.length === 0) return false;
  const rowText = rowValues.map(value => String(value ?? "")).join("\t");
  await navigator.clipboard.writeText(rowText);

  const sheetTab = findSheetTabByName(LTL_COMPLETED_SHEET_NAME);
  if (sheetTab) {
    sheetTab.click();
    await delay(600);
  }

  const grid = findExcelGrid();
  if (!grid) {
    alert("LTL row copied to clipboard. Paste into the Completed LTL Update List.");
    return false;
  }

  grid.focus();
  grid.click();
  sendKey(grid, "End", { ctrlKey: true });
  await delay(100);
  sendKey(grid, "ArrowDown");
  await delay(100);

  alert("LTL row copied to clipboard. Paste into the Completed LTL Update List.");
  return false;
}

/* ---------------- DAF form autofill ---------------- */

function isDafFormPage() {
  return typeof window?.location?.href === "string"
    && window.location.href.includes("smartboxassistivetnam.sharepoint.com/")
    && window.location.href.includes("listforms.aspx");
}

function getLastCheckinDataForDaf() {
  if (!chrome?.storage?.local) return Promise.resolve(null);
  return new Promise(resolve => {
    chrome.storage.local.get(DAF_DATA_STORAGE_KEY, res => {
      resolve(res?.[DAF_DATA_STORAGE_KEY] || null);
    });
  });
}

function findInputMatchingLabels(labelVariants) {
  const targets = labelVariants.map(normalizeText);
  const inputs = Array.from(document.querySelectorAll("input[type='text'], input:not([type]), textarea"));

  const matches = (input) => {
    if (!isVisible(input)) return false;

    const textParts = [
      input.getAttribute("aria-label"),
      input.getAttribute("placeholder"),
      input.getAttribute("name"),
      input.id
    ];

    if (input.id) {
      const forLabel = document.querySelector(`label[for="${input.id}"]`);
      if (forLabel) textParts.push(forLabel.textContent);
    }

    const labeledAncestor = input.closest("label");
    if (labeledAncestor) textParts.push(labeledAncestor.textContent);

    const context = input.closest("div, span, p");
    if (context) textParts.push(context.textContent);

    const normalized = textParts.map(normalizeText);
    return targets.some(t => normalized.some(n => n.includes(t)));
  };

  return inputs.find(matches) || null;
}

function waitForInputByLabels(labelVariants, { timeoutMs = 10000, pollMs = 200 } = {}) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const check = () => {
      const input = findInputMatchingLabels(labelVariants);
      if (input) {
        resolve(input);
        return;
      }
      if (Date.now() - start >= timeoutMs) {
        reject(new Error("Timed out waiting for DAF field: " + labelVariants.join("/")));
        return;
      }
      setTimeout(check, pollMs);
    };
    check();
  });
}

function findCheckboxMatchingLabels(labelVariants) {
  const targets = labelVariants.map(normalizeText);
  const checkboxes = Array.from(document.querySelectorAll("input[type='checkbox']"));

  const matches = (input) => {
    if (!isVisible(input)) return false;

    const textParts = [
      input.getAttribute("aria-label"),
      input.getAttribute("name"),
      input.id
    ];

    if (input.id) {
      const forLabel = document.querySelector(`label[for="${input.id}"]`);
      if (forLabel) textParts.push(forLabel.textContent);
    }

    const labeledAncestor = input.closest("label");
    if (labeledAncestor) textParts.push(labeledAncestor.textContent);

    const context = input.closest("div, span, p");
    if (context) textParts.push(context.textContent);

    const normalized = textParts.map(normalizeText);
    return targets.some(t => normalized.some(n => n.includes(t)));
  };

  return checkboxes.find(matches) || null;
}

async function fillDafFieldByXPath(xpath, value, options = {}) {
  if (!value) return false;
  try {
    const el = await waitForElementByXPath(xpath, { timeoutMs: 10000, ...options });
    const input = resolveInputTarget(el);
    if (input) {
      setNativeValue(input, value);
      dispatchChangeEvents(input, value);
    } else {
      el.textContent = value;
      dispatchChangeEvents(el, value);
    }
    return true;
  } catch (err) {
    console.warn("Failed to fill DAF field for", xpath, err);
    return false;
  }
}

async function fillDafFieldWithFallback({ value, xpath, xpaths, labels }) {
  const safeVal = (value || "").trim();
  if (!safeVal) return false;

  const candidateXPaths = xpaths || (xpath ? [xpath] : []);
  for (const candidate of candidateXPaths) {
    const ok = await fillDafFieldByXPath(candidate, safeVal, { timeoutMs: 4000 }).catch(() => false);
    if (ok) return true;
  }

  try {
    const input = await waitForInputByLabels(labels);
    setNativeValue(input, safeVal);
    dispatchChangeEvents(input, safeVal);
    return true;
  } catch (err) {
    console.warn("Fallback fill failed for", labels, err);
    return false;
  }
}

async function openDafAacPicker() {
  try {
    const aacContainer = await waitForElementByXPath(DAF_AAC_FIELD_XPATH, {
      timeoutMs: 7000,
      visibleOnly: true
    });
    const clickable = aacContainer.querySelector(
      "input, textarea, button, [role='combobox'], [role='textbox'], [contenteditable='true']"
    ) || aacContainer;
    clickable.click();
    if (typeof clickable.focus === "function") clickable.focus();
    return true;
  } catch (err) {
    console.warn("Failed to open DAF AAC picker", err);
    return false;
  }
}

function setTextEditorValue(target, value) {
  if (!target) return false;
  const safeValue = String(value ?? "");

  if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
    setNativeValue(target, safeValue);
    dispatchChangeEvents(target, safeValue);
    return true;
  }

  if (target.isContentEditable) {
    target.focus();
    target.textContent = safeValue;
    target.dispatchEvent(new InputEvent("input", { bubbles: true, data: safeValue, inputType: "insertText" }));
    target.dispatchEvent(new Event("change", { bubbles: true }));
    target.dispatchEvent(new KeyboardEvent("keyup", { key: "Enter", bubbles: true }));
    return true;
  }

  return false;
}

function findVisibleConsultantListBox() {
  const candidates = Array.from(document.querySelectorAll(
    "[role='listbox'], #CommonEditorCalloutId, [id*='Callout'], [class*='callout']"
  ));
  return candidates.find(isVisible) || null;
}

async function selectDafConsultantByAac(aacName) {
  const safeName = (aacName || "").trim();
  if (!safeName) return false;

  try {
    await openDafAacPicker();

    const aacContainer = await waitForElementByXPath(DAF_AAC_FIELD_XPATH, {
      timeoutMs: 4000,
      visibleOnly: true
    });
    const editorTarget = aacContainer.querySelector(
      "input, textarea, [role='combobox'], [role='textbox'], [contenteditable='true']"
    ) || aacContainer;
    setTextEditorValue(editorTarget, safeName);

    let listBox = null;
    for (const xpath of DAF_CONSULTANT_LISTBOX_XPATHS) {
      try {
        listBox = await waitForElementByXPath(xpath, {
          timeoutMs: 8000,
          visibleOnly: true
        });
        if (listBox) break;
      } catch {
        listBox = null;
      }
    }
    if (!listBox) {
      listBox = findVisibleConsultantListBox();
    }
    if (!listBox) {
      throw new Error("No consultant list box found for known XPaths.");
    }
    const selected = selectClosestConsultantFromListBox(listBox, safeName);
    if (!selected) {
      console.warn("DAF consultant list box loaded but no match found for AAC:", safeName);
    }
    return selected;
  } catch (err) {
    console.warn("Failed to select DAF consultant by AAC", err);
    return false;
  }
}

async function ensureDafCheckboxChecked(xpath, labelVariants = []) {
  try {
    const target = await waitForElementByXPath(xpath, { timeoutMs: 10000 });
    const checkbox = target.querySelector("input[type='checkbox']") ||
      (target.tagName === "INPUT" && target.type === "checkbox" ? target : null) ||
      (target.previousElementSibling?.tagName === "INPUT" && target.previousElementSibling.type === "checkbox"
        ? target.previousElementSibling
        : null);

    if (checkbox) {
      if (!checkbox.checked) {
        checkbox.checked = true;
        dispatchChangeEvents(checkbox);
      }
      return true;
    }

    target.click();
    return true;
  } catch (err) {
    console.warn("Failed to check DAF checkbox by XPath", err);
  }

  const fallbackCheckbox = labelVariants.length ? findCheckboxMatchingLabels(labelVariants) : null;
  if (fallbackCheckbox) {
    if (!fallbackCheckbox.checked) {
      fallbackCheckbox.checked = true;
      dispatchChangeEvents(fallbackCheckbox);
    }
    return true;
  }

  return false;
}

async function fillDafFormFromStorage() {
  if (!isDafFormPage()) return false;

  const data = await getLastCheckinDataForDaf();
  if (!data) return false;

  const fullName = [data.firstName, data.lastName].filter(Boolean).join(" ").trim();

  const fields = [
    {
      value: data.deviceNumber,
      xpaths: [
        '/html/body/div[1]/div/div/form/div/div/div/div[1]/div/span/div/div/div/input'
      ],
      labels: ["device serial", "device number", "device serial number", "device serial #"]
    },
    {
      value: data.cameraNumber,
      xpath: '/html/body/div[1]/div/div/form/div/div/div/div[2]/div/span/div/div/div/input',
      labels: ["camera", "camera number", "camera serial"]
    },
    {
      value: data.luminNumber,
      xpath: '/html/body/div[1]/div/div/form/div/div/div/div[3]/div/span/div/div/div/input',
      labels: ["lumin-i", "lumin", "lumin i number"]
    },
    {
      value: data.crmId,
      xpath: '/html/body/div[1]/div/div/form/div/div/div/div[4]/div/span/div/div/div/input',
      labels: ["crm id", "crm number"]
    },
    {
      value: fullName,
      xpath: '/html/body/div[1]/div/div/form/div/div/div/div[5]/div/span/div/div/div/input',
      labels: ["client name", "full name", "name of client"]
    },
    {
      value: data.clampMount,
      xpath: '/html/body/div[1]/div/div/form/div/div/div/div[7]/div/span/div/div/div/input',
      labels: ["clamp mount"]
    },
    {
      value: data.tableMount,
      xpath: '/html/body/div[1]/div/div/form/div/div/div/div[8]/div/span/div/div/div/input',
      labels: ["table mount"]
    },
    {
      value: data.rollingMount,
      xpath: '/html/body/div[1]/div/div/form/div/div/div/div[9]/div/span/div/div/div/input',
      labels: ["rolling mount"]
    }
  ];

  await Promise.all(fields.map(f => fillDafFieldWithFallback(f)));
  await fillDafFieldWithFallback({
    value: data.aac,
    xpath: DAF_AAC_FIELD_XPATH,
    labels: ["aac", "consultant", "aac consultant"]
  });

  await ensureDafCheckboxChecked(
    '/html/body/div[1]/div/div/form/div/div/div/div[10]/div/span/div/div/div/div[2]/div/label',
    ["device returned", "daf", "device received back", "ttmt device confirmation"]
  );

  return true;
}

if (isDafFormPage()) {
  fillDafFormFromStorage().catch(err => console.error("DAF autofill failed", err));
}


function hexToRgb(hex) {
  const value = (hex || "").trim().replace("#", "");
  if (!value) return null;
  const normalized = value.length === 3 ? value.split("").map(ch => ch + ch).join("") : value;
  if (normalized.length !== 6) return null;
  const int = Number.parseInt(normalized, 16);
  if (Number.isNaN(int)) return null;
  return { r: (int >> 16) & 255, g: (int >> 8) & 255, b: int & 255 };
}

function rgbToHex({ r, g, b }) {
  const toHex = (n) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function mixHex(baseHex, mixHexColor, mixPercent) {
  const a = hexToRgb(baseHex);
  const b = hexToRgb(mixHexColor);
  if (!a || !b) return baseHex;
  const t = Math.max(0, Math.min(1, mixPercent));
  return rgbToHex({
    r: a.r * (1 - t) + b.r * t,
    g: a.g * (1 - t) + b.g * t,
    b: a.b * (1 - t) + b.b * t
  });
}

function toRgba(hex, alpha = 1) {
  const rgb = hexToRgb(hex);
  if (!rgb) return `rgba(0, 0, 0, ${alpha})`;
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${Math.max(0, Math.min(1, alpha))})`;
}

function applyCrmThemeStyle(themeVars = {}, mode = "") {
  if (!window.location.href.includes("portal.talktometechnologies.com")) {
    return { ok: false, message: "Not on a CRM page." };
  }

  const styleId = "ttmt-crm-theme-style";
  let styleEl = document.getElementById(styleId);
  if (!styleEl) {
    styleEl = document.createElement("style");
    styleEl.id = styleId;
    document.head.appendChild(styleEl);
  }

  const palette = mode === "smartboxBlue" ? {
    "bg-color": "#121212",
    "text-color": "#e0e0e0",
    "muted-text": "#d5e9ff",
    "container-bg": "#1e1e2f",
    "container-border": "#81cfff",
    "input-bg": "#2a2a3a",
    "input-border": "#555555",
    "note-bg": "#0f1b2b",
    "note-border": "#2f4b6f",
    accent: "#81cfff",
    "accent-strong": "#003366",
    "accent-strong-hover": "#005599",
    "error-color": "#ff7b7b"
  } : themeVars;

  const ttmtBg = palette["bg-color"] || "#101317";
  const ttmtText = palette["text-color"] || "#e6ecf2";
  const ttmtMuted = palette["muted-text"] || "#c0cad8";
  const ttmtSurface = palette["container-bg"] || "#18202a";
  const ttmtBorder = palette["container-border"] || "#94a3b8";
  const ttmtInputBg = palette["input-bg"] || "#222b36";
  const ttmtInputBorder = palette["input-border"] || "#4b5a6b";
  const ttmtNoteBg = palette["note-bg"] || "#111821";
  const ttmtNoteBorder = palette["note-border"] || "#2a3646";
  const ttmtAccent = palette["accent"] || "#94a3b8";
  const ttmtAccentStrong = palette["accent-strong"] || "#273449";
  const ttmtAccentHover = palette["accent-strong-hover"] || "#33445e";
  const ttmtError = palette["error-color"] || "#ff9f9f";

  const css = `
    :root, [data-bs-theme="light"] {
      --ttmt-bg: ${ttmtBg};
      --ttmt-text: ${ttmtText};
      --ttmt-muted: ${ttmtMuted};
      --ttmt-surface: ${ttmtSurface};
      --ttmt-border: ${ttmtBorder};
      --ttmt-input-bg: ${ttmtInputBg};
      --ttmt-input-border: ${ttmtInputBorder};
      --ttmt-note-bg: ${ttmtNoteBg};
      --ttmt-note-border: ${ttmtNoteBorder};
      --ttmt-accent: ${ttmtAccent};
      --ttmt-accent-strong: ${ttmtAccentStrong};
      --ttmt-accent-hover: ${ttmtAccentHover};
      --ttmt-error: ${ttmtError};

      --ttmt-primary: var(--ttmt-accent);
      --ttmt-secondary: var(--ttmt-muted);
      --ttmt-success: var(--ttmt-accent);
      --ttmt-info: var(--ttmt-accent);
      --ttmt-warning: ${mixHex(ttmtAccent, "#ffcc00", 0.4)};
      --ttmt-danger: var(--ttmt-error);
      --ttmt-light: var(--ttmt-note-bg);
      --ttmt-dark: var(--ttmt-text);

      --ttmt-primary-text-emphasis: var(--ttmt-accent-strong);
      --ttmt-secondary-text-emphasis: var(--ttmt-muted);
      --ttmt-success-text-emphasis: var(--ttmt-accent-strong);
      --ttmt-info-text-emphasis: var(--ttmt-accent-strong);
      --ttmt-warning-text-emphasis: ${mixHex(ttmtAccentStrong, "#664d03", 0.3)};
      --ttmt-danger-text-emphasis: var(--ttmt-error);

      --ttmt-primary-bg-subtle: ${mixHex(ttmtSurface, ttmtAccent, 0.22)};
      --ttmt-secondary-bg-subtle: ${mixHex(ttmtSurface, ttmtMuted, 0.16)};
      --ttmt-success-bg-subtle: ${mixHex(ttmtSurface, ttmtAccent, 0.20)};
      --ttmt-info-bg-subtle: ${mixHex(ttmtSurface, ttmtAccent, 0.18)};
      --ttmt-warning-bg-subtle: ${mixHex(ttmtSurface, "#ffc107", 0.25)};
      --ttmt-danger-bg-subtle: ${mixHex(ttmtSurface, ttmtError, 0.20)};
      --ttmt-light-bg-subtle: ${mixHex(ttmtSurface, ttmtNoteBg, 0.70)};
      --ttmt-dark-bg-subtle: ${mixHex(ttmtBg, "#000000", 0.25)};

      --ttmt-primary-border-subtle: ${mixHex(ttmtBorder, ttmtAccent, 0.45)};
      --ttmt-secondary-border-subtle: ${mixHex(ttmtBorder, ttmtMuted, 0.35)};
      --ttmt-success-border-subtle: ${mixHex(ttmtBorder, ttmtAccent, 0.42)};
      --ttmt-info-border-subtle: ${mixHex(ttmtBorder, ttmtAccent, 0.40)};
      --ttmt-warning-border-subtle: ${mixHex(ttmtBorder, "#ffc107", 0.45)};
      --ttmt-danger-border-subtle: ${mixHex(ttmtBorder, ttmtError, 0.45)};
      --ttmt-light-border-subtle: ${mixHex(ttmtBorder, ttmtNoteBorder, 0.50)};
      --ttmt-dark-border-subtle: ${mixHex(ttmtBorder, "#000000", 0.30)};

      --ttmt-body-color: var(--ttmt-text);
      --ttmt-body-bg: var(--ttmt-bg);
      --ttmt-emphasis-color: var(--ttmt-text);
      --ttmt-secondary-color: ${toRgba(ttmtMuted, 0.75)};
      --ttmt-tertiary-color: ${toRgba(ttmtMuted, 0.55)};
      --ttmt-secondary-bg: var(--ttmt-surface);
      --ttmt-tertiary-bg: var(--ttmt-note-bg);
      --ttmt-heading-color: var(--ttmt-text);
      --ttmt-link-color: var(--ttmt-accent);
      --ttmt-link-hover-color: var(--ttmt-accent-hover);
      --ttmt-code-color: var(--ttmt-accent);
      --ttmt-highlight-bg: ${mixHex(ttmtNoteBg, ttmtAccent, 0.25)};
      --ttmt-border-color: var(--ttmt-border);
      --ttmt-border-color-translucent: ${toRgba(ttmtBorder, 0.70)};
      --ttmt-focus-ring-color: ${toRgba(ttmtAccent, 0.35)};
      --ttmt-box-shadow: 0 0.5rem 1rem ${toRgba(mixHex(ttmtBg, "#000000", 0.30), 1)};
      --ttmt-box-shadow-sm: 0 0.125rem 0.25rem ${toRgba(mixHex(ttmtBg, "#000000", 0.35), 1)};
      --ttmt-box-shadow-lg: 0 1rem 3rem ${toRgba(mixHex(ttmtBg, "#000000", 0.45), 1)};
      --ttmt-form-valid-color: var(--ttmt-accent);
      --ttmt-form-valid-border-color: var(--ttmt-accent);
      --ttmt-form-invalid-color: var(--ttmt-error);
      --ttmt-form-invalid-border-color: var(--ttmt-error);
    }

    body, #aspnetForm {
      background: var(--ttmt-bg) !important;
      color: var(--ttmt-text) !important;
    }

    .container, .container-fluid, .content, .main-content, .tab-content,
    .card, .panel, .modal-content, .dropdown-menu, .list-group-item,
    .table, .table > :not(caption) > * > *, .rgMasterTable, .rgDataDiv, .rgRow, .rgAltRow {
      background-color: var(--ttmt-surface) !important;
      color: var(--ttmt-text) !important;
      border-color: var(--ttmt-border) !important;
    }

    .table thead th, .table tfoot th, .rgHeader, .rgPager {
      background-color: var(--ttmt-note-bg) !important;
      color: var(--ttmt-text) !important;
      border-color: var(--ttmt-note-border) !important;
    }

    input, select, textarea, button,
    .form-control, .form-select, .btn,
    .rgFilterBox, .rgInEdit, .k-input {
      background: var(--ttmt-input-bg) !important;
      color: var(--ttmt-text) !important;
      border-color: var(--ttmt-input-border) !important;
    }

    .btn-primary, .btn-success, .btn-info {
      background: var(--ttmt-accent) !important;
      border-color: var(--ttmt-accent) !important;
      color: var(--ttmt-text) !important;
    }

    .btn-outline-primary, .btn-outline-secondary {
      color: var(--ttmt-accent) !important;
      border-color: var(--ttmt-accent) !important;
    }

    a, .link, .nav-link, .rgCommandCell a {
      color: var(--ttmt-accent) !important;
    }

    a:hover, .nav-link:hover {
      color: var(--ttmt-accent-strong) !important;
    }

    label, .form-label, .small, .text-muted, .muted, .hint {
      color: var(--ttmt-muted) !important;
    }

    .alert-danger, .text-danger, .validation-summary-errors {
      color: var(--ttmt-error) !important;
      border-color: var(--ttmt-error) !important;
    }
  `;

  styleEl.textContent = css;
  return { ok: true };
}
