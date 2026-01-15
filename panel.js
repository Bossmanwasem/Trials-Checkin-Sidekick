// panel.js

/* ---------------- CONFIG / XPATHS ---------------- */

// Notes (still used)
const NOTE_BOX_XPATH = '//*[@id="ctl00_MainContent_Tabs_tpNotes_txtNote"]';
const NOTE_CATEGORY_XPATH = '//*[@id="ctl00_MainContent_Tabs_tpNotes_ddlEditNoteCategory"]';
const NOTE_SUBMIT_XPATH = '//*[@id="ctl00_MainContent_Tabs_tpNotes_btnAddNote"]';
const DOCUMENTS_TAB_XPATH = '//*[@id="__tab_ctl00_MainContent_Tabs_tpDocuments"]';
const IDENTIFIER_STORAGE_KEY = "ttmtLastInventoryIdentifiers";
const INVENTORY_NEXT_STEP_URL = "https://talktometechnologies2com.sharepoint.com/sites/TrialsSharePoint2/_layouts/15/listforms.aspx?cid=ZTg4MWI0ZDItYWRiOS00ODc2LThlNmMtODliMWZkMDY2MTY2&nav=MTY3M2YzY2ItNDI0OC00ZGI2LTkwNzItYjA0MDAxMjEyMDNk&preview=true";
const SMARTBOX_REPAIR_TRACKER_URL = "https://forms.office.com/Pages/ResponsePage.aspx?id=Dnb3TzlsSUSiaxNgEojZ-zRigd1y0vpNv1t3mP7sBCRURVZLWVgwUVlKSVhHSFNXTEY0SUpNSDVTTS4u";
const QA_FORM_URL = "https://forms.office.com/pages/responsepage.aspx?id=Dnb3TzlsSUSiaxNgEojZ-7I1BCOObO5Ah2w6na92nwhUQjMxRkU0NUVQRkg1R0kxV05QUFZLNENTNyQlQCN0PWcu&route=shorturl";
const DAF_DATA_STORAGE_KEY = "ttmtLastCheckinForDaf";
const THEME_STORAGE_KEY = "ttmtSidekickTheme";
const CHAOS_ROTATION_STORAGE_KEY = "ttmtSidekickChaosRotationSeconds";
const ZIP_FOLDER_STORAGE_KEY = "ttmtZipDownloadFolder";
const CHECKIN_CLEANUP_FOLDER_NAME_STORAGE_KEY = "ttmtCheckinCleanupFolderName";
const CHECKIN_CLEANUP_HANDLE_DB = "ttmtSidekickHandles";
const CHECKIN_CLEANUP_HANDLE_STORE = "handles";
const CHECKIN_CLEANUP_HANDLE_KEY = "checkinCleanupFolder";
const TRIAL_FILES_FOLDER_NAME_STORAGE_KEY = "ttmtTrialFilesFolderName";
const TRIAL_FILES_HANDLE_KEY = "trialFilesFolder";
const DAILY_COUNTER_STORAGE_KEY = "ttmtDailyTaskCounters";
const DAILY_COUNTER_ENABLED_STORAGE_KEY = "ttmtDailyTaskCounterEnabled";
const DEFAULT_CHAOS_ROTATION_SECONDS = 30;
const DEVICE_LOOKUP_EXCEL_WEB_URL = "https://talktometechnologies2com.sharepoint.com/:x:/r/sites/TrialsSharePoint2/_layouts/15/Doc.aspx?sourcedoc=%7B657E4C75-FDB4-4009-9557-90AAB8DB29F2%7D&file=RWL%20and%20LTL%20Update.xlsx&nav=MTVfezAwMDAwMDAwLTAwMDEtMDAwMC0wMTAwLTAwMDAwMDAwMDAwMH0&action=default&mobileredirect=true";
const DEVICE_LOOKUP_SHEET_LINKS = {
  "LTL Update List": DEVICE_LOOKUP_EXCEL_WEB_URL,
  "Return Watchlist": DEVICE_LOOKUP_EXCEL_WEB_URL
};
const MOUNT_LOG_EXCEL_WEB_URL = "https://talktometechnologies2com.sharepoint.com/:x:/r/sites/TrialsSharePoint2/_layouts/15/Doc.aspx?sourcedoc=%7BEA51CF43-05AC-492F-B9E5-5AC8573EF54C%7D&file=MountLog.xlsx&action=default&mobileredirect=true";
const LOAN_LIBRARY_CRM_CHECK_EXCEL_WEB_URL = "https://talktometechnologies2com.sharepoint.com/:x:/r/sites/TrialsSharePoint2/_layouts/15/Doc.aspx?sourcedoc=%7BB8051643-3F1F-4B3B-858C-2F63A9D55E9E%7D&file=Loan%20Library%20CRM%20Check%20V3.xlsm&action=default&mobileredirect=true";
const DEVICE_LOOKUP_WORKBOOK_WEB_URLS = {
  ltl: DEVICE_LOOKUP_EXCEL_WEB_URL,
  mount: MOUNT_LOG_EXCEL_WEB_URL,
  crm: LOAN_LIBRARY_CRM_CHECK_EXCEL_WEB_URL
};
const DEVICE_LOOKUP_WORKBOOKS_STORAGE_KEY = "ttmtDeviceLookupWorkbooks";
const DEVICE_LOOKUP_WORKBOOK_META_STORAGE_KEY = "ttmtDeviceLookupWorkbookMeta";
const DEVICE_LOOKUP_HANDLE_KEY_PREFIX = "ttmtDeviceLookupWorkbook";

/* ---------------- Helpers ---------------- */
const VIEW_IDS = ["onboardingView", "landingView", "settingsView", "crmNavigatorView", "deviceLookupView", "gridView", "formView", "completeView", "smartboxRepairView", "inventoryView", "dafRecapView", "emailView", "appOverridesView"];

function showView(targetId) {
  VIEW_IDS.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.style.display = id === targetId ? "block" : "none";
  });
}

function showOnboardingView() { showView("onboardingView"); }
function showLandingView() {
  showView("landingView");
  void refreshLandingView();
}
function showSettingsView() { showView("settingsView"); }
function showCrmNavigatorView() { showView("crmNavigatorView"); }
function showDeviceLookupView() { showView("deviceLookupView"); }
function showGridView() {
  showView("gridView");
  void refreshGridClientData();
}
function showCompleteView() { showView("completeView"); }
function showFormView() { showView("formView"); }
function showSmartboxRepairView() { showView("smartboxRepairView"); }
function showInventoryView() { showView("inventoryView"); }
function showDafView() { showView("dafRecapView"); }
function showEmailView() { showView("emailView"); }
function showAppOverridesView() { showView("appOverridesView"); }

function setCollapsibleState(key, expanded) {
  const toggle = document.querySelector(`[data-collapsible="${key}"]`);
  const content = document.querySelector(`[data-collapsible-content="${key}"]`);
  if (!toggle || !content) return;
  toggle.setAttribute("aria-expanded", expanded ? "true" : "false");
  content.hidden = !expanded;
}

let hasStartedCheckin = false;
let smartboxRepairRequired = false;
let hasStartedGrid = false;
const USER_PROFILE_STORAGE_KEY = "ttmtSidekickUserProfile";

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
  },
  chaos: {
    label: "Chaos Goblin",
    vars: {
      "bg-color": "#121212",
      "text-color": "#e0e0e0",
      "muted-text": "#d5e9ff",
      "container-bg": "#1e1e2f",
      "container-border": "#f9a8d4",
      "container-shadow": "0 0 20px rgba(249, 168, 212, 0.28)",
      "accent": "#f9a8d4",
      "accent-strong": "#7a2a4d",
      "accent-strong-hover": "#95325f",
      "input-bg": "#2a2a3a",
      "input-border": "#555",
      "note-bg": "#0f1b2b",
      "note-border": "#2f4b6f",
      "error-color": "#ff8fab"
    }
  }
};

let chaosIntervalId = null;
let chaosRotationSeconds = DEFAULT_CHAOS_ROTATION_SECONDS;
let activeThemeId = "ocean";
let currentChaosThemeId = null;
let chaosTransitionTimeoutId = null;

function ensureThemeTransitionLayer() {
  let layer = document.getElementById("themeTransitionLayer");
  if (!layer) {
    layer = document.createElement("div");
    layer.id = "themeTransitionLayer";
    document.body.appendChild(layer);
  }
  return layer;
}

function setThemeVars(vars) {
  Object.entries(vars).forEach(([key, value]) => {
    document.documentElement.style.setProperty(`--${key}`, value);
  });
}

function getRandomThemeId() {
  const availableThemes = Object.keys(THEMES).filter(id => id !== "chaos");
  if (!availableThemes.length) return "ocean";
  let next = availableThemes[Math.floor(Math.random() * availableThemes.length)];
  if (availableThemes.length > 1 && next === currentChaosThemeId) {
    const currentIndex = availableThemes.indexOf(next);
    next = availableThemes[(currentIndex + 1) % availableThemes.length];
  }
  currentChaosThemeId = next;
  return next;
}

function stopChaosRotation() {
  if (chaosIntervalId) {
    clearInterval(chaosIntervalId);
    chaosIntervalId = null;
  }
}

function normalizeChaosSeconds(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_CHAOS_ROTATION_SECONDS;
  }
  return Math.round(parsed);
}

function applyRandomChaosTheme() {
  const nextThemeId = getRandomThemeId();
  const theme = THEMES[nextThemeId];
  if (theme) {
    applyChaosThemeTransition(theme);
  }
}

function startChaosRotation() {
  stopChaosRotation();
  applyRandomChaosTheme();
  chaosIntervalId = setInterval(() => {
    applyRandomChaosTheme();
  }, chaosRotationSeconds * 1000);
}

function clearChaosTransition() {
  if (chaosTransitionTimeoutId) {
    clearTimeout(chaosTransitionTimeoutId);
    chaosTransitionTimeoutId = null;
  }
  document.body?.classList.remove("chaos-transitioning");
  if (document.body) {
    document.body.style.backgroundColor = "";
  }
}

function applyChaosThemeTransition(theme) {
  if (!theme) return;
  const layer = ensureThemeTransitionLayer();
  const currentBg = getComputedStyle(document.documentElement).getPropertyValue("--bg-color").trim();
  if (currentBg) {
    document.body.style.backgroundColor = currentBg;
  }
  setThemeVars(theme.vars);
  layer.style.backgroundColor = theme.vars["bg-color"] || "";
  document.body.classList.remove("chaos-transitioning");
  void layer.offsetHeight;
  document.body.classList.add("chaos-transitioning");
  if (chaosTransitionTimeoutId) {
    clearTimeout(chaosTransitionTimeoutId);
  }
  chaosTransitionTimeoutId = window.setTimeout(() => {
    document.body.classList.remove("chaos-transitioning");
    document.body.style.backgroundColor = "";
    chaosTransitionTimeoutId = null;
  }, 900);
}

function updateChaosControlsVisibility(themeId) {
  const controls = document.getElementById("chaosControls");
  if (controls) {
    controls.style.display = themeId === "chaos" ? "flex" : "none";
  }
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

  updateChaosControlsVisibility(themeId);
}

function saveThemePreference(themeId) {
  if (chrome?.storage?.local) {
    chrome.storage.local.set({ [THEME_STORAGE_KEY]: themeId });
    return;
  }
  localStorage.setItem(THEME_STORAGE_KEY, themeId);
}

function saveChaosRotationSeconds(seconds) {
  if (chrome?.storage?.local) {
    chrome.storage.local.set({ [CHAOS_ROTATION_STORAGE_KEY]: seconds });
    return;
  }
  localStorage.setItem(CHAOS_ROTATION_STORAGE_KEY, String(seconds));
}

function applyTheme(themeId, { persist = true } = {}) {
  const resolvedTheme = THEMES[themeId] ? themeId : "ocean";
  activeThemeId = resolvedTheme;
  if (resolvedTheme === "chaos") {
    updateThemeSelection(resolvedTheme);
    startChaosRotation();
    if (persist) saveThemePreference(resolvedTheme);
    return;
  }
  stopChaosRotation();
  clearChaosTransition();
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

async function initChaosControls() {
  const chaosInput = document.getElementById("chaosRotationInput");
  if (!chaosInput) return;
  const storedSeconds = await getStoredValue(CHAOS_ROTATION_STORAGE_KEY);
  chaosRotationSeconds = normalizeChaosSeconds(storedSeconds ?? DEFAULT_CHAOS_ROTATION_SECONDS);
  chaosInput.value = String(chaosRotationSeconds);
  chaosInput.addEventListener("change", () => {
    chaosRotationSeconds = normalizeChaosSeconds(chaosInput.value);
    chaosInput.value = String(chaosRotationSeconds);
    saveChaosRotationSeconds(chaosRotationSeconds);
    if (activeThemeId === "chaos") {
      startChaosRotation();
    }
  });
}

function populateThemeSelect(selectEl) {
  if (!selectEl) return;
  selectEl.innerHTML = "";
  Object.entries(THEMES).forEach(([id, theme]) => {
    const option = document.createElement("option");
    option.value = id;
    option.textContent = theme.label;
    selectEl.appendChild(option);
  });
}

async function initOnboardingForm() {
  const form = document.getElementById("onboardingForm");
  const firstNameInput = document.getElementById("userFirstName");
  const lastNameInput = document.getElementById("userLastName");
  const themeSelect = document.getElementById("onboardingThemeSelect");
  const dailyCounterToggle = document.getElementById("onboardingDailyCounterToggle");

  populateThemeSelect(themeSelect);
  const storedTheme = await getStoredValue(THEME_STORAGE_KEY);
  if (storedTheme && themeSelect) {
    themeSelect.value = storedTheme;
  }

  const existingProfile = await getUserProfile();
  if (existingProfile) {
    if (firstNameInput) firstNameInput.value = existingProfile.firstName || "";
    if (lastNameInput) lastNameInput.value = existingProfile.lastName || "";
  }
  if (dailyCounterToggle) {
    dailyCounterToggle.checked = await getDailyCounterEnabled();
  }

  if (!form) return;
  form.addEventListener("submit", async event => {
    event.preventDefault();
    const firstName = (firstNameInput?.value || "").trim();
    const lastName = (lastNameInput?.value || "").trim();
    const themeId = themeSelect?.value || "ocean";
    const dailyCounterEnabled = dailyCounterToggle?.checked ?? true;

    if (!firstName || !lastName) {
      alert("Please enter your first name and last name.");
      return;
    }

    await saveUserProfile({ firstName, lastName });
    await setDailyCounterEnabled(dailyCounterEnabled);
    applyTheme(themeId);
    showLandingView();
  });
}

async function initDailyCounterSetting() {
  const toggle = document.getElementById("dailyCounterToggle");
  if (!toggle) return;
  toggle.checked = await getDailyCounterEnabled();
  toggle.addEventListener("change", async () => {
    await setDailyCounterEnabled(toggle.checked);
    await updateDailyCounterVisibility();
  });
}

function initThemeControls() {
  const menuBtn = document.getElementById("themeMenuBtn");
  const userSettingsAction = document.getElementById("userSettingsActionBtn");
  const settingsReturnBtn = document.getElementById("settingsReturnBtn");
  menuBtn?.addEventListener("click", () => {
    showSettingsView();
  });

  userSettingsAction?.addEventListener("click", () => {
    showOnboardingView();
  });
  settingsReturnBtn?.addEventListener("click", () => {
    showLandingView();
  });

  document.querySelectorAll(".theme-option").forEach(btn => {
    btn.addEventListener("click", () => {
      applyTheme(btn.dataset.theme);
    });
  });
}

const zipFolderInput = document.getElementById("zipFolderInput");
const zipFolderSaveBtn = document.getElementById("zipFolderSaveBtn");
const zipFolderStatus = document.getElementById("zipFolderStatus");
const cleanupFolderPickBtn = document.getElementById("cleanupFolderPickBtn");
const cleanupFolderStatus = document.getElementById("cleanupFolderStatus");
const trialFilesInput = document.getElementById("trialFilesInput");
const trialFilesFolderPickBtn = document.getElementById("trialFilesFolderPickBtn");
const trialFilesFolderRefreshBtn = document.getElementById("trialFilesFolderRefreshBtn");
const trialFilesFolderStatus = document.getElementById("trialFilesFolderStatus");
const trialFilesStatus = document.getElementById("trialFilesStatus");

function normalizeZipFolder(folder) {
  return (folder || "")
    .trim()
    .replace(/^[/\\]+/, "")
    .replace(/[/\\]+$/, "");
}

function updateZipFolderStatus(folder) {
  if (!zipFolderStatus) return;
  if (folder) {
    zipFolderStatus.textContent = `Saving zips to Downloads/${folder}`;
    return;
  }
  zipFolderStatus.textContent = "Saving zips to your default Downloads folder.";
}

async function saveZipFolderSetting() {
  if (!zipFolderInput) return;
  const normalized = normalizeZipFolder(zipFolderInput.value);
  zipFolderInput.value = normalized;
  await setStoredValue(ZIP_FOLDER_STORAGE_KEY, normalized);
  updateZipFolderStatus(normalized);
}

async function initZipFolderSetting() {
  if (!zipFolderInput) return;
  const storedFolder = normalizeZipFolder(await getStoredValue(ZIP_FOLDER_STORAGE_KEY));
  zipFolderInput.value = storedFolder;
  updateZipFolderStatus(storedFolder);
  zipFolderSaveBtn?.addEventListener("click", () => {
    void saveZipFolderSetting();
  });
  zipFolderInput.addEventListener("change", () => {
    void saveZipFolderSetting();
  });
  zipFolderInput.addEventListener("keydown", event => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    void saveZipFolderSetting();
  });
}

function openCleanupHandleDb() {
  return new Promise((resolve, reject) => {
    if (!("indexedDB" in window)) {
      reject(new Error("IndexedDB not available."));
      return;
    }
    const request = indexedDB.open(CHECKIN_CLEANUP_HANDLE_DB, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(CHECKIN_CLEANUP_HANDLE_STORE)) {
        db.createObjectStore(CHECKIN_CLEANUP_HANDLE_STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function saveCleanupFolderHandle(handle) {
  const db = await openCleanupHandleDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(CHECKIN_CLEANUP_HANDLE_STORE, "readwrite");
    tx.objectStore(CHECKIN_CLEANUP_HANDLE_STORE).put(handle, CHECKIN_CLEANUP_HANDLE_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function loadCleanupFolderHandle() {
  const db = await openCleanupHandleDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(CHECKIN_CLEANUP_HANDLE_STORE, "readonly");
    const req = tx.objectStore(CHECKIN_CLEANUP_HANDLE_STORE).get(CHECKIN_CLEANUP_HANDLE_KEY);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

function getDeviceLookupHandleKey(targetKey) {
  return `${DEVICE_LOOKUP_HANDLE_KEY_PREFIX}:${targetKey}`;
}

async function saveDeviceLookupWorkbookHandle(targetKey, handle) {
  const db = await openCleanupHandleDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(CHECKIN_CLEANUP_HANDLE_STORE, "readwrite");
    tx.objectStore(CHECKIN_CLEANUP_HANDLE_STORE).put(handle, getDeviceLookupHandleKey(targetKey));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function loadDeviceLookupWorkbookHandle(targetKey) {
  const db = await openCleanupHandleDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(CHECKIN_CLEANUP_HANDLE_STORE, "readonly");
    const req = tx.objectStore(CHECKIN_CLEANUP_HANDLE_STORE).get(getDeviceLookupHandleKey(targetKey));
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

function updateCleanupFolderStatus(name) {
  if (!cleanupFolderStatus) return;
  if (name) {
    cleanupFolderStatus.textContent = `Clearing "${name}" when starting another check-in.`;
    return;
  }
  cleanupFolderStatus.textContent = "No cleanup folder selected yet.";
}

async function setCleanupFolderName(name) {
  await setStoredValue(CHECKIN_CLEANUP_FOLDER_NAME_STORAGE_KEY, name || "");
  updateCleanupFolderStatus(name);
}

async function getCleanupFolderName() {
  return await getStoredValue(CHECKIN_CLEANUP_FOLDER_NAME_STORAGE_KEY);
}

async function verifyFolderPermission(handle, mode = "read") {
  if (!handle) return false;
  if (typeof handle.queryPermission !== "function") return true;
  const options = { mode };
  let permission = await handle.queryPermission(options);
  if (permission === "granted") return true;
  permission = await handle.requestPermission(options);
  return permission === "granted";
}

async function verifyFilePermission(handle, mode = "read") {
  if (!handle) return false;
  if (typeof handle.queryPermission !== "function") return true;
  const options = { mode };
  let permission = await handle.queryPermission(options);
  if (permission === "granted") return true;
  permission = await handle.requestPermission(options);
  return permission === "granted";
}

async function pickCleanupFolder() {
  if (typeof window.showDirectoryPicker !== "function") {
    alert("Folder picking isn't supported in this browser.");
    return null;
  }
  let handle;
  try {
    handle = await window.showDirectoryPicker({ mode: "readwrite" });
  } catch {
    return null;
  }
  if (!handle) return null;
  await saveCleanupFolderHandle(handle);
  await setCleanupFolderName(handle.name || "Selected folder");
  return handle;
}

async function clearCleanupFolderContents(handle) {
  if (!handle) return false;
  for await (const [name, entry] of handle.entries()) {
    if (entry.kind === "directory") {
      await handle.removeEntry(name, { recursive: true });
    } else {
      await handle.removeEntry(name);
    }
  }
  return true;
}

async function runCleanupFolderFlow({ promptIfMissing = false } = {}) {
  let handle = await loadCleanupFolderHandle().catch(() => null);
  if (!handle && promptIfMissing) {
    handle = await pickCleanupFolder();
  }
  if (!handle) return false;
  const permitted = await verifyFolderPermission(handle, "readwrite");
  if (!permitted) return false;
  await clearCleanupFolderContents(handle);
  return true;
}

async function initCleanupFolderSetting() {
  if (!cleanupFolderPickBtn) return;
  const storedName = await getCleanupFolderName();
  updateCleanupFolderStatus(storedName);
  cleanupFolderPickBtn.addEventListener("click", async () => {
    await pickCleanupFolder();
  });
}

function updateTrialFilesFolderStatus(name, messageOverride = null) {
  if (!trialFilesFolderStatus) return;
  if (messageOverride) {
    trialFilesFolderStatus.textContent = messageOverride;
    return;
  }
  if (name) {
    trialFilesFolderStatus.textContent = `Using "${name}" for trial file zips.`;
    return;
  }
  trialFilesFolderStatus.textContent = "No trial files folder selected yet.";
}

async function setTrialFilesFolderName(name) {
  await setStoredValue(TRIAL_FILES_FOLDER_NAME_STORAGE_KEY, name || "");
  updateTrialFilesFolderStatus(name);
}

async function getTrialFilesFolderName() {
  return await getStoredValue(TRIAL_FILES_FOLDER_NAME_STORAGE_KEY);
}

async function saveTrialFilesFolderHandle(handle) {
  const db = await openCleanupHandleDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(CHECKIN_CLEANUP_HANDLE_STORE, "readwrite");
    tx.objectStore(CHECKIN_CLEANUP_HANDLE_STORE).put(handle, TRIAL_FILES_HANDLE_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function loadTrialFilesFolderHandle() {
  const db = await openCleanupHandleDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(CHECKIN_CLEANUP_HANDLE_STORE, "readonly");
    const req = tx.objectStore(CHECKIN_CLEANUP_HANDLE_STORE).get(TRIAL_FILES_HANDLE_KEY);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

async function getTrialFilesFromFolder(handle) {
  const files = [];
  for await (const entry of handle.values()) {
    if (entry.kind !== "file") continue;
    const file = await entry.getFile();
    files.push(file);
  }
  return files.sort((a, b) => a.name.localeCompare(b.name));
}

async function refreshTrialFilesFromFolder({ promptIfMissing = false, handleOverride = null } = {}) {
  let handle = handleOverride ?? await loadTrialFilesFolderHandle().catch(() => null);
  if (!handle && promptIfMissing) {
    handle = await pickTrialFilesFolder();
  }
  if (!handle) return false;
  const permitted = await verifyFolderPermission(handle, "read");
  const storedName = await getTrialFilesFolderName();
  if (!permitted) {
    updateTrialFilesFolderStatus(storedName, "Folder access blocked. Click Refresh to re-authorize.");
    return false;
  }
  const files = await getTrialFilesFromFolder(handle);
  if (trialFilesInput) trialFilesInput.value = "";
  setSelectedTrialFiles(files, storedName
    ? `Using "${storedName}" (${files.length} file(s)) for the zip.`
    : `${files.length} file(s) ready to zip.`);
  return true;
}

async function pickTrialFilesFolder() {
  if (typeof window.showDirectoryPicker !== "function") {
    alert("Folder picking isn't supported in this browser.");
    return null;
  }
  let handle;
  try {
    handle = await window.showDirectoryPicker({ mode: "read" });
  } catch {
    return null;
  }
  if (!handle) return null;
  await saveTrialFilesFolderHandle(handle);
  await setTrialFilesFolderName(handle.name || "Selected folder");
  await refreshTrialFilesFromFolder({ handleOverride: handle });
  return handle;
}

async function initTrialFilesFolderSetting() {
  const storedName = await getTrialFilesFolderName();
  updateTrialFilesFolderStatus(storedName);
  trialFilesFolderPickBtn?.addEventListener("click", async () => {
    await pickTrialFilesFolder();
  });
  trialFilesFolderRefreshBtn?.addEventListener("click", async () => {
    await refreshTrialFilesFromFolder({ promptIfMissing: true });
  });
}

initThemeControls();
initChaosControls();
loadThemePreference();
initOnboardingForm();
initDailyCounterSetting();
initZipFolderSetting();
initCleanupFolderSetting();
initTrialFilesFolderSetting();

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

async function getUserProfile() {
  return await getStoredValue(USER_PROFILE_STORAGE_KEY);
}

async function saveUserProfile(profile) {
  await setStoredValue(USER_PROFILE_STORAGE_KEY, profile);
}

function updateLandingGreeting(profile) {
  const firstName = (profile?.firstName || "").trim();
  const greeting = firstName ? `Welcome back, ${firstName}!` : "Welcome back!";
  setText("landingGreeting", greeting);
}

function updateLandingVersion() {
  const manifest = chrome?.runtime?.getManifest?.();
  const version = manifest?.version;
  setText("landingVersion", version ? `Version ${version}` : "");
}

function getDefaultDailyCounters() {
  return {
    checkins: 0,
    qas: 0,
    preps: 0
  };
}

async function getDailyCounterEnabled() {
  const stored = await getStoredValue(DAILY_COUNTER_ENABLED_STORAGE_KEY);
  if (stored === null || typeof stored === "undefined") return true;
  return Boolean(stored);
}

async function setDailyCounterEnabled(enabled) {
  await setStoredValue(DAILY_COUNTER_ENABLED_STORAGE_KEY, Boolean(enabled));
}

async function getDailyCounters() {
  const stored = await getStoredValue(DAILY_COUNTER_STORAGE_KEY);
  return {
    ...getDefaultDailyCounters(),
    ...(stored || {})
  };
}

async function setDailyCounters(counters) {
  await setStoredValue(DAILY_COUNTER_STORAGE_KEY, counters);
}

function updateDailyCounterDisplay(counters) {
  setText("dailyCheckinsCount", String(counters.checkins ?? 0));
  setText("dailyQasCount", String(counters.qas ?? 0));
  setText("dailyPrepsCount", String(counters.preps ?? 0));
}

async function refreshDailyCounters() {
  const counters = await getDailyCounters();
  updateDailyCounterDisplay(counters);
  return counters;
}

async function updateDailyCounterVisibility() {
  const enabled = await getDailyCounterEnabled();
  const section = document.getElementById("dailyCounterSection");
  if (section) section.style.display = enabled ? "" : "none";
  if (enabled) {
    await refreshDailyCounters();
  }
  return enabled;
}

async function incrementDailyCounter(key) {
  const counters = await getDailyCounters();
  const nextValue = (counters[key] ?? 0) + 1;
  const updated = { ...counters, [key]: nextValue };
  await setDailyCounters(updated);
  updateDailyCounterDisplay(updated);
  return updated;
}

async function adjustDailyCounter(key, delta) {
  const counters = await getDailyCounters();
  const current = counters[key] ?? 0;
  const nextValue = Math.max(0, current + delta);
  const updated = { ...counters, [key]: nextValue };
  await setDailyCounters(updated);
  updateDailyCounterDisplay(updated);
  return updated;
}

async function clearDailyCounters() {
  const reset = getDefaultDailyCounters();
  await setDailyCounters(reset);
  updateDailyCounterDisplay(reset);
}

async function refreshLandingView() {
  const profile = await getUserProfile();
  updateLandingGreeting(profile);
  updateLandingVersion();
  await updateDailyCounterVisibility();
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

async function closeCheckinTabs() {
  const [crmTabId, dafTabId] = await Promise.all([
    getActiveCrmTabId(),
    getActiveDafTabId()
  ]);
  const tabIds = Array.from(new Set([crmTabId, dafTabId].filter(Boolean)));
  if (!tabIds.length) return;
  await chrome.tabs.remove(tabIds);
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

function applyGridClientData(data) {
  if (!data) return;
  setValue("gridFirstName", data.firstName);
  setValue("gridLastName", data.lastName);
  setValue("gridCrmId", data.crmId);
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

/* ---------------- Device lookup sidekick ---------------- */

const DEVICE_LOOKUP_SPECIAL_SERIALS = new Set([
  "DTP10.009",
  "DTP10.010",
  "DTP10.011",
  "TP10.012",
  "DTP10.012",
  "TP10.013",
  "DTP10.013",
  "TP10.014",
  "DTP10.014",
  "TP10.015",
  "DTP10.015",
  "DTP10.016"
]);

const deviceLookupWorkbooks = {
  ltl: null,
  mount: null,
  crm: null
};
let deviceLookupWorkbookMeta = {
  ltl: null,
  mount: null,
  crm: null
};
let deviceLookupLastSheetLink = DEVICE_LOOKUP_EXCEL_WEB_URL;
let deviceLookupLastSerial = "";
let deviceLookupLastCrmId = "";
let deviceLookupLastAutofill = {
  cameraSerials: [],
  luminSerials: [],
  clampMounts: [],
  tableMounts: [],
  rollingMounts: []
};
const lookupCopyButtons = [
  { id: "copyDeviceSnBtn", label: "Copy device SN" },
  { id: "copyCameraSnBtn", label: "Copy camera SNs" },
  { id: "copyLuminSnBtn", label: "Copy Lumin-I SNs" },
  { id: "copyEvoSnBtn", label: "Copy Evo SNs" },
  { id: "copyCrmBtn", label: "Copy CRM #" },
  { id: "copyClampBtn", label: "Copy clamp mount" },
  { id: "copyTableBtn", label: "Copy table mount" },
  { id: "copyRollingBtn", label: "Copy rolling mount" }
];
const DEVICE_LOOKUP_WORKBOOK_KEYS = ["ltl", "mount", "crm"];

function getWorkbookStatusElements(targetKey) {
  return Array.from(document.querySelectorAll(`[data-workbook-status="${targetKey}"]`));
}

function setWorkbookStatusMessage(targetKey, message) {
  const statuses = getWorkbookStatusElements(targetKey);
  if (!statuses.length) return;
  statuses.forEach(status => {
    status.textContent = message;
  });
}

function updateWorkbookStatus(targetKey, { name, saved } = {}) {
  if (!name) {
    setWorkbookStatusMessage(targetKey, "Not connected.");
    return;
  }
  setWorkbookStatusMessage(targetKey, `Connected: ${name}${saved ? " (saved)" : ""}`);
}

async function persistDeviceLookupWorkbooks() {
  await chrome.storage.local.set({
    [DEVICE_LOOKUP_WORKBOOK_META_STORAGE_KEY]: deviceLookupWorkbookMeta
  });
  await chrome.storage.local.remove(DEVICE_LOOKUP_WORKBOOKS_STORAGE_KEY);
}

async function loadDeviceLookupWorkbooksFromStorage() {
  const res = await chrome.storage.local.get([DEVICE_LOOKUP_WORKBOOK_META_STORAGE_KEY]);
  const storedMeta = res?.[DEVICE_LOOKUP_WORKBOOK_META_STORAGE_KEY];
  if (storedMeta) {
    deviceLookupWorkbookMeta = {
      ...deviceLookupWorkbookMeta,
      ...storedMeta
    };
  }
  await chrome.storage.local.remove(DEVICE_LOOKUP_WORKBOOKS_STORAGE_KEY);
  await Promise.all(DEVICE_LOOKUP_WORKBOOK_KEYS.map(async key => {
    const handle = await loadDeviceLookupWorkbookHandle(key).catch(() => null);
    const meta = deviceLookupWorkbookMeta[key];
    updateWorkbookStatus(key, {
      name: handle ? (meta?.name || "Saved workbook") : "",
      saved: Boolean(handle)
    });
  }));
}

function columnLettersToIndex(letters) {
  return letters
    .toUpperCase()
    .split("")
    .reduce((acc, char) => acc * 26 + (char.charCodeAt(0) - 64), 0) - 1;
}

function parseSharedStrings(xmlText) {
  const doc = new DOMParser().parseFromString(xmlText, "application/xml");
  return Array.from(doc.getElementsByTagName("si")).map(item => {
    const textNodes = Array.from(item.getElementsByTagName("t"));
    return textNodes.map(node => node.textContent).join("");
  });
}

function parseSheet(xmlText, sharedStrings) {
  const doc = new DOMParser().parseFromString(xmlText, "application/xml");
  const rows = [];
  const rowNodes = Array.from(doc.getElementsByTagName("row"));
  rowNodes.forEach(rowNode => {
    const rowIndex = parseInt(rowNode.getAttribute("r"), 10);
    if (!rowIndex) return;
    const row = rows[rowIndex - 1] || [];
    const cells = Array.from(rowNode.getElementsByTagName("c"));
    cells.forEach(cell => {
      const cellRef = cell.getAttribute("r") || "";
      const match = cellRef.match(/([A-Z]+)/i);
      if (!match) return;
      const colIndex = columnLettersToIndex(match[1]);
      const cellType = cell.getAttribute("t");
      let value = "";
      if (cellType === "s") {
        const v = cell.getElementsByTagName("v")[0];
        const idx = v ? parseInt(v.textContent, 10) : null;
        value = idx !== null && sharedStrings[idx] !== undefined ? sharedStrings[idx] : "";
      } else if (cellType === "inlineStr") {
        const tNode = cell.getElementsByTagName("t")[0];
        value = tNode ? tNode.textContent : "";
      } else {
        const v = cell.getElementsByTagName("v")[0];
        value = v ? v.textContent : "";
      }
      row[colIndex] = value;
    });
    rows[rowIndex - 1] = row;
  });
  return rows;
}

async function loadWorkbookFromFile(file) {
  const data = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(data);
  const workbookXml = await zip.file("xl/workbook.xml").async("text");
  const workbookDoc = new DOMParser().parseFromString(workbookXml, "application/xml");
  const relsXml = await zip.file("xl/_rels/workbook.xml.rels").async("text");
  const relsDoc = new DOMParser().parseFromString(relsXml, "application/xml");
  const rels = new Map(
    Array.from(relsDoc.getElementsByTagName("Relationship")).map(rel => [
      rel.getAttribute("Id"),
      rel.getAttribute("Target")
    ])
  );
  const sharedStrings = zip.file("xl/sharedStrings.xml")
    ? parseSharedStrings(await zip.file("xl/sharedStrings.xml").async("text"))
    : [];
  const sheets = {};
  const sheetNodes = Array.from(workbookDoc.getElementsByTagName("sheet"));
  for (const sheet of sheetNodes) {
    const name = sheet.getAttribute("name");
    const rId = sheet.getAttribute("r:id");
    if (!name || !rId) continue;
    const target = rels.get(rId);
    if (!target) continue;
    const path = target.startsWith("xl/") ? target : `xl/${target}`;
    if (!zip.file(path)) continue;
    const xmlText = await zip.file(path).async("text");
    sheets[name] = parseSheet(xmlText, sharedStrings);
  }
  return { sheets };
}

async function pickDeviceLookupWorkbook(targetKey) {
  if (typeof window.showOpenFilePicker !== "function") {
    alert("File picking isn't supported in this browser.");
    return null;
  }
  let handles;
  try {
    handles = await window.showOpenFilePicker({
      multiple: false,
      types: [{
        description: "Excel workbook",
        accept: {
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
          "application/vnd.ms-excel.sheet.macroEnabled.12": [".xlsm"]
        }
      }]
    });
  } catch {
    return null;
  }
  const handle = handles?.[0];
  if (!handle) return null;
  await saveDeviceLookupWorkbookHandle(targetKey, handle);
  return handle;
}

async function refreshDeviceLookupWorkbookFromHandle(targetKey, { handleOverride = null, force = false } = {}) {
  const handle = handleOverride ?? await loadDeviceLookupWorkbookHandle(targetKey).catch(() => null);
  if (!handle) {
    updateWorkbookStatus(targetKey, { name: "", saved: false });
    return false;
  }
  const permitted = await verifyFilePermission(handle, "read");
  const meta = deviceLookupWorkbookMeta[targetKey];
  if (!permitted) {
    setWorkbookStatusMessage(targetKey, "Workbook access blocked. Click Connect to re-authorize.");
    updateWorkbookStatus(targetKey, { name: meta?.name || "", saved: true });
    return false;
  }
  let file;
  try {
    file = await handle.getFile();
  } catch (error) {
    console.error(error);
    setWorkbookStatusMessage(targetKey, "Unable to open workbook. Click Connect to re-authorize.");
    return false;
  }
  const hasCache = Boolean(deviceLookupWorkbooks[targetKey]);
  const hasMeta = Boolean(meta);
  const changed = force
    || !hasCache
    || !hasMeta
    || meta.lastModified !== file.lastModified
    || meta.size !== file.size
    || meta.name !== file.name;

  if (!changed) {
    updateWorkbookStatus(targetKey, { name: meta?.name || file.name, saved: true });
    return true;
  }

  setWorkbookStatusMessage(targetKey, "Refreshing workbook...");
  try {
    const workbook = await loadWorkbookFromFile(file);
    deviceLookupWorkbooks[targetKey] = workbook;
    deviceLookupWorkbookMeta[targetKey] = {
      name: file.name,
      savedAt: new Date().toISOString(),
      lastModified: file.lastModified,
      size: file.size
    };
    await persistDeviceLookupWorkbooks();
    updateWorkbookStatus(targetKey, { name: file.name, saved: true });
    return true;
  } catch (error) {
    console.error(error);
    setWorkbookStatusMessage(targetKey, "Unable to read workbook. Click Connect to re-authorize.");
    return false;
  }
}

async function connectDeviceLookupWorkbook(targetKey) {
  setWorkbookStatusMessage(targetKey, "Waiting for workbook selection...");
  const handle = await pickDeviceLookupWorkbook(targetKey);
  if (!handle) {
    await refreshDeviceLookupWorkbookFromHandle(targetKey);
    return;
  }
  setWorkbookStatusMessage(targetKey, "Loading workbook...");
  await refreshDeviceLookupWorkbookFromHandle(targetKey, { handleOverride: handle, force: true });
}

async function refreshDeviceLookupWorkbooksFromHandles({ force = false } = {}) {
  for (const targetKey of DEVICE_LOOKUP_WORKBOOK_KEYS) {
    await refreshDeviceLookupWorkbookFromHandle(targetKey, { force });
  }
}

function normalizeLookupValue(value) {
  return String(value || "").trim().replace(/[()[\]"']/g, "").toLowerCase();
}

function extractValidSerial(scanInput) {
  if (!scanInput) return null;
  let cleaned = scanInput.replace(/\(01\)\d+/g, "");
  cleaned = cleaned.replace(/\(21\)/g, "").trim().toUpperCase();

  if (DEVICE_LOOKUP_SPECIAL_SERIALS.has(cleaned)) return cleaned;

  const fourDigitDotPrefixes = ["DTP10", "DTP8"];
  const sixDigitDotPrefixes = ["DW13", "DW5", "DWM", "DW"];
  const noDotPrefixes6or7 = ["DGPG", "DTT", "DTZ"];
  const noDotPrefixes4 = ["Z10D", "Z12D", "Z16D"];

  for (const prefix of fourDigitDotPrefixes) {
    if (cleaned.startsWith(prefix)) {
      const digits = cleaned.slice(prefix.length).replace(/\D/g, "");
      if (/^\d{4}$/.test(digits)) return `${prefix}.${digits}`;
    }
  }

  for (const prefix of sixDigitDotPrefixes) {
    if (cleaned.startsWith(prefix)) {
      const digits = cleaned.slice(prefix.length).replace(/\D/g, "");
      if (/^\d{6}$/.test(digits)) return `${prefix}.${digits}`;
    }
  }

  for (const prefix of noDotPrefixes6or7) {
    if (cleaned.startsWith(prefix)) {
      const digits = cleaned.slice(prefix.length);
      if (/^\d{6,7}$/.test(digits)) return `${prefix}${digits}`;
    }
  }

  const last7 = cleaned.match(/(\d{7})$/);
  if (last7) {
    const suffix = last7[1];
    if (cleaned.includes("5060446901465")) return `DTZ${suffix}`;
    if (cleaned.includes("5060446901373")) return `DTT${suffix}`;
  }

  for (const prefix of noDotPrefixes4) {
    if (cleaned.startsWith(prefix)) {
      const digits = cleaned.slice(prefix.length);
      if (/^\d{4}$/.test(digits)) return `${prefix}${digits}`;
    }
  }

  return null;
}

function getSheetRows(workbook, sheetName) {
  if (!workbook?.sheets?.[sheetName]) return [];
  return workbook.sheets[sheetName];
}

function buildHeaderMap(rows) {
  const headers = rows[0] || [];
  const map = {};
  headers.forEach((header, idx) => {
    if (!header) return;
    map[String(header).trim()] = idx;
  });
  return map;
}

function searchSerialNumber(serialNumber, workbook) {
  const matches = [];
  const sheetsFound = new Set();
  const serialNorm = normalizeLookupValue(serialNumber);
  ["LTL Update List", "Return Watchlist"].forEach(sheetName => {
    const rows = getSheetRows(workbook, sheetName);
    rows.forEach((row, rowIndex) => {
      row.forEach(cellValue => {
        if (!cellValue) return;
        const cellText = String(cellValue);
        if (DEVICE_LOOKUP_SPECIAL_SERIALS.has(serialNumber)) {
          if (normalizeLookupValue(cellText) === serialNorm) {
            matches.push({ sheet: sheetName, row: rowIndex + 1 });
            sheetsFound.add(sheetName);
          }
        } else {
          const parts = cellText.split(/[,\n;/]+/).map(part => normalizeLookupValue(part));
          if (parts.includes(serialNorm)) {
            matches.push({ sheet: sheetName, row: rowIndex + 1 });
            sheetsFound.add(sheetName);
          }
        }
      });
    });
  });

  if (matches.length) {
    const msg = `✅ Found in:\n${matches.map(match => `- Sheet: ${match.sheet}, Row: ${match.row}`).join("\n")}`;
    return { message: msg, status: "green", sheetsFound: Array.from(sheetsFound) };
  }
  return { message: "❌ Serial number not found in Workbook.", status: "red", sheetsFound: [] };
}

function findCrmIdFromSerial(serialNumber, workbook) {
  try {
    const serialNorm = normalizeLookupValue(serialNumber);
    const devRows = getSheetRows(workbook, "DeviceLog");
    const devMap = buildHeaderMap(devRows);
    const devSerialCol = devMap["TTMTSerialNumber"];
    const devCrmCol = devMap["5 Digit CRM #"];
    for (let i = devRows.length - 1; i >= 1; i -= 1) {
      const row = devRows[i];
      if (!row) continue;
      if (normalizeLookupValue(row[devSerialCol]) === serialNorm) {
        const crm = String(row[devCrmCol] || "").trim();
        if (/^\d{5}$/.test(crm)) return { crmId: crm, error: null };
      }
    }

    const oldRows = getSheetRows(workbook, "OldDeviceLog");
    const oldMap = buildHeaderMap(oldRows);
    const oldSerialCol = oldMap["TTMT Serial Number"];
    const oldCrmCol = oldMap["5 Digit CRM #"];
    for (let i = oldRows.length - 1; i >= 1; i -= 1) {
      const row = oldRows[i];
      if (!row) continue;
      if (normalizeLookupValue(row[oldSerialCol]) === serialNorm) {
        const crm = String(row[oldCrmCol] || "").trim();
        if (/^\d{5}$/.test(crm)) return { crmId: crm, error: null };
      }
    }
    return { crmId: "", error: "❌ CRM ID not found" };
  } catch (error) {
    return { crmId: null, error: `❌ Error in find_crm_id_from_serial: ${error}` };
  }
}

function searchMountInventory(serialNumber, workbook, crmId) {
  try {
    const serialNorm = normalizeLookupValue(serialNumber);
    const mountMap = {
      "CM inv.": "Clamp Mount",
      "TM inv.": "Table Mount",
      "RM inv.": "Rolling Mount"
    };
    const clamp = [];
    const table = [];
    const rolling = [];
    let mismatched = false;

    Object.entries(mountMap).forEach(([sheetName, mountType]) => {
      const rows = getSheetRows(workbook, sheetName);
      rows.slice(1).forEach(row => {
        if (!row) return;
        if (normalizeLookupValue(row[1]) === serialNorm) {
          const mountSn = String(row[0] || "").trim();
          const mountCrm = String(row[4] || "").trim();
          const match = mountCrm === crmId;
          if (!match) mismatched = true;
          const mountInfo = { serial: mountSn, type: mountType, match };
          if (mountType === "Clamp Mount") clamp.push(mountInfo);
          if (mountType === "Table Mount") table.push(mountInfo);
          if (mountType === "Rolling Mount") rolling.push(mountInfo);
        }
      });
    });

    const allMounts = [...clamp, ...table, ...rolling];
    if (!allMounts.length) {
      return {
        lines: ["❌ Serial number not found in Mount Inventory."],
        clamp,
        table,
        rolling,
        mismatched,
        status: "red"
      };
    }

    return {
      lines: allMounts.map(item => `${item.match ? "✅" : "⚠️"} ${item.type}: ${item.serial}`),
      clamp,
      table,
      rolling,
      mismatched,
      status: mismatched ? "yellow" : "green"
    };
  } catch (error) {
    return {
      lines: [`❌ Error: ${error}`],
      clamp: [],
      table: [],
      rolling: [],
      mismatched: false,
      status: "red"
    };
  }
}

function findAttachedCameras(serialNumber, workbook) {
  try {
    const serialNorm = normalizeLookupValue(serialNumber);
    const devRows = getSheetRows(workbook, "DeviceLog");
    const oldRows = getSheetRows(workbook, "OldDeviceLog");
    const devMap = buildHeaderMap(devRows);
    const oldMap = buildHeaderMap(oldRows);

    const devSerialCol = devMap["TTMTSerialNumber"];
    const devCamCol = devMap["CameraSerialNumber"];
    const devLuminCol = devMap["Lumin-ISerialNumber"];
    const devCrmCol = devMap["5 Digit CRM #"];
    const devIdCol = devMap["ID"];

    const oldSerialCol = oldMap["TTMT Serial Number"];
    const oldCamCol = oldMap["Camera Serial Number"];
    const oldLuminCol = oldMap["Lumin-i Serial Number"];
    const oldCrmCol = oldMap["5 Digit CRM #"];
    const oldIdCol = oldMap["ID"];

    let crm = null;
    for (let i = devRows.length - 1; i >= 1; i -= 1) {
      const row = devRows[i];
      if (!row) continue;
      if (normalizeLookupValue(row[devSerialCol]) === serialNorm) {
        crm = String(row[devCrmCol] || "").trim();
        break;
      }
    }
    if (!crm) {
      for (let i = oldRows.length - 1; i >= 1; i -= 1) {
        const row = oldRows[i];
        if (!row) continue;
        if (normalizeLookupValue(row[oldSerialCol]) === serialNorm) {
          crm = String(row[oldCrmCol] || "").trim();
          break;
        }
      }
    }
    if (!crm) return { cameras: [], lumin: [], evo: [], error: null };

    const prefixOf = sn => {
      if (!sn) return "";
      const value = String(sn).trim();
      if (value.includes(".")) return `${value.split(".", 1)[0].toUpperCase()}.`;
      const match = value.match(/^[A-Za-z]+/);
      return match ? `${match[0].toUpperCase()}.` : "";
    };

    let newestCamera = null;
    let newestLumin = null;
    let newestEvo = null;

    function ingest(rows, idCol, camCol, luminCol, crmCol, src) {
      for (let i = rows.length - 1; i >= 1; i -= 1) {
        const row = rows[i];
        if (!row || String(row[crmCol] || "").trim() !== crm) continue;
        const rowId = String(row[idCol] || "").trim();

        const cam = String(row[camCol] || "").trim();
        if (cam) {
          const prefix = prefixOf(cam);
          if (prefix === "GPE." && !newestEvo) {
            newestEvo = { sn: cam, id: rowId, src, col: "CAM" };
          } else if (!newestCamera) {
            newestCamera = { sn: cam, id: rowId, src, col: "CAM" };
          }
        }

        const lumin = String(row[luminCol] || "").trim();
        if (lumin) {
          const prefix = prefixOf(lumin);
          if (prefix === "GPE." && !newestEvo) {
            newestEvo = { sn: lumin, id: rowId, src, col: "LUM" };
          } else if (prefix === "GPL." && !newestLumin) {
            newestLumin = { sn: lumin, id: rowId, src, col: "LUM" };
          }
        }
      }
    }

    ingest(devRows, devIdCol, devCamCol, devLuminCol, devCrmCol, "dev");
    ingest(oldRows, oldIdCol, oldCamCol, oldLuminCol, oldCrmCol, "old");

    const devRowsForward = devRows.slice(1);
    const oldRowsForward = oldRows.slice(1);

    const toInt = value => {
      const parsed = parseInt(value, 10);
      return Number.isNaN(parsed) ? -1 : parsed;
    };

    function fwdScanGpv(sn, startId, src) {
      const sid = toInt(startId);
      if (src === "dev") {
        return devRowsForward.some(row => toInt(row[devIdCol]) > sid && String(row[devCamCol] || "") === sn && String(row[devCrmCol] || "") !== crm);
      }
      if (oldRowsForward.some(row => toInt(row[oldIdCol]) > sid && String(row[oldCamCol] || "") === sn && String(row[oldCrmCol] || "") !== crm)) return true;
      return devRowsForward.some(row => String(row[devCamCol] || "") === sn && String(row[devCrmCol] || "") !== crm);
    }

    function fwdScanLumin(sn, startId, src) {
      const sid = toInt(startId);
      if (src === "dev") {
        return devRowsForward.some(row => toInt(row[devIdCol]) > sid && String(row[devLuminCol] || "") === sn && String(row[devCrmCol] || "") !== crm);
      }
      if (oldRowsForward.some(row => toInt(row[oldIdCol]) > sid && String(row[oldLuminCol] || "") === sn && String(row[oldCrmCol] || "") !== crm)) return true;
      return devRowsForward.some(row => String(row[devLuminCol] || "") === sn && String(row[devCrmCol] || "") !== crm);
    }

    function fwdScanEvo(sn, startId, src) {
      const sid = toInt(startId);
      if (src === "dev") {
        return devRowsForward.some(row => toInt(row[devIdCol]) > sid && (String(row[devCamCol] || "") === sn || String(row[devLuminCol] || "") === sn) && String(row[devCrmCol] || "") !== crm);
      }
      if (oldRowsForward.some(row => toInt(row[oldIdCol]) > sid && (String(row[oldCamCol] || "") === sn || String(row[oldLuminCol] || "") === sn) && String(row[oldCrmCol] || "") !== crm)) return true;
      return devRowsForward.some(row => (String(row[devCamCol] || "") === sn || String(row[devLuminCol] || "") === sn) && String(row[devCrmCol] || "") !== crm);
    }

    const cameras = [];
    const lumin = [];
    const evo = [];

    if (newestCamera) {
      const { sn, id, src } = newestCamera;
      if (sn.toUpperCase().startsWith("GPV.")) {
        if (!fwdScanGpv(sn, id, src)) cameras.push(sn);
      } else {
        cameras.push(sn);
      }
    }

    if (newestLumin) {
      const { sn, id, src } = newestLumin;
      if (!fwdScanLumin(sn, id, src)) lumin.push(sn);
    }

    if (newestEvo) {
      const { sn, id, src } = newestEvo;
      if (!fwdScanEvo(sn, id, src)) evo.push(sn);
    }

    return { cameras, lumin, evo, error: null };
  } catch (error) {
    return { cameras: [], lumin: [], evo: [], error: `❌ Error in find_attached_cameras: ${error}` };
  }
}

function updateLookupResultCard(cardId, contentId, message, status) {
  const card = document.getElementById(cardId);
  const content = document.getElementById(contentId);
  if (content) content.textContent = message || "";
  if (card) card.setAttribute("data-status", status || "");
}

function updateCopyButton(buttonId, value, label) {
  const button = document.getElementById(buttonId);
  if (!button) return;
  const hasValue = Boolean(value);
  button.dataset.copyValue = value || "";
  button.disabled = !hasValue;
  button.style.display = hasValue ? "inline-flex" : "none";
  button.textContent = hasValue ? `${label}: ${value}` : label;
}

function resetLookupCopyButtons() {
  lookupCopyButtons.forEach(({ id, label }) => updateCopyButton(id, "", label));
}

function applyLookupAutofillToCheckin() {
  const cameraInput = document.querySelector('input[name="cameraNumber"]');
  const luminInput = document.querySelector('input[name="luminNumber"]');
  const clampInput = document.querySelector('input[name="clampMount"]');
  const tableInput = document.querySelector('input[name="tableMount"]');
  const rollingInput = document.querySelector('input[name="rollingMount"]');

  const cameraValue = deviceLookupLastAutofill.cameraSerials.join(", ");
  const luminValue = deviceLookupLastAutofill.luminSerials.join(", ");
  const clampValue = deviceLookupLastAutofill.clampMounts.join(", ");
  const tableValue = deviceLookupLastAutofill.tableMounts.join(", ");
  const rollingValue = deviceLookupLastAutofill.rollingMounts.join(", ");

  if (cameraInput && cameraValue && !cameraInput.value.trim()) cameraInput.value = cameraValue;
  if (luminInput && luminValue && !luminInput.value.trim()) luminInput.value = luminValue;
  if (clampInput && clampValue && !clampInput.value.trim()) clampInput.value = clampValue;
  if (tableInput && tableValue && !tableInput.value.trim()) tableInput.value = tableValue;
  if (rollingInput && rollingValue && !rollingInput.value.trim()) rollingInput.value = rollingValue;

  const cameraLuminSection = document.getElementById("cameraLuminSection");
  if (cameraLuminSection && (cameraValue || luminValue)) {
    cameraLuminSection.style.display = "block";
  }
  if (mountSection && (clampValue || tableValue || rollingValue)) {
    mountSection.style.display = "block";
  }
}

async function runDeviceLookupSearch(rawInput) {
  const lookupCopyStatus = document.getElementById("lookupCopyStatus");
  if (lookupCopyStatus) lookupCopyStatus.textContent = "";

  await refreshDeviceLookupWorkbooksFromHandles();

  const extracted = extractValidSerial(rawInput);
  setText("deviceLookupRaw", rawInput || "—");
  setText("deviceLookupExtracted", extracted ? `✅ ${extracted}` : "❌ Invalid serial scanned");
  deviceLookupLastSerial = extracted || "";
  deviceLookupLastCrmId = "";
  deviceLookupLastAutofill = {
    cameraSerials: [],
    luminSerials: [],
    clampMounts: [],
    tableMounts: [],
    rollingMounts: []
  };

  if (!extracted) {
    updateLookupResultCard("lookupSerialCard", "lookupSerialResult", "Invalid serial number detected. Please enter it manually and try again.", "red");
    updateLookupResultCard("lookupMountCard", "lookupMountResult", "", "");
    updateLookupResultCard("lookupActionCard", "lookupActionResult", "Report the invalid scan to pre-prep.", "red");
    resetLookupCopyButtons();
    return;
  }

  try {
    await navigator.clipboard.writeText(extracted);
  } catch (error) {
    console.warn("Unable to copy serial to clipboard.", error);
  }

  const ltlWorkbook = deviceLookupWorkbooks.ltl;
  const mountWorkbook = deviceLookupWorkbooks.mount;
  const crmWorkbook = deviceLookupWorkbooks.crm;

  if (!ltlWorkbook || !mountWorkbook || !crmWorkbook) {
    updateLookupResultCard("lookupSerialCard", "lookupSerialResult", "Connect all three workbooks before searching.", "red");
    updateLookupResultCard("lookupMountCard", "lookupMountResult", "", "");
    updateLookupResultCard("lookupActionCard", "lookupActionResult", "Connect the OneDrive files using the selectors above.", "red");
    resetLookupCopyButtons();
    return;
  }

  const serialResult = searchSerialNumber(extracted, ltlWorkbook);
  updateLookupResultCard("lookupSerialCard", "lookupSerialResult", serialResult.message, serialResult.status);
  deviceLookupLastSheetLink = DEVICE_LOOKUP_EXCEL_WEB_URL;
  if (serialResult.sheetsFound.includes("LTL Update List")) {
    deviceLookupLastSheetLink = DEVICE_LOOKUP_SHEET_LINKS["LTL Update List"] || DEVICE_LOOKUP_EXCEL_WEB_URL;
  } else if (serialResult.sheetsFound.includes("Return Watchlist")) {
    deviceLookupLastSheetLink = DEVICE_LOOKUP_SHEET_LINKS["Return Watchlist"] || DEVICE_LOOKUP_EXCEL_WEB_URL;
  }

  const { crmId, error: crmError } = findCrmIdFromSerial(extracted, crmWorkbook);
  deviceLookupLastCrmId = crmId || "";
  const mountResult = searchMountInventory(extracted, mountWorkbook, crmId || "");
  updateLookupResultCard("lookupMountCard", "lookupMountResult", mountResult.lines.join("\n"), mountResult.status);

  const cameraResult = findAttachedCameras(extracted, crmWorkbook);
  if (cameraResult.error) {
    updateLookupResultCard("lookupActionCard", "lookupActionResult", cameraResult.error, "red");
    return;
  }

  const cameraSerials = [...cameraResult.cameras];
  const luminSerials = [...cameraResult.lumin];
  const evoSerials = [...cameraResult.evo];

  const hasMounts = mountResult.clamp.length || mountResult.table.length || mountResult.rolling.length;
  const foundInLtl = serialResult.sheetsFound.includes("LTL Update List");
  const foundInRwl = serialResult.sheetsFound.includes("Return Watchlist");
  const crmFullUrl = crmId ? `https://crm.talktometechnologies.com/Admin/EditClient.aspx?ID=${encodeURIComponent(crmId)}` : "";

  if (foundInRwl) {
    const rwlUrl = DEVICE_LOOKUP_SHEET_LINKS["Return Watchlist"] || DEVICE_LOOKUP_EXCEL_WEB_URL;
    chrome.tabs.create({ url: rwlUrl });
  }

  const deviceInfoParts = [];
  if (cameraSerials.length) deviceInfoParts.push(`Camera: ${cameraSerials.join(", ")}`);
  if (luminSerials.length) deviceInfoParts.push(`Lumin-i: ${luminSerials.join(", ")}`);
  if (evoSerials.length) deviceInfoParts.push(`Evo: ${evoSerials.join(", ")}`);
  const deviceInfo = deviceInfoParts.length
    ? `${extracted} with ${deviceInfoParts.join(", ")}. CRM #: ${crmId || "N/A"}`
    : `${extracted}. CRM #: ${crmId || "N/A"}`;

  const msgStart = `-You have completed a search for: ${deviceInfo}`;
  const msgLtl = "-Your device was found on the LTL Update worksheet.\n-Please place your device on the top shelf of the rack next to Dave's desk.";
  const msgRw = "-Please check the Return Watchlist worksheet for your device.\n-When Action Needed is completed delete the row. If unsure reach out to the author of the entry.";
  const msgBoth = "-Please check the LTL Update worksheet and Return Watchlist worksheet for your device.";
  const msgNone = "-No action required.";
  const msgCopied = "-Click the Checkin Device button to continue your check-in.\n-Serial number is copied to your clipboard.";

  const mountNotes = [];
  const mismatchedMounts = [];
  [...mountResult.clamp, ...mountResult.table, ...mountResult.rolling].forEach(item => {
    if (!item.match) mismatchedMounts.push(`${item.type}: ${item.serial}`);
  });
  if (mismatchedMounts.length) {
    mountNotes.push("-⚠️ Some mounts were found, but their CRM number may not match the device. Please confirm that these mounts belong with this device before completing check-in.");
  }
  if (mountResult.clamp.length || mountResult.table.length) {
    mountNotes.push("-Check the notes in the CRM to see if a table mount and/or clamp mount has been returned. If not, then go find the mount(s) in the unchecked mount container. If still not found, check the disinfection log or message a lead to help look into it further.");
  }
  if (mountResult.rolling.length) {
    mountNotes.push("-Find the rolling mount and move to the checked-in location.");
  }

  let actionColor = "green";
  let combinedMsg = msgNone;
  const mountMessage = mountNotes.length ? `\n\n${mountNotes.join("\n")}` : "";

  if (foundInLtl && foundInRwl) {
    actionColor = "blue";
    combinedMsg = `${msgStart}\n\n${msgBoth}${mountMessage}\n\n${msgLtl}`;
  } else if (foundInLtl) {
    actionColor = "blue";
    combinedMsg = `${msgStart}${mountMessage}\n\n${msgLtl}`;
  } else if (foundInRwl) {
    actionColor = "yellow";
    combinedMsg = `${msgStart}\n\n${msgRw}${mountMessage}\n\n${msgCopied}`;
  } else if (hasMounts) {
    actionColor = "yellow";
    combinedMsg = `${msgStart}${mountMessage}\n\n${msgCopied}`;
  } else {
    actionColor = "green";
    combinedMsg = `${msgStart}\n\n${msgNone}\n\n${msgCopied}`;
  }

  if (crmError) {
    combinedMsg = `${combinedMsg}\n\n${crmError}`;
    actionColor = "red";
  }

  updateLookupResultCard("lookupActionCard", "lookupActionResult", combinedMsg, actionColor);
  if (crmFullUrl) {
    updateLookupResultCard("lookupActionCard", "lookupActionResult", `${combinedMsg}\n\n${crmFullUrl}`, actionColor);
  }

  updateCopyButton("copyDeviceSnBtn", extracted, "Copy device SN");
  updateCopyButton("copyCameraSnBtn", cameraSerials.join(", "), "Copy camera SNs");
  updateCopyButton("copyLuminSnBtn", luminSerials.join(", "), "Copy Lumin-I SNs");
  updateCopyButton("copyEvoSnBtn", evoSerials.join(", "), "Copy Evo SNs");
  updateCopyButton("copyCrmBtn", crmId || "", "Copy CRM #");
  updateCopyButton("copyClampBtn", mountResult.clamp.map(item => item.serial).join(", "), "Copy clamp mount");
  updateCopyButton("copyTableBtn", mountResult.table.map(item => item.serial).join(", "), "Copy table mount");
  updateCopyButton("copyRollingBtn", mountResult.rolling.map(item => item.serial).join(", "), "Copy rolling mount");
  deviceLookupLastAutofill = {
    cameraSerials,
    luminSerials,
    clampMounts: mountResult.clamp.map(item => item.serial),
    tableMounts: mountResult.table.map(item => item.serial),
    rollingMounts: mountResult.rolling.map(item => item.serial)
  };
}

/* ---------------- Grid sidekick ---------------- */

const GRID_EMAIL_DOMAIN = "wegotalk.com";
const GRID_PASSWORD = "Xqxq77##";

function splitNameParts(name) {
  return sanitizeName(name)
    .split(/[\s-]+/)
    .map(part => part.trim())
    .filter(Boolean);
}

function buildGridEmail() {
  const firstName = getFormValue("#gridFirstName");
  const lastName = getFormValue("#gridLastName");
  const crmId = getFormValue("#gridCrmId");
  const type = document.querySelector("input[name='gridType']:checked")?.value || "CL";

  if (!crmId) return "";

  if (type === "CL") {
    const firstParts = splitNameParts(firstName);
    const lastParts = splitNameParts(lastName);
    if (!firstParts.length || !lastParts.length) return "";
    const first = firstParts.join("");
    const lastInitial = lastParts[0]?.[0] || "";
    if (!first || !lastInitial) return "";
    return `${first}${lastInitial}${crmId}@${GRID_EMAIL_DOMAIN}`.toLowerCase();
  }

  const initials = [...splitNameParts(firstName), ...splitNameParts(lastName)]
    .map(part => part[0])
    .join("");
  if (!initials) return "";
  return `${initials}${crmId}@${GRID_EMAIL_DOMAIN}`.toLowerCase();
}

function updateGridOutput() {
  const email = buildGridEmail();
  const crmInfo = email ? `Grid: ${email} | ${GRID_PASSWORD}` : "";
  setValue("gridEmailField", email);
  setValue("gridPasswordField", GRID_PASSWORD);
  setValue("gridCrmInfoField", crmInfo);

  const emailCopyBtn = document.getElementById("gridEmailCopyBtn");
  if (emailCopyBtn) {
    emailCopyBtn.disabled = !email;
    emailCopyBtn.textContent = email ? "Copy" : "No value";
  }

  const passwordCopyBtn = document.getElementById("gridPasswordCopyBtn");
  if (passwordCopyBtn) {
    passwordCopyBtn.textContent = "Copy";
  }

  const crmInfoCopyBtn = document.getElementById("gridCrmInfoCopyBtn");
  if (crmInfoCopyBtn) {
    crmInfoCopyBtn.disabled = !crmInfo;
    crmInfoCopyBtn.textContent = crmInfo ? "Copy" : "No value";
  }

  const status = document.getElementById("gridStatus");
  if (status) {
    status.textContent = email
      ? "Grid credentials ready."
      : "Enter client details and CRM ID to generate the Grid email.";
  }
}

async function refreshGridClientData(tabIdOverride = null) {
  const status = document.getElementById("gridStatus");
  const res = await fetchClientData(tabIdOverride);
  if (!res?.data) {
    if (status) status.textContent = "Open a CRM client record to auto-fill these fields.";
    updateGridOutput();
    return;
  }
  applyGridClientData(res.data);
  updateGridOutput();
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

const vocabNotReturnedToggle = document.getElementById("vocabNotReturned");
const vocabTypeInputs = Array.from(document.querySelectorAll('input[name="vocabTypes"]'));

function updateVocabSelectionAvailability() {
  const disabled = vocabNotReturnedToggle?.checked === true;
  vocabTypeInputs.forEach(input => {
    input.disabled = disabled;
    if (disabled) input.checked = false;
  });
}

vocabNotReturnedToggle?.addEventListener("change", updateVocabSelectionAvailability);
updateVocabSelectionAvailability();

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

function isSmartboxRepairModel(deviceNumberRaw) {
  const modelName = detectDeviceModel(deviceNumberRaw);
  return modelName.includes("Talk Pad") || modelName.includes("Grid Pad");
}

/* ---------------- NOTE helpers ---------------- */

function getSelectedVocabTypes() {
  return Array.from(document.querySelectorAll('input[name="vocabTypes"]:checked'))
    .map(input => input.value)
    .filter(Boolean);
}

function buildVocabLine() {
  const vocabNotReturned = document.getElementById("vocabNotReturned")?.checked === true;
  if (vocabNotReturned) return "No vocab returned.";
  const selected = getSelectedVocabTypes();
  const vocabLabel = selected.length ? selected.join(", ") : "selected";
  return `I saved ${vocabLabel} vocabs to the CRM.`;
}

function hasValidVocabSelection() {
  const vocabNotReturned = document.getElementById("vocabNotReturned")?.checked === true;
  return vocabNotReturned || getSelectedVocabTypes().length > 0;
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

async function sendToCrm(type, payload = {}) {
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

  const to = "Trials@talktometechnologies.com";
  const from = "TrialsOperations@talktometechnologies.com";
  return { subject, body: lines.join("\n"), to, from };
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
  const gridVisible = document.getElementById("gridView")?.style.display === "block";
  if (!hasStartedCheckin && !gridVisible) return;

  if (isDafFormUrl(tab.url)) {
    if (!hasStartedCheckin) return;
    await renderDafRecap();
    await closeManageInventoryTabs(tab.id);
    showDafView();
    return;
  }

  if (!isCrmUrl(tab.url)) return;

  if (isManageInventoryUrl(tab.url)) {
    if (!hasStartedCheckin) return;
    showInventoryView();
    await updateInventorySearchDisplay();
    return;
  }

  const inventoryVisible = document.getElementById("inventoryView")?.style.display === "block";
  if (inventoryVisible) {
    showFormView();
  }

  const res = await fetchClientData(tab.id);
  if (res?.data) {
    if (hasStartedCheckin) {
      applyClientData(res.data);
    }
    if (gridVisible) {
      applyGridClientData(res.data);
      updateGridOutput();
    }
  }
}

/* ---------------- Trial file zip + upload ---------------- */

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

function setSelectedTrialFiles(files, messageOverride = null) {
  selectedTrialFiles.length = 0;
  if (files?.length) {
    selectedTrialFiles.push(...files);
  }
  if (!selectedTrialFiles.length) {
    updateTrialFilesStatus(messageOverride || "No files selected.");
    return;
  }
  updateTrialFilesStatus(messageOverride || `${selectedTrialFiles.length} file(s) ready to zip.`);
}

function clearSelectedTrialFiles(messageOverride = null) {
  setSelectedTrialFiles([], messageOverride);
  if (trialFilesInput) trialFilesInput.value = "";
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
      const zipFolder = normalizeZipFolder(await getStoredValue(ZIP_FOLDER_STORAGE_KEY));
      const targetFilename = zipFolder ? `${zipFolder}/${filename}` : filename;
      await chrome.downloads.download({
        url,
        filename: targetFilename,
        saveAs: !zipFolder
      });
    } else {
      const link = document.createElement("a");
      link.href = url;
      const zipFolder = normalizeZipFolder(await getStoredValue(ZIP_FOLDER_STORAGE_KEY));
      link.download = zipFolder ? `${zipFolder}/${filename}` : filename;
      link.click();
    }
  } finally {
    URL.revokeObjectURL(url);
  }
}

trialFilesInput?.addEventListener("change", () => {
  const files = trialFilesInput.files ? Array.from(trialFilesInput.files) : [];
  setSelectedTrialFiles(files);
  if (!files.length) {
    hideUploadPrompt();
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
  document.querySelectorAll('input[name="vocabTypes"]').forEach(input => {
    input.checked = false;
    input.disabled = false;
  });

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

async function finishCheckinAndReset({ returnToLanding = false } = {}) {
  resetAllFieldsAndUI();
  smartboxRepairRequired = false;
  clearSelectedTrialFiles();
  await clearStoredCheckinData();
  await updateInventorySearchDisplay();
  await renderDafRecap();
  if (returnToLanding) {
    showLandingView();
  } else {
    showFormView();
  }
}

/* ---------------- Submit: Check-in Device ---------------- */

document.getElementById("checkinForm")?.addEventListener("submit", async e => {
  e.preventDefault();

  if (!hasValidVocabSelection()) {
    alert("Select at least one vocab or check \"Vocab NOT returned\" before continuing.");
    return;
  }

  const deviceNumber = getFormValue("#deviceNumberInput");
  const isMountOnly = deviceNumber.toLowerCase() === "x";

  // 1) Zip vocab files (if any) and prompt download
  let zipName = "";
  if (!trialFilesInput?.files?.length) {
    await refreshTrialFilesFromFolder();
  }
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

  const condition = getFormValue("#conditionSelect");
  smartboxRepairRequired = !isMountOnly
    && condition === "Needs Repair"
    && isSmartboxRepairModel(deviceNumber);

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

document.getElementById("startAnotherBtn")?.addEventListener("click", async () => {
  await closeCheckinTabs();
  if (smartboxRepairRequired) {
    showSmartboxRepairView();
    chrome.tabs.create({ url: SMARTBOX_REPAIR_TRACKER_URL });
    return;
  }
  chrome.tabs.create({ url: "https://portal.talktometechnologies.com/admin/ManageInventory.aspx" });
});

document.getElementById("openSmartboxRepairBtn")?.addEventListener("click", () => {
  chrome.tabs.create({ url: SMARTBOX_REPAIR_TRACKER_URL });
});

document.getElementById("smartboxContinueBtn")?.addEventListener("click", () => {
  smartboxRepairRequired = false;
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
  const status = document.getElementById("emailStatus");
  if (status) status.textContent = "Clearing your check-in cleanup folder...";
  const cleaned = await runCleanupFolderFlow({ promptIfMissing: true });
  if (status) {
    status.textContent = cleaned
      ? "Cleanup folder cleared. Starting a new check-in..."
      : "Cleanup folder not cleared.";
  }
  await incrementDailyCounter("checkins");
  await finishCheckinAndReset({ returnToLanding: true });
});

["gridFirstName", "gridLastName", "gridCrmId"].forEach(id => {
  document.getElementById(id)?.addEventListener("input", updateGridOutput);
});

document.querySelectorAll("input[name='gridType']").forEach(el => {
  el.addEventListener("change", updateGridOutput);
});

document.getElementById("gridEmailCopyBtn")?.addEventListener("click", async () => {
  const value = getFormValue("#gridEmailField");
  if (!value) return;
  await navigator.clipboard.writeText(value);
  const btn = document.getElementById("gridEmailCopyBtn");
  const status = document.getElementById("gridStatus");
  if (btn) {
    btn.textContent = "Copied!";
    setTimeout(() => {
      btn.textContent = "Copy";
    }, 1200);
  }
  if (status) status.textContent = "Grid email copied to clipboard.";
});

document.getElementById("gridPasswordCopyBtn")?.addEventListener("click", async () => {
  const value = getFormValue("#gridPasswordField");
  if (!value) return;
  await navigator.clipboard.writeText(value);
  const btn = document.getElementById("gridPasswordCopyBtn");
  const status = document.getElementById("gridStatus");
  if (btn) {
    btn.textContent = "Copied!";
    setTimeout(() => {
      btn.textContent = "Copy";
    }, 1200);
  }
  if (status) status.textContent = "Grid password copied to clipboard.";
});

document.getElementById("gridCrmInfoCopyBtn")?.addEventListener("click", async () => {
  const value = getFormValue("#gridCrmInfoField");
  if (!value) return;
  await navigator.clipboard.writeText(value);
  const btn = document.getElementById("gridCrmInfoCopyBtn");
  const status = document.getElementById("gridStatus");
  if (btn) {
    btn.textContent = "Copied!";
    setTimeout(() => {
      btn.textContent = "Copy";
    }, 1200);
  }
  if (status) status.textContent = "CRM Grid info copied to clipboard.";
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
  await loadDeviceLookupWorkbooksFromStorage();
  const profile = await getUserProfile();
  if (profile) {
    showLandingView();
  } else {
    showOnboardingView();
  }

  document.querySelectorAll("[data-collapsible]").forEach(btn => {
    btn.addEventListener("click", () => {
      const key = btn.dataset.collapsible;
      if (!key) return;
      const isExpanded = btn.getAttribute("aria-expanded") === "true";
      setCollapsibleState(key, !isExpanded);
    });
  });

  document.getElementById("startCheckinBtn")?.addEventListener("click", async () => {
    hasStartedCheckin = true;
    showFormView();
    await refreshTrialFilesFromFolder();
    const activeTab = await getActiveCrmTab();
    await syncViewForTab(activeTab);
  });

  document.getElementById("clearDailyCountersBtn")?.addEventListener("click", async () => {
    await clearDailyCounters();
  });

  document.querySelectorAll("[data-counter][data-delta]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const counterKey = btn.dataset.counter;
      const delta = Number.parseInt(btn.dataset.delta || "0", 10);
      if (!counterKey || Number.isNaN(delta)) return;
      await adjustDailyCounter(counterKey, delta);
    });
  });

  document.getElementById("gridSidekickBtn")?.addEventListener("click", async () => {
    hasStartedGrid = true;
    showGridView();
    const activeTab = await getActiveCrmTab();
    await syncViewForTab(activeTab);
  });

  document.getElementById("crmNavigatorBtn")?.addEventListener("click", () => {
    showCrmNavigatorView();
  });

  document.getElementById("deviceLookupBtn")?.addEventListener("click", async () => {
    showDeviceLookupView();
    await refreshDeviceLookupWorkbooksFromHandles();
  });

  document.getElementById("qaFormBtn")?.addEventListener("click", () => {
    chrome.tabs.create({ url: QA_FORM_URL });
  });

  document.getElementById("appOverridesBtn")?.addEventListener("click", () => {
    showAppOverridesView();
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

  document.getElementById("deviceLookupReturnBtn")?.addEventListener("click", () => {
    showLandingView();
  });

  document.getElementById("appOverridesReturnBtn")?.addEventListener("click", () => {
    showLandingView();
  });

  document.getElementById("deviceLookupForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const input = document.getElementById("deviceLookupInput");
    const raw = (input?.value || "").trim();
    if (!raw) {
      alert("Enter a device serial number to continue.");
      return;
    }
    await runDeviceLookupSearch(raw);
  });

  document.querySelectorAll("[data-workbook-connect]").forEach(button => {
    button.addEventListener("click", () => {
      const targetKey = button.dataset.workbookConnect;
      if (!targetKey) return;
      void connectDeviceLookupWorkbook(targetKey);
    });
  });

  document.querySelectorAll("[data-workbook-open]").forEach(button => {
    button.addEventListener("click", () => {
      const targetKey = button.dataset.workbookOpen;
      if (!targetKey) return;
      const url = DEVICE_LOOKUP_WORKBOOK_WEB_URLS[targetKey];
      if (!url) return;
      chrome.tabs.create({ url });
    });
  });

  [
    "copyDeviceSnBtn",
    "copyCameraSnBtn",
    "copyLuminSnBtn",
    "copyEvoSnBtn",
    "copyCrmBtn",
    "copyClampBtn",
    "copyTableBtn",
    "copyRollingBtn"
  ].forEach(buttonId => {
    document.getElementById(buttonId)?.addEventListener("click", async event => {
      const value = event.currentTarget?.dataset?.copyValue || "";
      const status = document.getElementById("lookupCopyStatus");
      if (!value) return;
      try {
        await navigator.clipboard.writeText(value);
        if (status) status.textContent = "Copied to clipboard.";
      } catch (error) {
        if (status) status.textContent = "Copy failed. Try again.";
      }
      if (status) {
        setTimeout(() => {
          status.textContent = "";
        }, 1500);
      }
    });
  });

  document.getElementById("lookupOpenCrmBtn")?.addEventListener("click", () => {
    if (!deviceLookupLastSerial) {
      alert("Search for a device to continue.");
      return;
    }
    if (!deviceLookupLastCrmId) {
      alert("No CRM ID found for this device.");
      return;
    }
    chrome.tabs.create({
      url: `https://portal.talktometechnologies.com/Admin/EditClient.aspx?ID=${encodeURIComponent(deviceLookupLastCrmId)}`
    });
    hasStartedCheckin = true;
    showFormView();
    setValue("deviceNumberInput", deviceLookupLastSerial);
    updateDeviceRules();
    applyLookupAutofillToCheckin();
  });

  document.getElementById("lookupOpenWorkbookBtn")?.addEventListener("click", () => {
    chrome.tabs.create({ url: deviceLookupLastSheetLink || DEVICE_LOOKUP_EXCEL_WEB_URL });
  });

  document.getElementById("gridReturnBtn")?.addEventListener("click", () => {
    hasStartedGrid = false;
    showLandingView();
  });

  document.getElementById("gridRefreshBtn")?.addEventListener("click", async () => {
    const activeTab = await getActiveCrmTab();
    await refreshGridClientData(activeTab?.id || null);
  });

  document.getElementById("returnToLandingBtn")?.addEventListener("click", () => {
    showLandingView();
  });

  const activeTab = await getActiveCrmTab();
  await syncViewForTab(activeTab);
  resetLookupCopyButtons();

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
