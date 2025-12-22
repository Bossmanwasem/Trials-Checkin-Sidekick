// panel.js

/* ---------------- CONFIG / XPATHS ---------------- */

// Notes (still used)
const NOTE_BOX_XPATH = '//*[@id="ctl00_MainContent_Tabs_tpNotes_txtNote"]';
const NOTE_CATEGORY_XPATH = '//*[@id="ctl00_MainContent_Tabs_tpNotes_ddlEditNoteCategory"]';
const NOTE_SUBMIT_XPATH = '//*[@id="ctl00_MainContent_Tabs_tpNotes_btnAddNote"]';

// Documents (re-enabled)
const CRM_FILE_INPUT_XPATH = '//*[@id="ctl00_MainContent_Tabs_tpDocuments_filUpload"]';
const CRM_UPLOAD_BUTTON_XPATH = '//*[@id="ctl00_MainContent_Tabs_tpDocuments_btnUpload"]';
const CRM_DOCUMENT_TITLE_XPATH = '//*[@id="ctl00_MainContent_Tabs_tpDocuments_txtDocumentTitle"]';
const CRM_ADD_DOCUMENT_XPATH = '//*[@id="ctl00_MainContent_Tabs_tpDocuments_btnAddDocument"]';
const UPLOAD_SUCCESS_LABEL_XPATH = '//*[@id="ctl00_MainContent_Tabs_tpDocuments_lblFileUploadSuccess"]';

/* ---------------- Helpers ---------------- */

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function showCompleteView() {
  const formView = document.getElementById("formView");
  const completeView = document.getElementById("completeView");
  if (formView) formView.style.display = "none";
  if (completeView) completeView.style.display = "block";
}

function showFormView() {
  const formView = document.getElementById("formView");
  const completeView = document.getElementById("completeView");
  if (completeView) completeView.style.display = "none";
  if (formView) formView.style.display = "block";
}

function setValue(id, val) {
  const el = document.getElementById(id);
  if (el) el.value = val || "";
}

function clearFileInput(inputId) {
  const input = document.getElementById(inputId);
  if (!input) return;
  input.value = "";
  if (input.files && input.files.length > 0) {
    const clone = input.cloneNode(true);
    input.parentNode.replaceChild(clone, input);
  }
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

/* ---------------- ZIP naming helpers ---------------- */

function formatTodayMMDDYYYY() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${mm}.${dd}.${yyyy}`;
}

function detectVocabTypesFromFiles(filesArray) {
  const found = new Set();
  const files = Array.isArray(filesArray) ? filesArray : Array.from(filesArray || []);
  for (const file of files) {
    const name = (file?.name || "").toLowerCase();
    if (name.endsWith(".grid3user")) found.add("Grid");
    if (name.endsWith(".ce")) found.add("Saltillo");
    if (name.endsWith(".p2gbk")) found.add("P2G");
  }
  return Array.from(found);
}

function buildZipFileNameFromSelectedFiles(filesArray) {
  const first = getFormValue("#firstName") || "Client";
  const last = getFormValue("#lastName") || "";
  const fullName = `${first} ${last}`.trim();
  const dateStr = formatTodayMMDDYYYY();

  const files = Array.isArray(filesArray) ? filesArray : Array.from(filesArray || []);
  const vocabTypes = detectVocabTypesFromFiles(files);

  if (vocabTypes.length > 0) {
    return `${fullName} ${vocabTypes.join(", ")} Vocab Sets from Trial ${dateStr}.zip`;
  }
  if (files.length > 0) {
    return `${fullName} (vocab files present) Vocab Sets from Trial ${dateStr}.zip`;
  }
  return `${fullName} Vocab Sets from Trial ${dateStr}.zip`;
}

/* ---------------- NOTE helpers ---------------- */

function buildVocabLine() {
  const vocabNotReturned = document.getElementById("vocabNotReturned")?.checked === true;
  return vocabNotReturned ? "No vocab returned." : "Vocab was saved to the CRM.";
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
  const first = getFormValue("#firstName");
  const last = getFormValue("#lastName");
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

/* ---------------- ZIP: Build once -> Download + Upload ---------------- */

async function buildZipBytesFromSelectedFiles() {
  const fileInput = document.getElementById("vocabFiles");
  const files = fileInput?.files ? Array.from(fileInput.files) : [];
  if (files.length === 0) return { ok: true, skipped: true };

  if (typeof JSZip === "undefined") return { ok: false, error: "JSZip not loaded" };

  const z = new JSZip();
  for (const f of files) z.file(f.name, f);

  const zipName = buildZipFileNameFromSelectedFiles(files);

  // ✅ generate once (arraybuffer), reuse for both download + upload
  const bytes = await z.generateAsync({ type: "arraybuffer" });

  return { ok: true, zipName, bytes };
}

async function downloadZip(zipName, bytes) {
  // Requires "downloads" permission
  const blob = new Blob([new Uint8Array(bytes)], { type: "application/zip" });
  const url = URL.createObjectURL(blob);

  try {
    await chrome.downloads.download({
      url,
      filename: zipName,
      saveAs: true
    });
  } catch {
    URL.revokeObjectURL(url);
    return { ok: false, error: "Download failed (check downloads permission)" };
  }

  await wait(1500);
  URL.revokeObjectURL(url);
  return { ok: true };
}

async function getUploadStatusText(tabId) {
  const res = await chrome.tabs.sendMessage(tabId, {
    type: "GET_TEXT_BY_XPATH",
    xpath: UPLOAD_SUCCESS_LABEL_XPATH
  }).catch(() => null);

  return (res?.text || "").trim();
}

async function waitForUploadStatusChange(tabId, previousText, timeoutMs = 45000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const txt = await getUploadStatusText(tabId);
    if (txt && txt !== previousText) return { ok: true, text: txt };
    await wait(600);
  }
  return { ok: false, text: previousText };
}

async function uploadZipToCrm(zipName, bytes) {
  const tabId = await getActiveCrmTabId();
  if (!tabId) return { ok: false, error: "No CRM tab found" };

  // 1) Attach file bytes to CRM file input
  const attachRes = await chrome.tabs.sendMessage(tabId, {
    type: "SET_FILE_INPUT_FROM_BYTES",
    xpath: CRM_FILE_INPUT_XPATH,
    bytes,
    filename: zipName
  }).catch(() => null);

  if (!attachRes?.ok) {
    return { ok: false, error: `Attach failed (${attachRes?.reason || "unknown"})` };
  }

  // 2) Verify CRM input actually has the file
  const infoRes = await chrome.tabs.sendMessage(tabId, {
    type: "GET_FILE_INPUT_INFO_BY_XPATH",
    xpath: CRM_FILE_INPUT_XPATH
  }).catch(() => null);

  if (!infoRes?.ok || (infoRes.count || 0) === 0) {
    return { ok: false, error: "CRM file input shows 0 attached files (not on Documents tab or CRM blocked it)" };
  }

  await wait(400);

  const preUploadStatus = await getUploadStatusText(tabId);

  // 3) Click Upload (CRM refreshes)
  const uploadClick = await chrome.tabs.sendMessage(tabId, {
    type: "CLICK_BY_XPATH",
    xpath: CRM_UPLOAD_BUTTON_XPATH
  }).catch(() => null);

  if (!uploadClick?.ok) return { ok: false, error: "Failed clicking Upload" };

  // 4) Wait for success label
  const status = await waitForUploadStatusChange(tabId, preUploadStatus, 45000);
  if (!status.ok) return { ok: false, error: "Upload status never changed or label missing" };

  const statusText = status.text || "";
  const statusLower = statusText.toLowerCase();
  const isSuccess = statusLower.includes("success") || statusLower.includes("uploaded") || statusLower.includes("complete");

  if (!isSuccess) {
    const detail = statusText ? `Upload reported: ${statusText}` : "Upload status label stayed empty";
    return { ok: false, error: detail };
  }

  // 5) Title textbox = zip name
  const titleRes = await chrome.tabs.sendMessage(tabId, {
    type: "SET_VALUE_BY_XPATH",
    xpath: CRM_DOCUMENT_TITLE_XPATH,
    value: zipName
  }).catch(() => null);

  if (!titleRes?.ok) return { ok: false, error: "Failed setting Document Title" };

  // 6) Click Add Document
  const addRes = await chrome.tabs.sendMessage(tabId, {
    type: "CLICK_BY_XPATH",
    xpath: CRM_ADD_DOCUMENT_XPATH
  }).catch(() => null);

  if (!addRes?.ok) return { ok: false, error: "Failed clicking Add Document" };

  return { ok: true };
}

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

  clearFileInput("vocabFiles");

  if (conditionContainer) conditionContainer.style.display = "block";
  updateDeviceRules();

  const msg = document.getElementById("thankYouMessage");
  if (msg) msg.style.display = "none";
}

/* ---------------- Submit: Check-in Device ---------------- */

document.getElementById("checkinForm")?.addEventListener("submit", async e => {
  e.preventDefault();

  // 1) Build note + clipboard backup
  const note = buildCannedNote();
  await navigator.clipboard.writeText(note);

  // 2) Fill note in CRM
  const setNoteRes = await sendToCrm("SET_CRM_NOTE", { xpath: NOTE_BOX_XPATH, noteText: note });
  if (!setNoteRes.ok) { alert("Failed to fill CRM note box."); return; }

  // 3) Select category
  const setCatRes = await sendToCrm("SET_DROPDOWN_BY_TEXT", { xpath: NOTE_CATEGORY_XPATH, text: "Device Returned" });
  if (!setCatRes.ok) { alert('Failed to select note category "Device Returned".'); return; }

  // 4) Submit note
  const clickRes = await sendToCrm("CLICK_BY_XPATH", { xpath: NOTE_SUBMIT_XPATH });
  if (!clickRes.ok) { alert("Failed to submit the note."); return; }

  // 5) ZIP (optional)
  const zipRes = await buildZipBytesFromSelectedFiles();
  if (!zipRes.ok) {
    alert(`Note submitted, but ZIP failed:\n\n${zipRes.error || "Unknown error"}`);
    return;
  }

  // 6) If files selected: download AND upload
  if (!zipRes.skipped) {
    const dlRes = await downloadZip(zipRes.zipName, zipRes.bytes);
    if (!dlRes.ok) {
      alert(`Note submitted, but ZIP download failed:\n\n${dlRes.error}`);
      return;
    }

    const upRes = await uploadZipToCrm(zipRes.zipName, zipRes.bytes);
    if (!upRes.ok) {
      alert(`Note submitted and ZIP downloaded, but CRM upload failed:\n\n${upRes.error}`);
      return; // keep fields so user can retry if desired
    }
  }

  // ✅ SUCCESS
  resetAllFieldsAndUI();
  showCompleteView();
});

/* ---------------- Start another Checkin ---------------- */

document.getElementById("startAnotherBtn")?.addEventListener("click", async () => {
  showFormView();
  const res = await fetchClientData();
  if (res?.data) applyClientData(res.data);
});

/* ---------------- Refresh ---------------- */

document.getElementById("refreshBtn")?.addEventListener("click", async () => {
  const res = await fetchClientData();
  if (res?.data) applyClientData(res.data);
});

chrome.runtime.onMessage.addListener(msg => {
  if (msg?.type === "CLIENT_DATA_CHANGED") applyClientData(msg.data);
});

/* ---------------- Init ---------------- */

(async function init() {
  const res = await fetchClientData();
  if (res?.data) applyClientData(res.data);
})();
