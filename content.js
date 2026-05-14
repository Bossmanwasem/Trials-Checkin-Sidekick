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
const CRM_SMARTBOX_BLUE_THEME_ENABLED_STORAGE_KEY = "ttmtCrmSmartboxBlueThemeEnabled";
const CRM_SMARTBOX_BLUE_THEME_STYLE_ID = "ttmt-crm-smartbox-blue-theme-style";
const CRM_SMARTBOX_BLUE_THEME_CSS = `
/* Smartbox Blue CRM Theme */
#aspnetForm .pageContent{
 background-color:#1e1e2f;
 color:#ffffff;
 border-style:solid;
 border-color:#81cfff;
}
.pageContent > table > tbody > tr > td{
 background-color:#1e1e2f !important;
 color:#ffffff;
}
#ContentAdmin > div > .ajax__tab_body{
 background-color:#1e1e2f;
 border-color:#81cfff;
 border-width:4px;
}
#ContentAdmin div div .ajax__tab_body{
 background-color:#1e1e2f;
 border-color:#81cfff;
 border-width:3px;
}
#ContentAdmin h1 span{ color:#ffffff; }
div[id='ContentAdmin'] h1{ color:#ffffff; }
.ajax__tab_panel div .ajax__tab_body .ajax__tab_panel .container-fluid .row .col-md-6 .card .card-body{
 background-color:#1e1e2f; color:#ffffff; border-color:#83c7f1; border-width:4px;
}
.pageContent tr .loginName{ color:#ffffff; }
#divAlphabet{
 border-color:#75caff; border-width:4px; border-radius:7px; background-color:#81cfff; color:#000000;
}
.ajax__tab_panel div .ajax__tab_body .ajax__tab_panel .container-fluid .row .col-md-6 .card .card-header{ background-color:#81cfff; }
.pageContent .loginName a, div div table:nth-child(1) tbody tr .ctl00_TreeView1_2:nth-child(3) a, td > div > table .ctl00_TreeView1_2 a{ color:#83c7f1; }
td > div > a img{ display:inline-block; transform:translatex(-5px) translatey(-42px); filter: grayscale(1) invert(1); }
#aspnetForm table:nth-child(2) .ctl00_TreeView1_2:nth-child(3) a, div div table:nth-child(1) tbody tr .ctl00_TreeView1_2:nth-child(4) a, #aspnetForm table:nth-child(2) .ctl00_TreeView1_2:nth-child(4) a, td div div div div:nth-child(3) table:nth-child(1) tbody tr .ctl00_TreeView1_2 a, td div div div div:nth-child(3) table:nth-child(2) tbody tr .ctl00_TreeView1_2 a, #aspnetForm table:nth-child(4) .ctl00_TreeView1_2:nth-child(4) a, #aspnetForm div:nth-child(5) table:nth-child(1) a, #aspnetForm div:nth-child(5) table:nth-child(2) a, #aspnetForm table:nth-child(3) a, td div div div div table:nth-child(4) tbody tr .ctl00_TreeView1_2 a, #aspnetForm table:nth-child(5) a, td div div div div table:nth-child(6) tbody tr .ctl00_TreeView1_2 a, #aspnetForm table:nth-child(6) .ctl00_TreeView1_2:nth-child(4) a{ color:#83c7f1; }
#ContentAdmin > div > .ajax__tab_body > .ajax__tab_panel > div > .container-fluid > .row > .col-md-6 > .card > .card-header, .col-md-6 .card .card-body div .card .card-header, .col-md-6 .card .card-body .card .card-header{ background-color:#83c7f1; }
#ContentAdmin > div > .ajax__tab_body > .ajax__tab_panel > div > .container-fluid > .row > .col-md-6 > .card > .card-body, .ajax__tab_panel > div > .card .card-body, .ajax__tab_panel > .card .card-body{ background-color:#1e1e2f; color:#ffffff; }
.ajax__tab_panel > div > .card .card-body{ transform:translatex(-5px) translatey(-42px); display:inline-block; }
.ajax__tab_panel > div > .card .col-md-3 .form-label, .ajax__tab_panel > div > .card .col-md-2 .form-label{ color:#ffffff; }
.ajax__tab_panel > div > .card .col-12 > div .table-striped > tbody > tr > td{
 background-color:#1e1e2f; color:#ffffff; border-color:#89c8ef; border-width:3px; border-radius:13px;
}
.col-12 div .table-striped tbody tr th{ background-color:#55b8dc; border-top-left-radius:12px; border-top-right-radius:12px; }
`;
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

function setSmartboxBlueCrmThemeEnabled(enabled) {
  const existing = document.getElementById(CRM_SMARTBOX_BLUE_THEME_STYLE_ID);
  if (!enabled) {
    existing?.remove();
    return;
  }
  if (existing) return;
  const style = document.createElement("style");
  style.id = CRM_SMARTBOX_BLUE_THEME_STYLE_ID;
  style.textContent = CRM_SMARTBOX_BLUE_THEME_CSS;
  document.head.appendChild(style);
}

function initSmartboxBlueCrmThemeToggle() {
  getStoredValue(CRM_SMARTBOX_BLUE_THEME_ENABLED_STORAGE_KEY).then(value => {
    setSmartboxBlueCrmThemeEnabled(Boolean(value));
  });
  if (chrome?.storage?.onChanged) {
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName !== "local") return;
      if (!changes[CRM_SMARTBOX_BLUE_THEME_ENABLED_STORAGE_KEY]) return;
      setSmartboxBlueCrmThemeEnabled(Boolean(changes[CRM_SMARTBOX_BLUE_THEME_ENABLED_STORAGE_KEY].newValue));
    });
  }
}

initSmartboxBlueCrmThemeToggle();

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

  await delay(1000);
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

/* ---------------- Injected CRM Overlay Workflow ---------------- */

(() => {
  const CRM_HOSTS = new Set([
    "crm.talktometechnologies.com",
    "portal.talktometechnologies.com"
  ]);
  if (!CRM_HOSTS.has(window.location.hostname)) return;

  const ids = {
    button: "sidekick-launch-button",
    root: "sidekick-overlay-root",
    panel: "sidekick-overlay-panel",
    header: "sidekick-overlay-header",
    body: "sidekick-overlay-body",
    status: "sidekick-status",
    notePreview: "sidekick-note-preview",
    folderStatus: "sidekick-trial-files-folder-status",
    zipStatus: "sidekick-trial-files-status",
    progress: "sidekick-progress",
    progressFill: "sidekick-progress-fill"
  };

  const NOTE_XPATHS = {
    noteBox: '//*[@id="ctl00_MainContent_Tabs_tpNotes_txtNote"]',
    category: '//*[@id="ctl00_MainContent_Tabs_tpNotes_ddlEditNoteCategory"]',
    submit: '//*[@id="ctl00_MainContent_Tabs_tpNotes_btnAddNote"]',
    documentsTab: '//*[@id="__tab_ctl00_MainContent_Tabs_tpDocuments"]/span'
  };

  const DB_NAME = "ttmtSidekickHandles";
  const DB_STORE = "handles";
  const TRIAL_FILES_HANDLE_KEY = "trialFilesFolder";
  const TRIAL_FILES_FOLDER_NAME_KEY = "ttmtTrialFilesFolderName";

  const q = selector => document.getElementById(ids.root)?.querySelector(selector) || null;
  const qa = selector => Array.from(document.getElementById(ids.root)?.querySelectorAll(selector) || []);
  const field = name => q(`[data-sidekick-field="${name}"]`);
  const value = name => (field(name)?.value || "").trim();
  const setValue = (name, nextValue) => {
    const el = field(name);
    if (!el) return;
    el.value = nextValue || "";
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  };

  function setStatus(message, isError = false) {
    const el = document.getElementById(ids.status);
    if (!el) return;
    el.textContent = message || "";
    el.classList.toggle("sidekick-error", Boolean(isError));
  }

  function setZipStatus(message, isError = false) {
    const el = document.getElementById(ids.zipStatus);
    if (!el) return;
    el.textContent = message || "";
    el.classList.toggle("sidekick-error", Boolean(isError));
  }

  function setProgress(percent = 0, message = "") {
    const bar = document.getElementById(ids.progress);
    const fill = document.getElementById(ids.progressFill);
    if (!bar || !fill) return;
    bar.hidden = percent <= 0;
    fill.style.width = `${Math.max(0, Math.min(100, percent))}%`;
    if (message) setZipStatus(message);
  }

  function sanitizeClientName(raw = "") {
    return String(raw || "")
      .replace(UNSAFE_NAME_REGEX, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function formatDateForFilename(date = new Date()) {
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    const yyyy = date.getFullYear();
    return `${mm}-${dd}-${yyyy}`;
  }

  function getSelectedValues(name) {
    return qa(`input[name="${name}"]:checked`).map(input => input.value).filter(Boolean);
  }

  function detectDeviceModel(deviceNumberRaw) {
    const s = (deviceNumberRaw || "").trim().toUpperCase();
    if (s === "X") return "Mount Only";
    const rules = [
      { prefix: "DTP10", model: "Talk Pad 10" },
      { prefix: "DTP8", model: "Talk Pad 8" },
      { prefix: "Z16", model: "Zuvo 16" },
      { prefix: "Z12", model: "Zuvo 12" },
      { prefix: "Z10", model: "Zuvo 10" },
      { prefix: "DW5", model: "Wego 5A" },
      { prefix: "DWM", model: "Wego 7A" },
      { prefix: "DW13", model: "Wego 13A" },
      { prefix: "DW", model: "Wego 10A" },
      { prefix: "DGPG", model: "Grid Pad Go" },
      { prefix: "DTT", model: "Grid Pad 13" },
      { prefix: "DTZ", model: "Grid Pad 16" }
    ];
    return rules.find(rule => s.startsWith(rule.prefix))?.model || "Device";
  }

  function buildVocabLine() {
    if (field("vocabNotReturned")?.checked) return "No vocab returned.";
    const selected = getSelectedValues("sidekick-vocabTypes");
    const vocabLabel = selected.length ? selected.join(", ") : "selected";
    return `I saved ${vocabLabel} vocabs to the CRM.`;
  }

  function hasValidVocabSelection() {
    return Boolean(field("vocabNotReturned")?.checked || getSelectedValues("sidekick-vocabTypes").length);
  }

  function buildAccessoriesLineIfAny() {
    const accessories = value("accessories");
    return accessories ? ` Also returned with the device: ${accessories}.` : "";
  }

  function buildDeviceIdentifier(deviceNum) {
    const parts = [value("luminNumber"), value("cameraNumber")].filter(Boolean);
    return parts.length ? `(${deviceNum} | ${parts.join(", ")})` : `(${deviceNum})`;
  }

  function buildMountsBlockIfAny() {
    const clamp = value("clampMount");
    const rolling = value("rollingMount");
    const table = value("tableMount");
    if (!(clamp || rolling || table)) return "";
    const lines = ["", "", "Mount(s) Returned with the device:"];
    if (clamp) lines.push(`Clamp Mount (${clamp})`);
    if (rolling) lines.push(`Rolling Mount (${rolling})`);
    if (table) lines.push(`Table Mount (${table})`);
    return lines.join("\n");
  }

  function buildMountsReturnedOnlyNote() {
    const lines = ["Mounts Returned:"];
    const mounts = [
      ["Clamp Mount", value("clampMount")],
      ["Rolling Mount", value("rollingMount")],
      ["Table Mount", value("tableMount")]
    ];
    mounts.forEach(([label, mountValue]) => {
      if (mountValue) lines.push(`${label} (${mountValue})`);
    });
    if (lines.length === 1) lines.push("No mount numbers entered.");
    return lines.join("\n");
  }

  function getFormattedLtlUpdates() {
    const updates = getSelectedValues("sidekick-ltlUpdates");
    if (!updates.length) return "No updates selected";
    return updates.map(item => item === "Other" ? (value("ltlOther") ? `Other: ${value("ltlOther")}` : "Other") : item).join(", ");
  }

  function buildLtlUpdatesLine() {
    if (!field("ltlFlow")?.checked) return "";
    return `Updates completed: ${getFormattedLtlUpdates()}.`;
  }

  function buildLtlUpdateNote({ fullName, modelName, deviceNum }) {
    const selectedVocabs = getSelectedValues("sidekick-vocabTypes");
    const vocabLabel = field("vocabNotReturned")?.checked ? "no" : (selectedVocabs.length ? selectedVocabs.join(", ") : "selected");
    let note = `${fullName} ${modelName} (${deviceNum}) was returned for a yearly update. I was able to save/transfer ${vocabLabel} Vocab(s) to the CRM. Device was wiped and unsupported apps were removed. I also performed the following updates: ${getFormattedLtlUpdates()}. Returning updated device to clinic.`;
    const needsNewSerial = getSelectedValues("sidekick-ltlUpdates").some(item => ["Replaced Device", "Replaced Case"].includes(item));
    if (needsNewSerial) note += `\n\nNew Device: ${value("newSerial") || "Serial number not provided"}`;
    return note;
  }

  function buildCannedNote() {
    const first = sanitizeClientName(value("firstName"));
    const last = sanitizeClientName(value("lastName"));
    const deviceNum = value("deviceNumber");
    const fullName = [first, last].filter(Boolean).join(" ") || "Client";
    const isMountOnly = deviceNum.toLowerCase() === "x";
    const modelName = detectDeviceModel(deviceNum);

    if (field("ltlFlow")?.checked) return buildLtlUpdateNote({ fullName, modelName, deviceNum });

    if (isMountOnly) {
      const cameraIdentifiers = [value("cameraNumber"), value("luminNumber")].filter(Boolean);
      const hasMounts = Boolean(value("clampMount") || value("rollingMount") || value("tableMount"));
      if (field("vocabNotReturned")?.checked && !hasMounts && cameraIdentifiers.length) {
        return `Camera returned.\n\nCamera number: ${cameraIdentifiers.join(", ")}`;
      }
      return buildMountsReturnedOnlyNote();
    }

    const condition = value("condition");
    const repairs = value("repairs");
    const updatesLine = buildLtlUpdatesLine();
    const updatesSuffix = updatesLine ? ` ${updatesLine}` : "";
    const base = `${fullName}'s ${modelName} ${buildDeviceIdentifier(deviceNum)} was returned`;
    if (condition === "Needs Repair") {
      return `${base} and needs repair (${repairs || "repairs needed not specified"}). ${buildVocabLine()}${buildAccessoriesLineIfAny()}${updatesSuffix}${buildMountsBlockIfAny()}`;
    }
    const conditionPhrase = condition === "Working" ? "working condition" : condition || "an unspecified condition";
    return `${base} in ${conditionPhrase}. ${buildVocabLine()}${buildAccessoriesLineIfAny()}${updatesSuffix}${buildMountsBlockIfAny()}`;
  }

  function buildZipFilenameFromVocabTypes(vocabTypes = []) {
    const first = sanitizeClientName(value("firstName"));
    const last = sanitizeClientName(value("lastName"));
    const fullName = [first, last].filter(Boolean).join(" ") || "Client";
    const normalizedTypes = [];
    let hasSaltillo = false;
    vocabTypes.filter(Boolean).forEach(type => {
      if (["TC", "LAMP", "Dialogue"].includes(type)) hasSaltillo = true;
      else normalizedTypes.push(type);
    });
    if (hasSaltillo) normalizedTypes.push("Saltillo");
    return `${fullName} ${normalizedTypes.length ? normalizedTypes.join(", ") : "Vocab"} Vocab from Trial ${formatDateForFilename()}.zip`;
  }

  function stripZipExtension(filename = "") {
    return String(filename || "").replace(/\.zip$/i, "");
  }

  function findEntryNameIgnoreCase(entries, expectedName) {
    const target = (expectedName || "").toLowerCase();
    return entries.find(name => name.toLowerCase() === target) || null;
  }

  async function openHandleDb() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(DB_STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async function saveFolderHandle(handle) {
    const db = await openHandleDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(DB_STORE, "readwrite");
      tx.objectStore(DB_STORE).put(handle, TRIAL_FILES_HANDLE_KEY);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
  }

  async function loadFolderHandle() {
    const db = await openHandleDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(DB_STORE, "readonly");
      const req = tx.objectStore(DB_STORE).get(TRIAL_FILES_HANDLE_KEY);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }

  async function verifyFolderPermission(handle, mode = "readwrite") {
    if (!handle) return false;
    const options = { mode };
    if ((await handle.queryPermission(options)) === "granted") return true;
    return (await handle.requestPermission(options)) === "granted";
  }

  async function setStoredValue(key, nextValue) {
    if (typeof chrome !== "undefined" && chrome.storage?.local) await chrome.storage.local.set({ [key]: nextValue });
    else localStorage.setItem(key, nextValue);
  }

  async function getStoredValue(key) {
    if (typeof chrome !== "undefined" && chrome.storage?.local) {
      const data = await chrome.storage.local.get(key);
      return data?.[key] || "";
    }
    return localStorage.getItem(key) || "";
  }

  async function updateFolderStatus(messageOverride = "") {
    const status = document.getElementById(ids.folderStatus);
    if (!status) return;
    if (messageOverride) {
      status.textContent = messageOverride;
      return;
    }
    const name = await getStoredValue(TRIAL_FILES_FOLDER_NAME_KEY);
    status.textContent = name ? `Using "${name}" for saved zips.` : "No saved zips folder selected yet.";
  }

  async function pickTrialFilesFolder() {
    if (typeof window.showDirectoryPicker !== "function") {
      setZipStatus("Folder picking is not supported in this browser context.", true);
      return null;
    }
    try {
      const handle = await window.showDirectoryPicker({ mode: "readwrite" });
      if (!handle) return null;
      await saveFolderHandle(handle);
      await setStoredValue(TRIAL_FILES_FOLDER_NAME_KEY, handle.name || "Selected folder");
      await updateFolderStatus();
      await refreshTrialFilesFromFolder(handle);
      return handle;
    } catch (err) {
      setZipStatus(err?.message || "Folder selection canceled.", true);
      return null;
    }
  }

  async function getFilesFromFolder(handle) {
    const files = [];
    for await (const entry of handle.values()) {
      if (entry.kind === "file") files.push(await entry.getFile());
    }
    return files.sort((a, b) => a.name.localeCompare(b.name));
  }

  async function refreshTrialFilesFromFolder(handleOverride = null) {
    const handle = handleOverride || await loadFolderHandle().catch(() => null);
    if (!handle) {
      await updateFolderStatus();
      setZipStatus("No saved zips folder selected yet.");
      return false;
    }
    const permitted = await verifyFolderPermission(handle, "read");
    if (!permitted) {
      await updateFolderStatus("Folder access blocked. Click Refresh to re-authorize.");
      return false;
    }
    const files = await getFilesFromFolder(handle);
    setZipStatus(`${files.length} file(s) found in saved zips folder.`);
    await updateFolderStatus();
    return true;
  }

  async function renameFileInFolder(folderHandle, entries, fromName, toName) {
    const sourceName = findEntryNameIgnoreCase(entries, fromName);
    if (!sourceName || !toName || sourceName === toName) return false;
    const sourceHandle = await folderHandle.getFileHandle(sourceName);
    const sourceFile = await sourceHandle.getFile();
    const existingTarget = findEntryNameIgnoreCase(entries, toName);
    if (existingTarget) await folderHandle.removeEntry(existingTarget);
    const targetHandle = await folderHandle.getFileHandle(toName, { create: true });
    const writable = await targetHandle.createWritable({ keepExistingData: false });
    await writable.write(sourceFile);
    await writable.close();
    await folderHandle.removeEntry(sourceName);
    return true;
  }

  async function renameSavedZipFilesForCheckin() {
    const result = { renamed: [], skipped: [], checkinName: "", gridName: "" };
    const handle = await loadFolderHandle().catch(() => null);
    if (!handle) {
      result.skipped.push("folder-missing");
      setZipStatus("No saved zips folder selected. Skipping saved zip rename.", true);
      return result;
    }
    const permitted = await verifyFolderPermission(handle, "readwrite");
    if (!permitted) {
      result.skipped.push("permission-blocked");
      setZipStatus("Saved zips folder access blocked. Re-authorize with Refresh.", true);
      return result;
    }

    const entries = [];
    for await (const entry of handle.values()) {
      if (entry.kind === "file") entries.push(entry.name);
    }
    result.checkinName = buildZipFilenameFromVocabTypes(getSelectedValues("sidekick-vocabTypes"));
    result.gridName = `${sanitizeClientName(value("firstName"))} ${sanitizeClientName(value("lastName"))} Grid user from Trial ${formatDateForFilename()}.zip`.replace(/\s+/g, " ").trim();

    if (await renameFileInFolder(handle, entries, "Current Checkin.zip", result.checkinName)) result.renamed.push(result.checkinName);
    else result.skipped.push("Current Checkin.zip");
    if (!field("vocabNotReturned")?.checked && getSelectedValues("sidekick-vocabTypes").includes("Grid")) {
      if (await renameFileInFolder(handle, entries, "Current Grid user.zip", result.gridName)) result.renamed.push(result.gridName);
      else result.skipped.push("Current Grid user.zip");
    }
    setZipStatus(result.renamed.length ? `Renamed: ${result.renamed.join(" | ")}` : "No matching Current Checkin.zip / Current Grid user.zip files were renamed.");
    return result;
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function downloadVocabZip() {
    if (typeof JSZip === "undefined") {
      setStatus("JSZip is unavailable; cannot create vocab ZIP.", true);
      return;
    }
    const zip = new JSZip();
    const note = buildCannedNote();
    zip.file("CRM Note.txt", note);
    zip.file("Sidekick Check-in Summary.txt", [
      `Client: ${value("firstName")} ${value("lastName")}`.trim(),
      `CRM ID: ${value("crmId")}`,
      `AAC: ${value("aac")}`,
      `Device: ${value("deviceNumber")}`,
      `Vocab: ${field("vocabNotReturned")?.checked ? "NOT returned" : getSelectedValues("sidekick-vocabTypes").join(", ")}`
    ].join("\n"));
    const blob = await zip.generateAsync({ type: "blob" });
    downloadBlob(blob, buildZipFilenameFromVocabTypes(getSelectedValues("sidekick-vocabTypes")));
    setStatus("Vocab ZIP downloaded.");
  }

  async function copyNoteToClipboard(note) {
    try {
      await navigator.clipboard.writeText(note);
    } catch {
      // Clipboard is a convenience backup only; CRM insertion still continues.
    }
  }

  function selectNoteCategory(text = "Device Returned") {
    const ok = setDropdownByVisibleText(NOTE_XPATHS.category, text);
    setStatus(ok ? `Selected note category: ${text}.` : `Could not find the CRM note category dropdown.`, !ok);
    return ok;
  }

  async function generateNote() {
    if (!hasValidVocabSelection()) {
      setStatus('Select at least one vocab or check "Vocab NOT returned" before continuing.', true);
      return "";
    }
    const note = buildCannedNote();
    const preview = document.getElementById(ids.notePreview);
    if (preview) preview.textContent = note;
    await copyNoteToClipboard(note);
    setStatus("Note generated and copied to clipboard.");
    return note;
  }

  async function insertNoteIntoCrm() {
    const note = await generateNote();
    if (!note) return;
    setProgress(15, "Preparing saved zip rename…");
    await refreshTrialFilesFromFolder();
    setProgress(45, "Renaming saved zip files…");
    const renamedZipResult = await renameSavedZipFilesForCheckin();
    setProgress(70, "Inserting CRM note…");

    const noteOk = setValueByXPath(NOTE_XPATHS.noteBox, note);
    if (!noteOk) {
      setStatus("Could not find the CRM note box. Open the Notes tab and try again.", true);
      setProgress(0);
      return;
    }
    const category = field("ltlFlow")?.checked ? "Device Updated" : "Device Returned";
    const categoryOk = selectNoteCategory(category);
    if (!categoryOk) {
      setProgress(0);
      return;
    }
    const submitOk = clickByXPath(NOTE_XPATHS.submit);
    if (!submitOk) {
      setStatus("Note was inserted, but the CRM submit button was not found.", true);
      setProgress(0);
      return;
    }
    clickByXPath(NOTE_XPATHS.documentsTab);
    setProgress(100, "CRM note submitted and Documents tab opened.");
    const renamedSummary = renamedZipResult.renamed.length
      ? ` Renamed: ${renamedZipResult.renamed.map(stripZipExtension).join(" | ")}.`
      : " No matching Current Checkin.zip / Current Grid user.zip files were renamed.";
    setStatus(`CRM note submitted.${renamedSummary}`);
  }

  function clearForm() {
    qa("input, textarea, select").forEach(input => {
      if (input.type === "checkbox") input.checked = false;
      else input.value = "";
      input.dispatchEvent(new Event("change", { bubbles: true }));
    });
    const preview = document.getElementById(ids.notePreview);
    if (preview) preview.textContent = "Generated note will appear here.";
    qa(".sidekick-hidden-section").forEach(section => section.hidden = true);
    setProgress(0);
    setStatus("Form cleared.");
    updateDeviceRules();
    fillClientDataFromCrm();
  }

  function updateVocabSelectionAvailability() {
    const disabled = Boolean(field("vocabNotReturned")?.checked);
    qa('input[name="sidekick-vocabTypes"]').forEach(input => {
      input.disabled = disabled;
      if (disabled) input.checked = false;
    });
  }

  function updateDeviceRules() {
    const isMountOnly = value("deviceNumber").toLowerCase() === "x";
    const conditionWrap = q('[data-sidekick-section="condition"]');
    const condition = field("condition");
    const mountSection = q('[data-sidekick-section="mounts"]');
    if (isMountOnly && !field("ltlFlow")?.checked) {
      if (mountSection) mountSection.hidden = false;
      if (conditionWrap) conditionWrap.hidden = true;
      if (condition) {
        condition.required = false;
        condition.value = "";
      }
    } else {
      if (conditionWrap) conditionWrap.hidden = false;
      if (condition) condition.required = true;
    }
  }

  function togglePanelCollapsed() {
    const panel = document.getElementById(ids.panel);
    if (!panel) return;
    panel.classList.toggle("sidekick-collapsed");
  }

  function openPanel() {
    const root = document.getElementById(ids.root);
    if (!root) return;
    root.hidden = false;
    fillClientDataFromCrm();
  }

  function closePanel() {
    const root = document.getElementById(ids.root);
    if (root) root.hidden = true;
  }

  function makeDraggable(panel, handle) {
    let drag = null;
    handle.addEventListener("pointerdown", event => {
      if (event.target.closest("button")) return;
      const rect = panel.getBoundingClientRect();
      drag = { dx: event.clientX - rect.left, dy: event.clientY - rect.top };
      panel.setPointerCapture?.(event.pointerId);
      event.preventDefault();
    });
    handle.addEventListener("pointermove", event => {
      if (!drag) return;
      const nextLeft = Math.min(window.innerWidth - 80, Math.max(8, event.clientX - drag.dx));
      const nextTop = Math.min(window.innerHeight - 80, Math.max(8, event.clientY - drag.dy));
      panel.style.left = `${nextLeft}px`;
      panel.style.top = `${nextTop}px`;
      panel.style.right = "auto";
      panel.style.bottom = "auto";
    });
    handle.addEventListener("pointerup", event => {
      drag = null;
      panel.releasePointerCapture?.(event.pointerId);
    });
  }

  function fillClientDataFromCrm() {
    const data = collectClientData();
    if (!data) return;
    if (data.firstName) setValue("firstName", data.firstName);
    if (data.lastName) setValue("lastName", data.lastName);
    if (data.aac) setValue("aac", data.aac);
    if (data.crmId) setValue("crmId", data.crmId);
  }

  function createInput({ label, fieldName, type = "text", required = false, placeholder = "" }) {
    const id = `sidekick-${fieldName}`;
    return `
      <label class="sidekick-label" for="${id}">${label}</label>
      <input class="sidekick-input" id="${id}" data-sidekick-field="${fieldName}" type="${type}" ${required ? "required" : ""} placeholder="${placeholder}" />
    `;
  }

  function createOverlayHtml() {
    return `
      <div id="${ids.panel}" class="sidekick-panel" role="dialog" aria-label="Sidekick check-in overlay">
        <div id="${ids.header}" class="sidekick-header">
          <div><span class="sidekick-kicker">CRM</span><strong>Sidekick</strong></div>
          <div class="sidekick-header-actions">
            <button type="button" class="sidekick-icon-btn" data-sidekick-action="refresh" title="Refresh from CRM">↻</button>
            <button type="button" class="sidekick-icon-btn" data-sidekick-action="collapse" title="Collapse">–</button>
            <button type="button" class="sidekick-icon-btn" data-sidekick-action="close" title="Close">×</button>
          </div>
        </div>
        <div id="${ids.body}" class="sidekick-body">
          <div class="sidekick-quick-actions">
            <button type="button" class="sidekick-primary" data-sidekick-action="generate">Generate Note</button>
            <button type="button" class="sidekick-primary" data-sidekick-action="insert">Insert Note into CRM</button>
            <button type="button" data-sidekick-action="category">Select Device Returned category</button>
            <button type="button" data-sidekick-action="download">Download Vocab ZIP</button>
            <button type="button" data-sidekick-action="clear">Clear Form</button>
          </div>
          <div id="${ids.status}" class="sidekick-status" aria-live="polite">Ready.</div>
          <form id="sidekick-checkin-form" class="sidekick-form">
            ${createInput({ label: "Device Number (Put an X if only checking in mount) *", fieldName: "deviceNumber", required: true })}
            <label class="sidekick-checkbox"><input data-sidekick-field="ltlFlow" type="checkbox" /> LTL yearly update flow</label>
            <div data-sidekick-section="condition">
              <label class="sidekick-label" for="sidekick-condition">Device Condition *</label>
              <select class="sidekick-input" id="sidekick-condition" data-sidekick-field="condition" required>
                <option value="">Select condition...</option>
                <option value="Working">Working</option>
                <option value="Needs Repair">Needs Repair</option>
              </select>
            </div>
            <div class="sidekick-hidden-section" data-sidekick-section="repairs" hidden>
              <label class="sidekick-label" for="sidekick-repairs">Repairs Needed</label>
              <div class="sidekick-chip-row">
                ${["Loose or broken handle", "Loose or broken kickstand", "Replace screen protector", "Missing buttons", "Broken display"].map(item => `<button type="button" class="sidekick-chip" data-sidekick-repair="${item}">${item}</button>`).join("")}
              </div>
              <textarea class="sidekick-input" id="sidekick-repairs" data-sidekick-field="repairs" placeholder="Selected repairs will appear here..."></textarea>
            </div>
            <div class="sidekick-hidden-section" data-sidekick-section="ltlUpdates" hidden>
              <label class="sidekick-label">Updates Made</label>
              <div class="sidekick-checkbox-grid">
                ${["Fixed Handle", "Fixed Stand", "Replaced Screen Protector", "Replaced Device", "Replaced Case", "N/A", "Other"].map((item, index) => `<label class="sidekick-checkbox" for="sidekick-ltl-${index}"><input id="sidekick-ltl-${index}" name="sidekick-ltlUpdates" value="${item}" type="checkbox" /> ${item}</label>`).join("")}
              </div>
              ${createInput({ label: "Other updates", fieldName: "ltlOther", placeholder: "Describe other updates..." })}
              ${createInput({ label: "New serial number", fieldName: "newSerial", placeholder: "Enter new serial number..." })}
            </div>
            <div class="sidekick-grid-2">
              ${createInput({ label: "Client First Name", fieldName: "firstName" })}
              ${createInput({ label: "Client Last Name", fieldName: "lastName" })}
              ${createInput({ label: "AAC", fieldName: "aac" })}
              ${createInput({ label: "CRM ID", fieldName: "crmId" })}
            </div>
            <label class="sidekick-checkbox"><input data-sidekick-field="vocabNotReturned" type="checkbox" /> Vocab NOT returned</label>
            <label class="sidekick-label">What Vocabs did you pull off the device?</label>
            <div class="sidekick-checkbox-grid">
              ${["Grid", "P2G", "TC", "LAMP", "Dialogue"].map(item => `<label class="sidekick-checkbox"><input name="sidekick-vocabTypes" value="${item}" type="checkbox" /> ${item}</label>`).join("")}
            </div>
            <button type="button" class="sidekick-toggle" data-sidekick-toggle="camera">+ Add Camera & Lumin-I Info</button>
            <div class="sidekick-hidden-section" data-sidekick-section="camera" hidden>
              ${createInput({ label: "Camera Number", fieldName: "cameraNumber" })}
              ${createInput({ label: "Lumin-I Number (GPL.XXXXXXX)", fieldName: "luminNumber" })}
            </div>
            <button type="button" class="sidekick-toggle" data-sidekick-toggle="mounts">+ Add Mount Info</button>
            <div class="sidekick-hidden-section" data-sidekick-section="mounts" hidden>
              ${createInput({ label: "Clamp Mount Number", fieldName: "clampMount" })}
              ${createInput({ label: "Table Mount Number", fieldName: "tableMount" })}
              ${createInput({ label: "Rolling Mount Number", fieldName: "rollingMount" })}
            </div>
            <button type="button" class="sidekick-toggle" data-sidekick-toggle="accessories">+ Add Trial Accessories</button>
            <div class="sidekick-hidden-section" data-sidekick-section="accessories" hidden>
              ${createInput({ label: "Trial Accessories (Switches, KGs)", fieldName: "accessories" })}
            </div>
            <div class="sidekick-upload-block">
              <label class="sidekick-label">Saved zips folder</label>
              <div class="sidekick-mini-row">
                <button type="button" data-sidekick-action="pickFolder">Choose saved zips folder</button>
                <button type="button" data-sidekick-action="refreshFolder">Refresh folder access</button>
              </div>
              <div id="${ids.folderStatus}" class="sidekick-muted">No saved zips folder selected yet.</div>
              <div class="sidekick-hint">Sidekick will rename <strong>Current Checkin.zip</strong> and <strong>Current Grid user.zip</strong> when inserting the note.</div>
              <div id="${ids.zipStatus}" class="sidekick-muted">Waiting to rename saved zip files.</div>
              <div id="${ids.progress}" class="sidekick-progress" hidden><div id="${ids.progressFill}" class="sidekick-progress-fill"></div></div>
            </div>
            <pre id="${ids.notePreview}" class="sidekick-note-preview">Generated note will appear here.</pre>
          </form>
        </div>
      </div>
    `;
  }

  function wireOverlay() {
    const root = document.getElementById(ids.root);
    const panel = document.getElementById(ids.panel);
    const header = document.getElementById(ids.header);
    if (!root || !panel || !header || root.dataset.sidekickWired === "true") return;
    root.dataset.sidekickWired = "true";
    makeDraggable(panel, header);

    root.addEventListener("click", event => {
      const action = event.target.closest("[data-sidekick-action]")?.dataset.sidekickAction;
      const toggle = event.target.closest("[data-sidekick-toggle]")?.dataset.sidekickToggle;
      const repair = event.target.closest("[data-sidekick-repair]")?.dataset.sidekickRepair;
      if (toggle) {
        const section = q(`[data-sidekick-section="${toggle}"]`);
        if (section) section.hidden = !section.hidden;
      }
      if (repair) {
        const repairs = field("repairs");
        if (repairs && !repairs.value.includes(repair)) repairs.value = [repairs.value.trim(), repair].filter(Boolean).join("; ");
      }
      if (!action) return;
      event.preventDefault();
      if (action === "refresh") fillClientDataFromCrm();
      if (action === "collapse") togglePanelCollapsed();
      if (action === "close") closePanel();
      if (action === "generate") void generateNote();
      if (action === "insert") void insertNoteIntoCrm();
      if (action === "category") selectNoteCategory("Device Returned");
      if (action === "download") void downloadVocabZip();
      if (action === "clear") clearForm();
      if (action === "pickFolder") void pickTrialFilesFolder();
      if (action === "refreshFolder") void refreshTrialFilesFromFolder();
    });

    root.addEventListener("change", event => {
      if (event.target.matches('[data-sidekick-field="vocabNotReturned"]')) updateVocabSelectionAvailability();
      if (event.target.matches('[data-sidekick-field="condition"]')) {
        const repairs = q('[data-sidekick-section="repairs"]');
        if (repairs) repairs.hidden = event.target.value !== "Needs Repair";
      }
      if (event.target.matches('[data-sidekick-field="ltlFlow"]')) {
        const ltl = q('[data-sidekick-section="ltlUpdates"]');
        if (ltl) ltl.hidden = !event.target.checked;
        updateDeviceRules();
      }
      if (event.target.matches('[data-sidekick-field="deviceNumber"]')) updateDeviceRules();
    });

    q("#sidekick-checkin-form")?.addEventListener("submit", event => {
      event.preventDefault();
      void insertNoteIntoCrm();
    });

    void updateFolderStatus();
    void refreshTrialFilesFromFolder();
    fillClientDataFromCrm();
    updateDeviceRules();
  }

  function ensureOverlay() {
    if (!document.body) return;
    if (!document.getElementById(ids.button)) {
      const button = document.createElement("button");
      button.id = ids.button;
      button.type = "button";
      button.textContent = "Sidekick";
      button.addEventListener("click", openPanel);
      document.body.appendChild(button);
    }
    if (!document.getElementById(ids.root)) {
      const root = document.createElement("div");
      root.id = ids.root;
      root.hidden = true;
      root.innerHTML = createOverlayHtml();
      document.body.appendChild(root);
    }
    wireOverlay();
  }

  let reinjectTimer = null;
  function scheduleReinject() {
    clearTimeout(reinjectTimer);
    reinjectTimer = setTimeout(() => {
      ensureOverlay();
      if (!document.getElementById(ids.root)?.hidden) fillClientDataFromCrm();
    }, 150);
  }

  ensureOverlay();
  const observer = new MutationObserver(scheduleReinject);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener("popstate", scheduleReinject);
  window.addEventListener("hashchange", scheduleReinject);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) scheduleReinject();
  });
})();
