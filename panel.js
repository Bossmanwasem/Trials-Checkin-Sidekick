// panel.js

/* ---------------- CONFIG / XPATHS ---------------- */

// Notes (still used)
const NOTE_BOX_XPATH = '//*[@id="ctl00_MainContent_Tabs_tpNotes_txtNote"]';
const NOTE_CATEGORY_XPATH = '//*[@id="ctl00_MainContent_Tabs_tpNotes_ddlEditNoteCategory"]';
const NOTE_SUBMIT_XPATH = '//*[@id="ctl00_MainContent_Tabs_tpNotes_btnAddNote"]';
const IDENTIFIER_STORAGE_KEY = "ttmtLastInventoryIdentifiers";
const INVENTORY_NEXT_STEP_URL = "https://talktometechnologies2com.sharepoint.com/sites/TrialsSharePoint2/_layouts/15/listforms.aspx?cid=ZTg4MWI0ZDItYWRiOS00ODc2LThlNmMtODliMWZkMDY2MTY2&nav=MTY3M2YzY2ItNDI0OC00ZGI2LTkwNzItYjA0MDAxMjEyMDNk&preview=true";

/* ---------------- Helpers ---------------- */
const VIEW_IDS = ["formView", "completeView", "inventoryView"];

function showView(targetId) {
  VIEW_IDS.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.style.display = id === targetId ? "block" : "none";
  });
}

function showCompleteView() { showView("completeView"); }
function showFormView() { showView("formView"); }
function showInventoryView() { showView("inventoryView"); }

function setValue(id, val) {
  const el = document.getElementById(id);
  if (el) el.value = val || "";
}

function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text || "";
}

function formatDateForFilename(date = new Date()) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const year = String(date.getFullYear());
  return `${month}.${day}.${year}`;
}

const UNSAFE_NAME_REGEX = /\s?(\*\d{5}|\*.*?\*|\(.*?\)|\b\d{5}\b|"[^"]*")/g;

function sanitizeName(name) {
  return (name || "").replace(UNSAFE_NAME_REGEX, "").trim();
}

/* ---------------- Tab + CRM data fetch ---------------- */

async function getActiveCrmTab() {
  const [active] = await chrome.tabs.query({ active: true, currentWindow: true });
  return active || null;
}

function isCrmUrl(url) {
  return typeof url === "string" &&
    url.startsWith("https://portal.talktometechnologies.com/");
}

async function getActiveCrmTabId() {
  const tab = await getActiveCrmTab();
  if (tab?.id && isCrmUrl(tab.url)) return tab.id;

  const tabs = await chrome.tabs.query({
    url: "https://portal.talktometechnologies.com/*"
  });
  return tabs?.[0]?.id || null;
}

async function fetchClientData(tabIdOverride = null) {
  const tabId = tabIdOverride ?? (await getActiveCrmTabId());
  if (!tabId) return null;

  const res = await chrome.tabs.sendMessage(tabId, { type: "GET_CLIENT_DATA" }).catch(() => null);
  if (!res?.ok) return null;

  return { tabId, data: res.data };
}

function applyClientData(data) {
  if (!data) return;
  setValue("firstName", data.firstName);
  setValue("lastName", data.lastName);
  setValue("aac", data.aac);
  setValue("crmId", data.crmId);
}

/* ---------------- UI helpers ---------------- */

function toggleSection(sectionId) {
  const section = document.getElementById(sectionId);
  if (!section) return;
  section.style.display = (section.style.display === "block") ? "none" : "block";
}

function getFormValue(selector) {
  const el = document.querySelector(selector);
  return (el?.value || "").trim();
}

/* ---------------- Repairs logic ---------------- */

const repairsBox = document.getElementById("repairsTextBox");
const otherInput = document.getElementById("otherRepairInput");

function updateRepairsBox() {
  const items = [];
  document.querySelectorAll(".repair-btn.active").forEach(b => {
    if (b.id !== "otherRepairBtn") items.push(b.textContent.trim());
  });

  const otherText = otherInput?.value?.trim() || "";
  if (otherText) items.push("Other: " + otherText);

  if (repairsBox) repairsBox.value = items.join(", ");
}

document.querySelectorAll(".repair-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    if (btn.id === "otherRepairBtn") {
      btn.classList.toggle("active");
      if (otherInput) {
        otherInput.style.display = btn.classList.contains("active") ? "block" : "none";
        if (!btn.classList.contains("active")) otherInput.value = "";
      }
      updateRepairsBox();
      return;
    }
    btn.classList.toggle("active");
    updateRepairsBox();
  });
});

otherInput?.addEventListener("input", updateRepairsBox);

/* ---------------- Device Condition + X rules ---------------- */

const deviceInput = document.getElementById("deviceNumberInput");
const mountSection = document.getElementById("mountSection");
const conditionSelect = document.getElementById("conditionSelect");
const conditionContainer = document.getElementById("conditionContainer");
const repairSection = document.getElementById("repairSection");

function clearRepairsUI() {
  if (repairsBox) repairsBox.value = "";
  if (otherInput) {
    otherInput.value = "";
    otherInput.style.display = "none";
  }
  document.querySelectorAll(".repair-btn").forEach(b => b.classList.remove("active"));
  if (repairSection) repairSection.style.display = "none";
}

function updateDeviceRules() {
  const isMountOnly = (deviceInput?.value || "").trim().toLowerCase() === "x";

  if (isMountOnly) {
    if (mountSection) mountSection.style.display = "block";
    if (conditionSelect) {
      conditionSelect.required = false;
      conditionSelect.value = "";
    }
    if (conditionContainer) conditionContainer.style.display = "none";
    clearRepairsUI();
  } else {
    if (conditionContainer) conditionContainer.style.display = "block";
    if (conditionSelect) conditionSelect.required = true;
  }
}

deviceInput?.addEventListener("input", updateDeviceRules);
updateDeviceRules();

conditionSelect?.addEventListener("change", () => {
  const show = conditionSelect.value === "Needs Repair";
  if (repairSection) repairSection.style.display = show ? "block" : "none";
  if (!show) clearRepairsUI();
});

/* ---------------- Expand toggles ---------------- */

document.getElementById("cameraToggle")?.addEventListener("click", () => toggleSection("cameraLuminSection"));
document.getElementById("mountToggle")?.addEventListener("click", () => toggleSection("mountSection"));
document.getElementById("accessoryToggle")?.addEventListener("click", () => toggleSection("accessorySection"));

/* ---------------- Device model detection ---------------- */

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

  for (const r of rules) {
    if (s.startsWith(r.prefix)) return r.model;
  }
  return "Device";
}

/* ---------------- NOTE helpers ---------------- */

function buildVocabLine() {
  const vocabNotReturned = document.getElementById("vocabNotReturned")?.checked === true;
  return vocabNotReturned ? "No vocab returned." : "Vocab was returned.";
}

function buildAccessoriesLineIfAny() {
  const accessories = getFormValue('input[name="accessories"]');
  if (!accessories) return "";
  return ` Also returned with the device: ${accessories}.`;
}

function buildDeviceIdentifier(deviceNum) {
  const parts = [];
  const lumin = getFormValue('input[name="luminNumber"]');
  const camera = getFormValue('input[name="cameraNumber"]');
  if (lumin) parts.push(lumin);
  if (camera) parts.push(camera);

  if (parts.length === 0) return `(${deviceNum})`;
  return `(${deviceNum} | ${parts.join(", ")})`;
}

function buildMountsBlockIfAny() {
  const clamp = getFormValue('input[name="clampMount"]');
  const rolling = getFormValue('input[name="rollingMount"]');
  const table = getFormValue('input[name="tableMount"]');
  if (!(clamp || rolling || table)) return "";

  const lines = ["", "", "Mount(s) Returned with the device:"];
  if (clamp) lines.push(`Clamp Mount (${clamp})`);
  if (rolling) lines.push(`Rolling Mount (${rolling})`);
  if (table) lines.push(`Table Mount (${table})`);
  return lines.join("\n");
}

function buildMountsReturnedOnlyNote() {
  const clamp = getFormValue('input[name="clampMount"]');
  const rolling = getFormValue('input[name="rollingMount"]');
  const table = getFormValue('input[name="tableMount"]');

  const lines = ["Mounts Returned:"];
  if (clamp) lines.push(`Clamp Mount (${clamp})`);
  if (rolling) lines.push(`Rolling Mount (${rolling})`);
  if (table) lines.push(`Table Mount (${table})`);
  if (lines.length === 1) lines.push("No mount numbers entered.");
  return lines.join("\n");
}

/* ---------------- NOTE GENERATION ---------------- */

function buildCannedNote() {
  const first = sanitizeName(getFormValue("#firstName"));
  const last = sanitizeName(getFormValue("#lastName"));
  const deviceNum = getFormValue("#deviceNumberInput");

  const fullName = [first, last].filter(Boolean).join(" ") || "Client";
  const isMountOnly = deviceNum.toLowerCase() === "x";
  const modelName = detectDeviceModel(deviceNum);

  if (isMountOnly) return buildMountsReturnedOnlyNote();

  const condition = getFormValue("#conditionSelect");
  const repairs = getFormValue("#repairsTextBox");

  const vocabLine = buildVocabLine();
  const accessoriesLine = buildAccessoriesLineIfAny();
  const mountsBlock = buildMountsBlockIfAny();
  const deviceId = buildDeviceIdentifier(deviceNum);

  if (condition === "Needs Repair") {
    return `${fullName}'s ${modelName} ${deviceId} was returned and needs repair (${repairs || "repairs needed not specified"}). ${vocabLine}${accessoriesLine}${mountsBlock}`;
  }

  const conditionPhrase =
    condition === "Working" ? "working condition" :
      condition || "an unspecified condition";

  return `${fullName}'s ${modelName} ${deviceId} was returned in ${conditionPhrase}. ${vocabLine}${accessoriesLine}${mountsBlock}`;
}

/* ---------------- CRM messaging helpers ---------------- */

async function sendToCrm(type, payload) {
  const tabId = await getActiveCrmTabId();
  if (!tabId) return { ok: false };
  const res = await chrome.tabs.sendMessage(tabId, { type, ...payload }).catch(() => null);
  return res || { ok: false };
}

/* ---------------- Inventory identifiers storage ---------------- */

function getCurrentIdentifiers() {
  return {
    deviceNumber: getFormValue("#deviceNumberInput"),
    cameraNumber: getFormValue('input[name="cameraNumber"]'),
    luminNumber: getFormValue('input[name="luminNumber"]')
  };
}

function saveLastIdentifiers(identifiers) {
  if (!chrome?.storage?.local) return Promise.resolve();
  return new Promise(resolve => {
    chrome.storage.local.set({ [IDENTIFIER_STORAGE_KEY]: identifiers }, resolve);
  });
}

function getLastIdentifiers() {
  if (!chrome?.storage?.local) return Promise.resolve({});
  return new Promise(resolve => {
    chrome.storage.local.get(IDENTIFIER_STORAGE_KEY, res => {
      resolve(res?.[IDENTIFIER_STORAGE_KEY] || {});
    });
  });
}

function buildInventorySearchValue({ deviceNumber = "", cameraNumber = "", luminNumber = "" } = {}) {
  return (cameraNumber || "").trim() || (luminNumber || "").trim() || (deviceNumber || "").trim() || "";
}

let inventoryNextStepVisible = false;

async function updateInventorySearchDisplay() {
  const identifiers = await getLastIdentifiers();
  const searchValue = buildInventorySearchValue(identifiers);
  const display = document.getElementById("inventorySearchValue");
  const runBtn = document.getElementById("runInventoryScriptBtn");
  const status = document.getElementById("inventoryStatus");

  if (display) {
    display.textContent = searchValue || "No stored identifiers. Fill out the first page first.";
  }
  if (runBtn) runBtn.disabled = !searchValue;
  if (status) status.textContent = "";

  setInventoryNextStepVisibility(Boolean(searchValue) && inventoryNextStepVisible);

  return identifiers;
}

function setInventoryNextStepVisibility(show) {
  const btn = document.getElementById("inventoryNextStepBtn");
  if (!btn) return;
  inventoryNextStepVisible = !!show;
  btn.style.display = inventoryNextStepVisible ? "block" : "none";
}


function watchIdentifierInputs() {
  const selectors = ["#deviceNumberInput", "input[name='cameraNumber']", "input[name='luminNumber']"];
  const handler = () => saveLastIdentifiers(getCurrentIdentifiers());
  selectors.forEach(sel => {
    document.querySelector(sel)?.addEventListener("input", handler);
  });
}

function isManageInventoryUrl(url) {
  return typeof url === "string" && url.includes("ManageInventory.aspx");
}

async function syncViewForTab(tab) {
  if (!tab || !isCrmUrl(tab.url)) return;

  if (isManageInventoryUrl(tab.url)) {
    showInventoryView();
    await updateInventorySearchDisplay();
    return;
  }

  const inventoryVisible = document.getElementById("inventoryView")?.style.display === "block";
  if (inventoryVisible) {
    showFormView();
  }

  const res = await fetchClientData(tab.id);
  if (res?.data) applyClientData(res.data);
}

/* ---------------- Trial file zip + upload ---------------- */

const trialFilesInput = document.getElementById("trialFilesInput");
const trialFilesStatus = document.getElementById("trialFilesStatus");
const selectedTrialFiles = [];
const uploadPrompt = document.getElementById("uploadPrompt");
const uploadPromptText = document.getElementById("uploadPromptText");
const zipFilenameField = document.getElementById("zipFilenameField");
const copyZipFilenameBtn = document.getElementById("copyZipFilenameBtn");

function updateTrialFilesStatus(message, isError = false) {
  if (!trialFilesStatus) return;
  trialFilesStatus.textContent = message;
  trialFilesStatus.classList.toggle("error-text", isError);
}

function clearSelectedTrialFiles(messageOverride = null) {
  selectedTrialFiles.length = 0;
  if (trialFilesInput) trialFilesInput.value = "";
  updateTrialFilesStatus(messageOverride || "No files selected.");
}

function getVocabTypesFromFiles(files) {
  const hasGrid = files.some(file => file.name.toLowerCase().endsWith(".grid3user"));
  const hasP2G = files.some(file => file.name.toLowerCase().endsWith(".p2gbk"));
  const hasSaltillo = files.some(file => file.name.toLowerCase().endsWith(".ce"));

  const ordered = [];
  if (hasGrid) ordered.push("Grid");
  if (hasP2G) ordered.push("P2G");
  if (hasSaltillo) ordered.push("Saltillo");
  return ordered;
}

function buildZipFilename() {
  const first = sanitizeName(getFormValue("#firstName"));
  const last = sanitizeName(getFormValue("#lastName"));
  const fullName = [first, last].filter(Boolean).join(" ") || "Client";
  const dateStr = formatDateForFilename();
  const vocabTypes = getVocabTypesFromFiles(selectedTrialFiles);
  const typeLabel = vocabTypes.length
    ? `${vocabTypes.join(", ")}`
    : "Vocab";
  return `${fullName} ${typeLabel} Vocab from Trial ${dateStr}.zip`;
}

async function promptUserDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  try {
    if (chrome?.downloads?.download) {
      await chrome.downloads.download({
        url,
        filename,
        saveAs: true
      });
    } else {
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.click();
    }
  } finally {
    URL.revokeObjectURL(url);
  }
}

trialFilesInput?.addEventListener("change", () => {
  selectedTrialFiles.length = 0;
  selectedTrialFiles.push(...(trialFilesInput.files ? Array.from(trialFilesInput.files) : []));
  if (!selectedTrialFiles.length) {
    updateTrialFilesStatus("No files selected.");
    hideUploadPrompt();
  } else {
    updateTrialFilesStatus(`${selectedTrialFiles.length} file(s) ready to zip.`);
  }
});

function hideUploadPrompt() {
  if (uploadPrompt) uploadPrompt.style.display = "none";
  if (zipFilenameField) zipFilenameField.value = "";
}

function showUploadPrompt(zipName) {
  if (!uploadPrompt || !zipFilenameField || !uploadPromptText) return;
  const displayName = zipName ? zipName.replace(/\.zip$/i, "") : "";
  zipFilenameField.value = displayName;
  uploadPromptText.textContent = zipName
    ? "Upload the downloaded zip file to the CRM Documents tab using the filename below."
    : "Upload the downloaded zip file to the CRM Documents tab.";
  uploadPrompt.style.display = "block";
}

copyZipFilenameBtn?.addEventListener("click", async () => {
  const name = zipFilenameField?.value;
  if (!name) return;
  await navigator.clipboard.writeText(name);
  copyZipFilenameBtn.textContent = "Copied!";
  setTimeout(() => { copyZipFilenameBtn.textContent = "Copy filename"; }, 1200);
});

/* ---------------- Reset everything after success ---------------- */

function resetAllFieldsAndUI() {
  setValue("deviceNumberInput", "");
  setValue("firstName", "");
  setValue("lastName", "");
  setValue("aac", "");
  setValue("crmId", "");

  if (conditionSelect) {
    conditionSelect.value = "";
    conditionSelect.required = true;
  }

  const vocabNotReturned = document.getElementById("vocabNotReturned");
  if (vocabNotReturned) vocabNotReturned.checked = false;

  clearRepairsUI();

  const cameraLuminSection = document.getElementById("cameraLuminSection");
  const accessorySection = document.getElementById("accessorySection");
  if (cameraLuminSection) cameraLuminSection.style.display = "none";
  if (mountSection) mountSection.style.display = "none";
  if (accessorySection) accessorySection.style.display = "none";

  document.querySelectorAll(
    'input[name="cameraNumber"], input[name="luminNumber"], input[name="clampMount"], input[name="tableMount"], input[name="rollingMount"], input[name="accessories"]'
  ).forEach(el => el.value = "");

  if (conditionContainer) conditionContainer.style.display = "block";
  updateDeviceRules();

  const msg = document.getElementById("thankYouMessage");
  if (msg) msg.style.display = "none";

  hideUploadPrompt();
}

/* ---------------- Submit: Check-in Device ---------------- */

document.getElementById("checkinForm")?.addEventListener("submit", async e => {
  e.preventDefault();

  // 1) Zip vocab files (if any) and prompt download
  let zipName = "";
  if (selectedTrialFiles.length) {
    if (typeof JSZip === "undefined") {
      alert("JSZip failed to load. Please reload the panel before submitting.");
      return;
    }
    updateTrialFilesStatus("Zipping selected files...");
    const zip = new JSZip();
    selectedTrialFiles.forEach(file => zip.file(file.name, file));
    const zipArrayBuffer = await zip.generateAsync({ type: "arraybuffer" });
    const zipBlob = new Blob([zipArrayBuffer], { type: "application/zip" });
    zipName = buildZipFilename();

    updateTrialFilesStatus("Prompting download so you can save the zip...");
    await promptUserDownload(zipBlob, zipName);
    clearSelectedTrialFiles(`Downloaded "${zipName}". Upload it to the CRM Documents tab.`);
  } else {
    hideUploadPrompt();
  }

  // 2) Build note + clipboard backup
  const note = buildCannedNote();
  await navigator.clipboard.writeText(note);

  // 2.5) Remember identifiers for the inventory page
  await saveLastIdentifiers(getCurrentIdentifiers());

  // 3) Fill note in CRM
  const setNoteRes = await sendToCrm("SET_CRM_NOTE", { xpath: NOTE_BOX_XPATH, noteText: note });
  if (!setNoteRes.ok) { alert("Failed to fill CRM note box."); return; }

  // 4) Select category
  const setCatRes = await sendToCrm("SET_DROPDOWN_BY_TEXT", { xpath: NOTE_CATEGORY_XPATH, text: "Device Returned" });
  if (!setCatRes.ok) { alert('Failed to select note category "Device Returned".'); return; }

  // 5) Submit note
  const clickRes = await sendToCrm("CLICK_BY_XPATH", { xpath: NOTE_SUBMIT_XPATH });
  if (!clickRes.ok) { alert("Failed to submit the note."); return; }

  // ✅ SUCCESS
  resetAllFieldsAndUI();
  setText("notePreviewText", note);
  setText("completeIntro", "CRM note submitted. Review the details below.");
  if (zipName) {
    showUploadPrompt(zipName);
  }
  showCompleteView();
});

/* ---------------- Start another Checkin ---------------- */

document.getElementById("startAnotherBtn")?.addEventListener("click", () => {
  chrome.tabs.create({ url: "https://portal.talktometechnologies.com/admin/ManageInventory.aspx" });
});

/* ---------------- Refresh ---------------- */

document.getElementById("refreshBtn")?.addEventListener("click", async () => {
  const res = await fetchClientData();
  if (res?.data) applyClientData(res.data);
});

chrome.runtime.onMessage.addListener(msg => {
  if (msg?.type === "CLIENT_DATA_CHANGED") applyClientData(msg.data);
});

/* ---------------- Inventory page ---------------- */

document.getElementById("runInventoryScriptBtn")?.addEventListener("click", async () => {
  const identifiers = await updateInventorySearchDisplay();
  const searchValue = buildInventorySearchValue(identifiers);
  if (!searchValue) {
    alert("No device, camera, or Lumin-I number stored. Fill out the first page first.");
    return;
  }

  const status = document.getElementById("inventoryStatus");
  if (status) status.textContent = `Looking for "${searchValue}"...`;
  setInventoryNextStepVisibility(false);

  const res = await sendToCrm("RUN_INVENTORY_SCRIPT", { identifiers });
  if (!res.ok) {
    alert(res.message || "Failed to run inventory script.");
    if (status) status.textContent = "";
    return;
  }

  if (status) status.textContent = "Script sent to page. Watch the table for the highlighted row.";
  setInventoryNextStepVisibility(true);
});

document.getElementById("inventoryNextStepBtn")?.addEventListener("click", () => {
  chrome.tabs.create({ url: INVENTORY_NEXT_STEP_URL });
});

/* ---------------- Init ---------------- */

(async function init() {
  const activeTab = await getActiveCrmTab();
  watchIdentifierInputs();
  await syncViewForTab(activeTab);

  chrome.tabs.onActivated.addListener(async ({ tabId }) => {
    const tab = await chrome.tabs.get(tabId).catch(() => null);
    await syncViewForTab(tab);
  });

  chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    if (tab?.active && changeInfo?.status === "complete") {
      await syncViewForTab(tab);
    }
  });
})();
