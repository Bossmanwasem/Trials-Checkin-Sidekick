// panel.js

/* ---------------- CONFIG / XPATHS ---------------- */

// Notes (still used)
const NOTE_BOX_XPATH = '//*[@id="ctl00_MainContent_Tabs_tpNotes_txtNote"]';
const NOTE_CATEGORY_XPATH = '//*[@id="ctl00_MainContent_Tabs_tpNotes_ddlEditNoteCategory"]';
const NOTE_SUBMIT_XPATH = '//*[@id="ctl00_MainContent_Tabs_tpNotes_btnAddNote"]';
const DOCUMENTS_TAB_XPATH = '//*[@id="__tab_ctl00_MainContent_Tabs_tpDocuments"]';
const IDENTIFIER_STORAGE_KEY = "ttmtLastInventoryIdentifiers";
const INVENTORY_NEXT_STEP_URL = "https://talktometechnologies2com.sharepoint.com/sites/TrialsSharePoint2/_layouts/15/listforms.aspx?cid=ZTg4MWI0ZDItYWRiOS00ODc2LThlNmMtODliMWZkMDY2MTY2&nav=MTY3M2YzY2ItNDI0OC00ZGI2LTkwNzItYjA0MDAxMjEyMDNk&preview=true";
const DAF_DATA_STORAGE_KEY = "ttmtLastCheckinForDaf";
const THEME_STORAGE_KEY = "ttmtSidekickTheme";

/* ---------------- Helpers ---------------- */
const VIEW_IDS = ["landingView", "crmNavigatorView", "formView", "completeView", "inventoryView", "dafRecapView", "emailView"];

function showView(targetId) {
  VIEW_IDS.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.style.display = id === targetId ? "block" : "none";
  });
}

function showLandingView() { showView("landingView"); }
function showCrmNavigatorView() { showView("crmNavigatorView"); }
function showCompleteView() { showView("completeView"); }
function showFormView() { showView("formView"); }
function showInventoryView() { showView("inventoryView"); }
function showDafView() { showView("dafRecapView"); }
function showEmailView() { showView("emailView"); }

let hasStartedCheckin = false;

const THEMES = {
  ocean: {
    label: "Ocean Blue",
    vars: {
      "bg-color": "#121212",
      "text-color": "#e0e0e0",
      "muted-text": "#d5e9ff",
      "container-bg": "#1e1e2f",
      "container-border": "#81cfff",
      "container-shadow": "0 0 20px rgba(0, 128, 255, 0.25)",
      "accent": "#81cfff",
      "accent-strong": "#003366",
      "accent-strong-hover": "#005599",
      "input-bg": "#2a2a3a",
      "input-border": "#555",
      "note-bg": "#0f1b2b",
      "note-border": "#2f4b6f",
      "error-color": "#ff7b7b"
    }
  },
  sunset: {
    label: "Sunset Ember",
    vars: {
      "bg-color": "#141010",
      "text-color": "#f3e9e4",
      "muted-text": "#f8c9b4",
      "container-bg": "#2a1917",
      "container-border": "#ff9f68",
      "container-shadow": "0 0 20px rgba(255, 159, 104, 0.28)",
      "accent": "#ff9f68",
      "accent-strong": "#6b2b1f",
      "accent-strong-hover": "#8b3a2b",
      "input-bg": "#33201d",
      "input-border": "#6b3b30",
      "note-bg": "#201312",
      "note-border": "#5f3a33",
      "error-color": "#ff8f8f"
    }
  },
  forest: {
    label: "Forest Glow",
    vars: {
      "bg-color": "#0d1512",
      "text-color": "#e7f8f1",
      "muted-text": "#b8f3dc",
      "container-bg": "#14211c",
      "container-border": "#6ee7b7",
      "container-shadow": "0 0 20px rgba(110, 231, 183, 0.25)",
      "accent": "#6ee7b7",
      "accent-strong": "#0f4d37",
      "accent-strong-hover": "#14614a",
      "input-bg": "#1e2d26",
      "input-border": "#3b5c4e",
      "note-bg": "#0f1a15",
      "note-border": "#2b4a3d",
      "error-color": "#ff9f9f"
    }
  },
  plum: {
    label: "Plum Night",
    vars: {
      "bg-color": "#120f18",
      "text-color": "#f2e9ff",
      "muted-text": "#dbc7ff",
      "container-bg": "#1f1930",
      "container-border": "#c084fc",
      "container-shadow": "0 0 20px rgba(192, 132, 252, 0.3)",
      "accent": "#c084fc",
      "accent-strong": "#4b1e6b",
      "accent-strong-hover": "#5e2a87",
      "input-bg": "#2a2140",
      "input-border": "#5b4b73",
      "note-bg": "#151021",
      "note-border": "#3b2f52",
      "error-color": "#ff9ccf"
    }
  },
  slate: {
    label: "Slate Storm",
    vars: {
      "bg-color": "#101317",
      "text-color": "#e6ecf2",
      "muted-text": "#c0cad8",
      "container-bg": "#18202a",
      "container-border": "#94a3b8",
      "container-shadow": "0 0 20px rgba(148, 163, 184, 0.25)",
      "accent": "#94a3b8",
      "accent-strong": "#273449",
      "accent-strong-hover": "#33445e",
      "input-bg": "#222b36",
      "input-border": "#4b5a6b",
      "note-bg": "#111821",
      "note-border": "#2a3646",
      "error-color": "#ff9f9f"
    }
  },
  aurora: {
    label: "Aurora Mint",
    vars: {
      "bg-color": "#0b1413",
      "text-color": "#e7fffb",
      "muted-text": "#b6f7ea",
      "container-bg": "#12201e",
      "container-border": "#5eead4",
      "container-shadow": "0 0 20px rgba(94, 234, 212, 0.25)",
      "accent": "#5eead4",
      "accent-strong": "#0f4b45",
      "accent-strong-hover": "#146056",
      "input-bg": "#1a2b29",
      "input-border": "#355a55",
      "note-bg": "#0c1716",
      "note-border": "#284946",
      "error-color": "#ff9fb0"
    }
  },
  citrus: {
    label: "Citrus Pop",
    vars: {
      "bg-color": "#14130a",
      "text-color": "#fff5d7",
      "muted-text": "#fde68a",
      "container-bg": "#2a250e",
      "container-border": "#facc15",
      "container-shadow": "0 0 20px rgba(250, 204, 21, 0.28)",
      "accent": "#facc15",
      "accent-strong": "#7a5a00",
      "accent-strong-hover": "#946b00",
      "input-bg": "#332c11",
      "input-border": "#6d5a14",
      "note-bg": "#1b1708",
      "note-border": "#574a13",
      "error-color": "#ff9f9f"
    }
  },
  sand: {
    label: "Desert Sand",
    vars: {
      "bg-color": "#14100d",
      "text-color": "#fdf4e7",
      "muted-text": "#f7d8b4",
      "container-bg": "#2a2019",
      "container-border": "#f5d0a9",
      "container-shadow": "0 0 20px rgba(245, 208, 169, 0.25)",
      "accent": "#f5d0a9",
      "accent-strong": "#7a4a2c",
      "accent-strong-hover": "#955935",
      "input-bg": "#332720",
      "input-border": "#6d5443",
      "note-bg": "#1b140f",
      "note-border": "#584234",
      "error-color": "#ff9aa2"
    }
  },
  midnight: {
    label: "Midnight Violet",
    vars: {
      "bg-color": "#0c0b16",
      "text-color": "#f2edff",
      "muted-text": "#cfc9ff",
      "container-bg": "#1a1830",
      "container-border": "#8b5cf6",
      "container-shadow": "0 0 20px rgba(139, 92, 246, 0.28)",
      "accent": "#8b5cf6",
      "accent-strong": "#3b2470",
      "accent-strong-hover": "#4b2f8f",
      "input-bg": "#241f3f",
      "input-border": "#514177",
      "note-bg": "#120f22",
      "note-border": "#3a2f5c",
      "error-color": "#ff9ccf"
    }
  },
  rose: {
    label: "Rose Quartz",
    vars: {
      "bg-color": "#150f14",
      "text-color": "#ffeaf4",
      "muted-text": "#f9c4db",
      "container-bg": "#2a1822",
      "container-border": "#f472b6",
      "container-shadow": "0 0 20px rgba(244, 114, 182, 0.28)",
      "accent": "#f472b6",
      "accent-strong": "#7a2a4d",
      "accent-strong-hover": "#95325f",
      "input-bg": "#33202c",
      "input-border": "#6d4054",
      "note-bg": "#1c0f17",
      "note-border": "#573245",
      "error-color": "#ff8fab"
    }
  }
};

function setThemeVars(vars) {
  Object.entries(vars).forEach(([key, value]) => {
    document.documentElement.style.setProperty(`--${key}`, value);
  });
}

function updateThemeSelection(themeId) {
  const current = THEMES[themeId] || THEMES.ocean;
  const label = document.getElementById("themeCurrentLabel");
  if (label) label.textContent = `Current theme: ${current.label}`;

  document.querySelectorAll(".theme-option").forEach(btn => {
    const isActive = btn.dataset.theme === themeId;
    btn.classList.toggle("active", isActive);
    btn.setAttribute("aria-pressed", isActive ? "true" : "false");
  });
}

function saveThemePreference(themeId) {
  if (chrome?.storage?.local) {
    chrome.storage.local.set({ [THEME_STORAGE_KEY]: themeId });
    return;
  }
  localStorage.setItem(THEME_STORAGE_KEY, themeId);
}

function applyTheme(themeId, { persist = true } = {}) {
  const resolvedTheme = THEMES[themeId] ? themeId : "ocean";
  const theme = THEMES[resolvedTheme];
  setThemeVars(theme.vars);
  updateThemeSelection(resolvedTheme);
  if (persist) saveThemePreference(resolvedTheme);
}

function loadThemePreference() {
  if (chrome?.storage?.local) {
    chrome.storage.local.get(THEME_STORAGE_KEY, res => {
      applyTheme(res?.[THEME_STORAGE_KEY] || "ocean", { persist: false });
    });
    return;
  }
  applyTheme(localStorage.getItem(THEME_STORAGE_KEY) || "ocean", { persist: false });
}

function initThemeControls() {
  const menuBtn = document.getElementById("themeMenuBtn");
  const menu = document.getElementById("themeMenu");
  menuBtn?.addEventListener("click", () => {
    if (!menu) return;
    const isOpen = menu.style.display === "block";
    menu.style.display = isOpen ? "none" : "block";
    menuBtn.setAttribute("aria-expanded", isOpen ? "false" : "true");
  });

  document.querySelectorAll(".theme-option").forEach(btn => {
    btn.addEventListener("click", () => {
      applyTheme(btn.dataset.theme);
      if (menu && menuBtn) {
        menu.style.display = "none";
        menuBtn.setAttribute("aria-expanded", "false");
      }
    });
  });
}

initThemeControls();
loadThemePreference();

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

async function getActiveDafTabId() {
  const tab = await getActiveCrmTab();
  if (tab?.id && isDafFormUrl(tab.url)) return tab.id;

  const tabs = await chrome.tabs.query({
    url: "*://talktometechnologies2com.sharepoint.com/*listforms.aspx*"
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
const repairButtons = Array.from(document.querySelectorAll(".repair-btn"));

function updateRepairsBox() {
  const items = [];
  repairButtons
    .filter(btn => btn.classList.contains("active") && btn.id !== "otherRepairBtn")
    .forEach(btn => items.push(btn.textContent.trim()));

  const otherText = otherInput?.value?.trim() || "";
  if (otherText) items.push("Other: " + otherText);

  if (repairsBox) repairsBox.value = items.join(", ");
}

repairButtons.forEach(btn => {
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
  repairButtons.forEach(b => b.classList.remove("active"));
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
  return vocabNotReturned ? "No vocab returned." : "I saved vocab to the CRM.";
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

function collectCheckinFormDataForDaf() {
  const firstName = sanitizeName(getFormValue("#firstName"));
  const lastName = sanitizeName(getFormValue("#lastName"));

  return {
    deviceNumber: getFormValue("#deviceNumberInput"),
    cameraNumber: getFormValue('input[name="cameraNumber"]'),
    luminNumber: getFormValue('input[name="luminNumber"]'),
    crmId: getFormValue("#crmId"),
    firstName,
    lastName,
    aac: getFormValue("#aac"),
    clampMount: getFormValue('input[name="clampMount"]'),
    tableMount: getFormValue('input[name="tableMount"]'),
    rollingMount: getFormValue('input[name="rollingMount"]')
  };
}

function saveLastCheckinDataForDaf(data) {
  if (!chrome?.storage?.local) return Promise.resolve();
  return new Promise(resolve => {
    chrome.storage.local.set({ [DAF_DATA_STORAGE_KEY]: data }, resolve);
  });
}

function getLastCheckinDataForDaf() {
  if (!chrome?.storage?.local) return Promise.resolve(null);
  return new Promise(resolve => {
    chrome.storage.local.get(DAF_DATA_STORAGE_KEY, res => {
      resolve(res?.[DAF_DATA_STORAGE_KEY] || null);
    });
  });
}

function clearStoredCheckinData() {
  if (!chrome?.storage?.local) return Promise.resolve();
  return new Promise(resolve => {
    chrome.storage.local.remove([IDENTIFIER_STORAGE_KEY, DAF_DATA_STORAGE_KEY], resolve);
  });
}

function buildInventorySearchValue({ deviceNumber = "", cameraNumber = "", luminNumber = "" } = {}) {
  return (cameraNumber || "").trim() || (luminNumber || "").trim() || (deviceNumber || "").trim() || "";
}

function buildDafRecapEntries(data) {
  if (!data) return [];

  const fullName = [data.firstName, data.lastName].filter(Boolean).join(" ");

  return [
    { key: "deviceNumber", label: "Device", value: data.deviceNumber },
    { key: "cameraNumber", label: "Camera", value: data.cameraNumber },
    { key: "luminNumber", label: "Lumin-I", value: data.luminNumber },
    { key: "crmId", label: "CRM ID", value: data.crmId },
    { key: "clientName", label: "Client", value: fullName },
    { key: "aac", label: "AAC (copy only)", value: data.aac },
    { key: "clampMount", label: "Clamp Mount", value: data.clampMount },
    { key: "tableMount", label: "Table Mount", value: data.tableMount },
    { key: "rollingMount", label: "Rolling Mount", value: data.rollingMount }
  ];
}

const CRM_LINK_BASE = "https://portal.talktometechnologies.com/admin/EditClient.aspx?ID=";

function buildCrmLink(data) {
  const crmId = `${data?.crmId ?? ""}`.trim();
  if (!crmId) return "";
  return `${CRM_LINK_BASE}${crmId}`;
}

function buildOutlookEmailPayload(data, { crmLink = "" } = {}) {
  const fullName = [data?.firstName, data?.lastName].filter(Boolean).join(" ").trim() || "Client";
  const subject = `${data?.aac || "AAC"} | ${fullName} Device Returned.`;
  const lines = [];
  lines.push(`${fullName} Device was returned.`);

  if (data?.deviceNumber) {
    lines.push(`Device: ${data.deviceNumber}`);
  }

  const hasExtraDetails = Boolean(
    data?.cameraNumber ||
    data?.luminNumber ||
    data?.clampMount ||
    data?.tableMount ||
    data?.rollingMount
  );

  if (hasExtraDetails) {
    lines.push("");
  }

  if (data?.cameraNumber) {
    lines.push(`Camera Number: ${data.cameraNumber}`);
  }

  if (data?.luminNumber) {
    lines.push(`Lumini: ${data.luminNumber}`);
  }

  if (data?.clampMount) {
    lines.push(`Clamp Mount: ${data.clampMount}`);
  }
  if (data?.tableMount) {
    lines.push(`Table Mount: ${data.tableMount}`);
  }
  if (data?.rollingMount) {
    lines.push(`Rolling Mount: ${data.rollingMount}`);
  }

  if (crmLink) {
    lines.push("", crmLink);
  }

  const to = "trials@talktometechnologies.com";
  return { subject, body: lines.join("\n"), to };
}

function buildOutlookComposeUrl({ subject, body, to = "" }) {
  const params = new URLSearchParams();
  if (subject) params.set("subject", subject);
  if (body) params.set("body", body);
  const query = params.toString();
  return `mailto:${encodeURIComponent(to)}${query ? `?${query}` : ""}`;
}

async function renderOutlookEmailPreview() {
  const data = await getLastCheckinDataForDaf();
  const crmLink = buildCrmLink(data);
  const payload = buildOutlookEmailPayload(data, { crmLink });
  setValue("emailSubjectField", payload.subject);
  setText("emailBodyPreview", payload.body);
  setText("emailStatus", "");
  return payload;
}

async function renderDafRecap() {
  const recapEl = document.getElementById("dafRecapFields");
  const emptyEl = document.getElementById("dafRecapEmpty");
  const statusEl = document.getElementById("dafRecapStatus");
  const data = await getLastCheckinDataForDaf();
  const entries = buildDafRecapEntries(data);

  if (recapEl) {
    recapEl.innerHTML = "";
    if (entries.length) {
      entries.forEach(entry => {
        const wrapper = document.createElement("div");
        wrapper.className = "daf-field";

        const labelEl = document.createElement("div");
        labelEl.className = "daf-field__label";
        labelEl.textContent = entry.label;

        const row = document.createElement("div");
        row.className = "copy-row";

        const valInput = document.createElement("input");
        valInput.type = "text";
        valInput.className = "copy-field";
        valInput.readOnly = true;
        valInput.value = entry.value || "";
        valInput.placeholder = "—";

        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "copy-btn";
        btn.textContent = entry.value ? "Copy" : "No value";
        btn.dataset.copyValue = entry.value || "";
        btn.disabled = !entry.value;

        row.appendChild(valInput);
        row.appendChild(btn);

        wrapper.appendChild(labelEl);
        wrapper.appendChild(row);

        recapEl.appendChild(wrapper);
      });
    }
  }

  if (emptyEl) {
    emptyEl.style.display = entries.length ? "none" : "block";
    emptyEl.textContent = entries.length
      ? ""
      : "No check-in details saved. Submit a check-in to populate this page.";
  }

  if (statusEl) {
    statusEl.textContent = entries.length
      ? "We'll auto-fill the DAF form using these values. Use the Copy buttons if the form blocks autofill."
      : "No saved check-in found. Fill out the check-in form first.";
  }

  return data;
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

function isDafFormUrl(url) {
  return typeof url === "string"
    && url.includes("talktometechnologies2com.sharepoint.com/")
    && url.includes("listforms.aspx");
}

async function closeManageInventoryTabs(excludeTabId = null) {
  const tabs = await chrome.tabs.query({
    url: "*://portal.talktometechnologies.com/*ManageInventory.aspx*"
  });
  const tabIds = tabs
    .map(tab => tab.id)
    .filter(tabId => typeof tabId === "number" && tabId !== excludeTabId);
  if (tabIds.length) {
    await chrome.tabs.remove(tabIds);
  }
}

async function syncViewForTab(tab) {
  if (!tab) return;
  if (!hasStartedCheckin) return;

  if (isDafFormUrl(tab.url)) {
    await renderDafRecap();
    await closeManageInventoryTabs(tab.id);
    showDafView();
    return;
  }

  if (!isCrmUrl(tab.url)) return;

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
  setText("notePreviewText", "");
  setText("completeIntro", "");
  setText("inventoryStatus", "");
  setInventoryNextStepVisibility(false);
}

async function finishCheckinAndReset() {
  resetAllFieldsAndUI();
  clearSelectedTrialFiles();
  await clearStoredCheckinData();
  await updateInventorySearchDisplay();
  await renderDafRecap();
  showFormView();
}

/* ---------------- Submit: Check-in Device ---------------- */

document.getElementById("checkinForm")?.addEventListener("submit", async e => {
  e.preventDefault();

  const deviceNumber = getFormValue("#deviceNumberInput");
  const isMountOnly = deviceNumber.toLowerCase() === "x";

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

  // 2.5) Remember identifiers for the inventory page + DAF recap
  await saveLastIdentifiers(getCurrentIdentifiers());
  await saveLastCheckinDataForDaf(collectCheckinFormDataForDaf());

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
  if (isMountOnly) {
    await renderDafRecap();
    showDafView();
    chrome.tabs.create({ url: INVENTORY_NEXT_STEP_URL });
    return;
  }

  setText("completeIntro", "CRM note submitted. Review the details below.");
  await sendToCrm("CLICK_BY_XPATH", { xpath: DOCUMENTS_TAB_XPATH });
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

document.getElementById("inventoryNextStepBtn")?.addEventListener("click", async () => {
  await renderDafRecap();
  showDafView();
  chrome.tabs.create({ url: INVENTORY_NEXT_STEP_URL });
});

document.getElementById("finishCheckinBtn")?.addEventListener("click", async () => {
  await renderOutlookEmailPreview();
  showEmailView();
});

document.getElementById("copyEmailBodyBtn")?.addEventListener("click", async () => {
  const payload = await renderOutlookEmailPreview();
  if (!payload?.body) return;
  await navigator.clipboard.writeText(payload.body);
  const status = document.getElementById("emailStatus");
  if (status) status.textContent = "Email body copied to clipboard.";
});

document.getElementById("copyEmailSubjectBtn")?.addEventListener("click", async () => {
  const payload = await renderOutlookEmailPreview();
  if (!payload?.subject) return;
  await navigator.clipboard.writeText(payload.subject);
  const status = document.getElementById("emailStatus");
  if (status) status.textContent = "Email subject copied to clipboard.";
});

document.getElementById("emailDoneBtn")?.addEventListener("click", async () => {
  await finishCheckinAndReset();
});

document.getElementById("dafRecapFields")?.addEventListener("click", async (e) => {
  const btn = e.target.closest("button.copy-btn");
  if (!btn || !btn.dataset.copyValue) return;
  await navigator.clipboard.writeText(btn.dataset.copyValue);
  const original = btn.textContent;
  btn.textContent = "Copied!";
  setTimeout(() => { btn.textContent = original; }, 1200);
});

document.getElementById("dafAutofillBtn")?.addEventListener("click", async () => {
  const status = document.getElementById("dafRecapStatus");
  if (status) status.textContent = "Triggering autofill in the DAF form tab...";

  const tabId = await getActiveDafTabId();
  if (!tabId) {
    if (status) status.textContent = "No DAF form tab found. Open the DAF form and try again.";
    return;
  }

  const res = await chrome.tabs.sendMessage(tabId, { type: "RUN_DAF_AUTOFILL" }).catch(() => null);
  if (!res?.ok) {
    if (status) status.textContent = res?.message || "Autofill failed. Try again or use the copy buttons.";
    return;
  }

  if (status) status.textContent = "Autofill triggered. Check the DAF form tab.";
});

/* ---------------- Init ---------------- */

(async function init() {
  watchIdentifierInputs();
  showLandingView();

  document.getElementById("startCheckinBtn")?.addEventListener("click", async () => {
    hasStartedCheckin = true;
    showFormView();
    const activeTab = await getActiveCrmTab();
    await syncViewForTab(activeTab);
  });

  document.getElementById("crmNavigatorBtn")?.addEventListener("click", () => {
    showCrmNavigatorView();
  });

  document.getElementById("crmNavigatorForm")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const crmInput = document.getElementById("crmNavigatorInput");
    const crmId = (crmInput?.value || "").trim();
    if (!crmId) {
      alert("Enter a CRM ID to continue.");
      return;
    }
    chrome.tabs.create({
      url: `https://portal.talktometechnologies.com/Admin/EditClient.aspx?ID=${encodeURIComponent(crmId)}`
    });
    if (crmInput) crmInput.value = "";
  });

  document.getElementById("crmNavigatorReturnBtn")?.addEventListener("click", () => {
    showLandingView();
  });

  document.getElementById("returnToLandingBtn")?.addEventListener("click", () => {
    showLandingView();
  });

  const activeTab = await getActiveCrmTab();
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
