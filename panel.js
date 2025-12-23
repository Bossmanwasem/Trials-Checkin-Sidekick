// panel.js

/* ---------------- CONFIG / XPATHS ---------------- */

// Notes (still used)
const NOTE_BOX_XPATH = '//*[@id="ctl00_MainContent_Tabs_tpNotes_txtNote"]';
const NOTE_CATEGORY_XPATH = '//*[@id="ctl00_MainContent_Tabs_tpNotes_ddlEditNoteCategory"]';
const NOTE_SUBMIT_XPATH = '//*[@id="ctl00_MainContent_Tabs_tpNotes_btnAddNote"]';
const INVENTORY_URL = "https://portal.talktometechnologies.com/admin/ManageInventory.aspx";

/* ---------------- Helpers ---------------- */
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

function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text || "";
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

function getInventorySearchValue() {
  const device = getFormValue("#deviceNumberInput");
  const lumin = getFormValue('input[name="luminNumber"]');
  const camera = getFormValue('input[name="cameraNumber"]');
  return lumin || camera || device;
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

/* ---------------- Inventory script ---------------- */

async function waitForInventoryTabReady(tabId) {
  const tab = await chrome.tabs.get(tabId).catch(() => null);
  if (tab?.status === "complete" && tab.url?.startsWith(INVENTORY_URL)) return tabId;

  return new Promise(resolve => {
    const timeout = setTimeout(() => {
      chrome.tabs.onUpdated.removeListener(onUpdated);
      resolve(tabId);
    }, 15000);

    const onUpdated = (updatedTabId, info, updatedTab) => {
      if (updatedTabId !== tabId) return;
      if (updatedTab?.url?.startsWith(INVENTORY_URL) && info.status === "complete") {
        clearTimeout(timeout);
        chrome.tabs.onUpdated.removeListener(onUpdated);
        resolve(tabId);
      }
    };

    chrome.tabs.onUpdated.addListener(onUpdated);
  });
}

async function openInventoryTab() {
  const existing = await chrome.tabs.query({ url: `${INVENTORY_URL}*` }).catch(() => []);
  if (existing?.length && existing[0]?.id) {
    await chrome.tabs.update(existing[0].id, { active: true }).catch(() => null);
    return existing[0].id;
  }

  const created = await chrome.tabs.create({ url: INVENTORY_URL, active: true }).catch(() => null);
  return created?.id || null;
}

async function ensureInventoryContentScript(tabId) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ["content.js"]
    });
    return true;
  } catch {
    return false;
  }
}

async function runInventoryScript(searchValue) {
  const tabId = await openInventoryTab();
  if (!tabId) {
    alert("Could not open the inventory tab.");
    return;
  }

  const readyTabId = await waitForInventoryTabReady(tabId);
  const injected = await ensureInventoryContentScript(readyTabId);
  if (!injected) {
    alert("Failed to inject inventory helper. Make sure the inventory page is loaded.");
    return;
  }

  const res = await chrome.tabs.sendMessage(readyTabId, {
    type: "RUN_INVENTORY_SCRIPT",
    searchValue
  }).catch(() => null);

  if (!res?.ok) {
    alert(res?.error || "Failed to run the inventory script. Make sure the inventory page is loaded.");
  }
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

  // 5) Run inventory script if data present
  const searchValue = getInventorySearchValue();
  if (searchValue) {
    await runInventoryScript(searchValue);
  }

  // ✅ SUCCESS
  resetAllFieldsAndUI();
  setText("notePreviewText", note);
  setText("completeIntro", "Please mark your device as returned and confirm your CRM note below.");
  setText("inventoryStatus", searchValue ? "Inventory script run. Verify the device shows as returned." : "No device or accessory ID provided for inventory search.");
  showCompleteView();
});

/* ---------------- Inventory button ---------------- */
// Removed dedicated button; inventory now runs during check-in when possible.

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
