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

/* ---------------- In-page Sidekick Panel Launcher ---------------- */

(() => {
  const LAUNCH_BUTTON_ID = "sidekick-launch-button";
  const FRAME_WRAP_ID = "sidekick-panel-frame-wrap";
  const FRAME_ID = "sidekick-panel-frame";
  const CLOSE_BUTTON_ID = "sidekick-panel-close";

  function getPanelUrl() {
    return chrome.runtime.getURL("panel.html");
  }

  function ensureSidekickLauncher() {
    if (!document.body) return;

    if (!document.getElementById(LAUNCH_BUTTON_ID)) {
      const button = document.createElement("button");
      button.id = LAUNCH_BUTTON_ID;
      button.type = "button";
      button.textContent = "Sidekick";
      button.addEventListener("click", toggleSidekickPanel);
      document.body.appendChild(button);
    }

    if (!document.getElementById(FRAME_WRAP_ID)) {
      const wrap = document.createElement("div");
      wrap.id = FRAME_WRAP_ID;
      wrap.hidden = true;

      const closeButton = document.createElement("button");
      closeButton.id = CLOSE_BUTTON_ID;
      closeButton.type = "button";
      closeButton.textContent = "×";
      closeButton.title = "Close Sidekick";
      closeButton.addEventListener("click", closeSidekickPanel);

      const frame = document.createElement("iframe");
      frame.id = FRAME_ID;
      frame.title = "CRM Sidekick";
      frame.src = getPanelUrl();
      frame.allow = "clipboard-read; clipboard-write";

      wrap.appendChild(closeButton);
      wrap.appendChild(frame);
      document.body.appendChild(wrap);
    }
  }

  function openSidekickPanel() {
    ensureSidekickLauncher();
    const wrap = document.getElementById(FRAME_WRAP_ID);
    if (wrap) wrap.hidden = false;
  }

  function closeSidekickPanel() {
    const wrap = document.getElementById(FRAME_WRAP_ID);
    if (wrap) wrap.hidden = true;
  }

  function toggleSidekickPanel() {
    ensureSidekickLauncher();
    const wrap = document.getElementById(FRAME_WRAP_ID);
    if (!wrap) return;
    wrap.hidden = !wrap.hidden;
  }

  let reinjectTimer = null;
  function scheduleLauncherReinject() {
    clearTimeout(reinjectTimer);
    reinjectTimer = setTimeout(ensureSidekickLauncher, 150);
  }

  if (typeof chrome !== "undefined" && chrome.runtime?.onMessage) {
    chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
      if (msg?.type !== "TOGGLE_SIDEKICK_OVERLAY") return false;
      toggleSidekickPanel();
      sendResponse({ ok: true });
      return true;
    });
  }

  ensureSidekickLauncher();
  const observer = new MutationObserver(scheduleLauncherReinject);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener("hashchange", scheduleLauncherReinject);
  window.addEventListener("popstate", scheduleLauncherReinject);
})();
