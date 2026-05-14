(() => {
  const SHELL_INSTALL_KEY = "__sidekickSupabaseAuthShellInstalled";
  const FRAME_INSTALL_KEY = "__sidekickSupabaseAuthFrameInstalled";
  const SCRIPT_NAME = "sidekick-supabase-auth.js";
  const STYLE_NAME = "sidekick-supabase-auth.css";

  if (window.top === window && document.getElementById("sidekickPanelFrame")) {
    if (window[SHELL_INSTALL_KEY]) return;
    window[SHELL_INSTALL_KEY] = true;

    function injectIntoFrame() {
      const frame = document.getElementById("sidekickPanelFrame");
      const doc = frame?.contentDocument;
      if (!doc?.documentElement) return;

      if (!doc.getElementById("sidekickSupabaseAuthStyles")) {
        const link = doc.createElement("link");
        link.id = "sidekickSupabaseAuthStyles";
        link.rel = "stylesheet";
        link.href = chrome.runtime.getURL(STYLE_NAME);
        doc.head?.appendChild(link);
      }

      if (!doc.getElementById("sidekickSupabaseAuthScript")) {
        const script = doc.createElement("script");
        script.id = "sidekickSupabaseAuthScript";
        script.src = chrome.runtime.getURL(SCRIPT_NAME);
        doc.documentElement.appendChild(script);
      }
    }

    const frame = document.getElementById("sidekickPanelFrame");
    frame?.addEventListener("load", () => setTimeout(injectIntoFrame, 0));
    setTimeout(injectIntoFrame, 0);
    return;
  }

  if (window[FRAME_INSTALL_KEY]) return;
  window[FRAME_INSTALL_KEY] = true;

  const state = {
    session: null,
    user: null,
    role: "deviceCoordinator"
  };

  const ROLES = {
    admin: "admin",
    sidekick_admin: "admin",
    deviceCoordinator: "deviceCoordinator",
    device_coordinator: "deviceCoordinator",
    trialsPreprep: "trialsPreprep",
    trials_preprep: "trialsPreprep"
  };

  function send(type, payload = {}) {
    return new Promise((resolve, reject) => {
      if (!chrome?.runtime?.sendMessage) {
        reject(new Error("Chrome runtime is not available."));
        return;
      }
      chrome.runtime.sendMessage({ type, ...payload }, response => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        if (!response?.ok) {
          reject(new Error(response?.message || "Sidekick Supabase request failed."));
          return;
        }
        resolve(response);
      });
    });
  }

  function roleFromUser(user = null, fallback = "deviceCoordinator") {
    const metadata = user?.app_metadata || {};
    const rawRole = metadata.sidekick_role || metadata.role || fallback;
    return ROLES[rawRole] || ROLES[String(rawRole || "").replace(/[^a-zA-Z0-9_]/g, "")] || fallback;
  }

  function createElement(tag, attrs = {}, children = []) {
    const element = document.createElement(tag);
    Object.entries(attrs).forEach(([key, value]) => {
      if (key === "className") {
        element.className = value;
      } else if (key === "text") {
        element.textContent = value;
      } else if (key === "html") {
        element.innerHTML = value;
      } else if (key.startsWith("data")) {
        element.dataset[key.slice(4).replace(/^./, char => char.toLowerCase())] = value;
      } else if (value !== null && typeof value !== "undefined") {
        element.setAttribute(key, value);
      }
    });
    children.forEach(child => element.appendChild(typeof child === "string" ? document.createTextNode(child) : child));
    return element;
  }

  function getDisplayName() {
    return (document.getElementById("userFirstName")?.value || "").trim()
      || (document.getElementById("landingGreeting")?.textContent || "").trim();
  }

  function getStatusElements() {
    return Array.from(document.querySelectorAll("[data-sidekick-auth-status]"));
  }

  function setStatus(message, tone = "info") {
    getStatusElements().forEach(status => {
      status.textContent = message || "";
      status.dataset.tone = tone;
    });
  }

  function buildAuthCard(scope) {
    const suffix = scope === "settings" ? "Settings" : "";
    const card = createElement("div", {
      className: "settings-card sidekick-auth-card",
      id: `sidekickAuthCard${suffix}`
    });
    card.append(
      createElement("div", { className: "settings-card__title", text: "Supabase account" }),
      createElement("label", { for: `sidekickAuthEmail${suffix}`, text: "Email" }),
      createElement("input", {
        type: "email",
        id: `sidekickAuthEmail${suffix}`,
        autocomplete: "email",
        placeholder: "name@example.com"
      }),
      createElement("label", { for: `sidekickAuthPassword${suffix}`, text: "Password" }),
      createElement("input", {
        type: "password",
        id: `sidekickAuthPassword${suffix}`,
        autocomplete: scope === "settings" ? "current-password" : "new-password",
        placeholder: "Supabase password"
      }),
      createElement("label", { for: `sidekickAdminKey${suffix}`, text: "Admin onboarding key" }),
      createElement("input", {
        type: "password",
        id: `sidekickAdminKey${suffix}`,
        autocomplete: "off",
        placeholder: "Optional"
      }),
      createElement("button", {
        type: "button",
        className: "toggle-btn settings-card__action",
        id: `sidekickAuthConnectBtn${suffix}`,
        text: "Connect Supabase"
      }),
      createElement("button", {
        type: "button",
        className: "toggle-btn settings-card__action",
        id: `sidekickAuthSignOutBtn${suffix}`,
        text: "Sign out"
      }),
      createElement("div", {
        className: "status-line",
        id: `sidekickAuthStatus${suffix}`,
        dataSidekickAuthStatus: "true"
      })
    );
    return card;
  }

  function addOnboardingAuth() {
    const form = document.getElementById("onboardingForm");
    const firstNameInput = document.getElementById("userFirstName");
    if (!form || document.getElementById("sidekickAuthCard")) return;

    const card = buildAuthCard("onboarding");
    if (firstNameInput) {
      firstNameInput.insertAdjacentElement("afterend", card);
    } else {
      form.insertAdjacentElement("afterbegin", card);
    }

    form.addEventListener("submit", () => {
      void connectFromScope("onboarding", { quietWhenEmpty: true });
    }, true);
  }

  function addSettingsAuth() {
    const panel = document.querySelector("#settingsView .settings-panel");
    if (!panel || document.getElementById("sidekickAuthCardSettings")) return;
    panel.insertAdjacentElement("afterbegin", buildAuthCard("settings"));
  }

  function getScopeFields(scope) {
    const suffix = scope === "settings" ? "Settings" : "";
    return {
      email: document.getElementById(`sidekickAuthEmail${suffix}`),
      password: document.getElementById(`sidekickAuthPassword${suffix}`),
      adminKey: document.getElementById(`sidekickAdminKey${suffix}`)
    };
  }

  async function connectFromScope(scope, options = {}) {
    const fields = getScopeFields(scope);
    const email = (fields.email?.value || "").trim();
    const password = fields.password?.value || "";
    const adminKey = fields.adminKey?.value || "";

    if (!email && !password && !adminKey) {
      if (!options.quietWhenEmpty) setStatus("Enter Supabase details first.", "warn");
      return;
    }

    try {
      setStatus("Connecting Supabase...", "info");
      let result;
      if (email || password) {
        result = await send("SIDEKICK_AUTH_UPSERT_SESSION", {
          email,
          password,
          adminKey,
          displayName: getDisplayName()
        });
      } else {
        result = await send("SIDEKICK_AUTH_CLAIM_ADMIN", { adminKey });
      }

      await applySession(result);
      if (fields.password) fields.password.value = "";
      if (fields.adminKey) fields.adminKey.value = "";
      setStatus(result.message || `${state.role === "admin" ? "Admin" : "Supabase"} connected.`, "success");
    } catch (error) {
      setStatus(error?.message || "Unable to connect Supabase.", "error");
    }
  }

  async function signOutSupabase() {
    try {
      await send("SIDEKICK_AUTH_SIGN_OUT");
      state.session = null;
      state.user = null;
      state.role = "deviceCoordinator";
      await applyAccessRole();
      updateAdminVisibility();
      setStatus("Signed out of Supabase.", "info");
    } catch (error) {
      setStatus(error?.message || "Unable to sign out.", "error");
    }
  }

  async function refreshSession() {
    try {
      const result = await send("SIDEKICK_AUTH_GET_SESSION");
      await applySession(result, { silent: true });
    } catch {
      updateAdminVisibility();
    }
  }

  async function applySession(result, options = {}) {
    state.session = result.session || state.session;
    state.user = result.user || result.session?.user || state.user;
    state.role = roleFromUser(state.user, result.role || state.role);
    await applyAccessRole();
    updateAuthFields();
    updateAdminVisibility();
    if (!options.silent && state.user?.email) {
      setStatus(`Signed in as ${state.user.email}.`, "success");
    }
  }

  async function applyAccessRole() {
    const nextRole = state.role === "admin" ? "admin" : state.role || "deviceCoordinator";
    if (window.SidekickAccess?.setCurrentRole) {
      await window.SidekickAccess.setCurrentRole(nextRole).catch(() => null);
    }
  }

  async function writeTaskAudit(action, outcome, eventType = "task.outcome") {
    const entry = {
      eventType,
      severity: "info",
      action: action || "Task outcome",
      profileLabel: getDisplayName(),
      metadata: {
        outcome: outcome && String(outcome).trim() ? String(outcome) : "Completed successfully"
      }
    };

    if (window.SidekickAccess?.logAction) {
      await window.SidekickAccess.logAction(entry);
      return;
    }

    await send("SIDEKICK_AUDIT_LOG", { entry });
  }

  function installTaskLogOverride() {
    window.logTaskOutcome = async (action, outcome) => {
      await writeTaskAudit(action, outcome).catch(() => null);
    };
    window.logLtlUpdateOutcome = async outcome => {
      await writeTaskAudit(
        "LTL Update",
        outcome || "LTL Update Completed successfully",
        "task.ltl_update.outcome"
      ).catch(() => null);
    };
  }

  function updateAuthFields() {
    const email = state.user?.email || "";
    ["onboarding", "settings"].forEach(scope => {
      const fields = getScopeFields(scope);
      if (fields.email && email && !fields.email.value) fields.email.value = email;
    });
  }

  function ensureAdminButton() {
    const landingLayout = document.getElementById("landingLayout");
    if (!landingLayout || document.getElementById("sidekickAdminSuiteBtn")) return;
    const button = createElement("button", {
      id: "sidekickAdminSuiteBtn",
      className: "toggle-btn landing-btn sidekick-admin-entry",
      type: "button",
      dataLayoutItem: "adminSuite",
      dataSidekickAdminTool: "true",
      text: "Admin suite"
    });
    button.addEventListener("click", showAdminSuite);
    landingLayout.appendChild(button);
  }

  function ensureAdminView() {
    if (document.getElementById("sidekickAdminSuiteView")) return;

    const view = createElement("div", {
      className: "container sidekick-admin-suite",
      id: "sidekickAdminSuiteView",
      dataSidekickAdminTool: "true"
    });
    view.style.display = "none";
    view.append(
      createElement("h1", { text: "Admin suite" }),
      createElement("p", { className: "complete-intro", text: "Manage Sidekick users and audit logs." }),
      createElement("div", { className: "settings-panel" }, [
        createElement("div", { className: "settings-card" }, [
          createElement("div", { className: "settings-card__title", text: "Session" }),
          createElement("div", { className: "status-line", id: "sidekickAdminSessionStatus" }),
          createElement("button", {
            type: "button",
            className: "toggle-btn settings-card__action",
            id: "sidekickAdminRefreshSessionBtn",
            text: "Refresh session"
          })
        ]),
        createElement("div", { className: "settings-card" }, [
          createElement("div", { className: "settings-card__title", text: "Users" }),
          createElement("button", {
            type: "button",
            className: "toggle-btn settings-card__action",
            id: "sidekickAdminRefreshUsersBtn",
            text: "Refresh users"
          }),
          createElement("div", { className: "sidekick-admin-list", id: "sidekickAdminUsers" })
        ]),
        createElement("div", { className: "settings-card" }, [
          createElement("div", { className: "settings-card__title", text: "Audit logs" }),
          createElement("div", { className: "theme-menu__row" }, [
            createElement("select", { id: "sidekickAuditSeverityFilter" }, [
              createElement("option", { value: "", text: "All severities" }),
              createElement("option", { value: "error", text: "Errors" }),
              createElement("option", { value: "warn", text: "Warnings" }),
              createElement("option", { value: "info", text: "Info" })
            ]),
            createElement("button", {
              type: "button",
              className: "toggle-btn",
              id: "sidekickAdminRefreshLogsBtn",
              text: "Refresh"
            })
          ]),
          createElement("div", { className: "sidekick-admin-list", id: "sidekickAdminLogs" })
        ])
      ]),
      createElement("div", { className: "crm-nav-footer" }, [
        createElement("button", {
          id: "sidekickAdminReturnBtn",
          className: "toggle-btn",
          type: "button",
          text: "Return to CRM Sidekick"
        })
      ])
    );
    document.body.appendChild(view);

    document.getElementById("sidekickAdminReturnBtn")?.addEventListener("click", () => {
      if (typeof window.showLandingView === "function") {
        window.showLandingView();
      } else {
        showOnlyView("landingView");
      }
    });
    document.getElementById("sidekickAdminRefreshSessionBtn")?.addEventListener("click", () => {
      void refreshSession();
    });
    document.getElementById("sidekickAdminRefreshUsersBtn")?.addEventListener("click", () => {
      void loadUsers();
    });
    document.getElementById("sidekickAdminRefreshLogsBtn")?.addEventListener("click", () => {
      void loadLogs();
    });
  }

  function updateAdminVisibility() {
    const isAdmin = state.role === "admin";
    document.querySelectorAll("[data-sidekick-admin-tool]").forEach(element => {
      element.style.display = isAdmin ? "" : "none";
    });
    const status = document.getElementById("sidekickAdminSessionStatus");
    if (status) {
      status.textContent = state.user?.email
        ? `${state.user.email} | ${isAdmin ? "Admin" : "Device Coordinator"}`
        : "Not signed in.";
    }
  }

  function showOnlyView(targetId) {
    document.querySelectorAll(".container").forEach(view => {
      view.style.display = view.id === targetId ? "block" : "none";
    });
  }

  function showAdminSuite() {
    if (state.role !== "admin") {
      setStatus("Admin access is required.", "warn");
      return;
    }
    showOnlyView("sidekickAdminSuiteView");
    void loadUsers();
    void loadLogs();
  }

  async function adminAction(action, payload = {}) {
    return await send("SIDEKICK_ADMIN_ACTION", { action, payload });
  }

  async function loadUsers() {
    const target = document.getElementById("sidekickAdminUsers");
    if (!target) return;
    target.textContent = "Loading users...";
    try {
      const result = await adminAction("list-users", { perPage: 50 });
      renderUsers(result.users || []);
    } catch (error) {
      target.textContent = error?.message || "Unable to load users.";
    }
  }

  function renderUsers(users) {
    const target = document.getElementById("sidekickAdminUsers");
    if (!target) return;
    target.textContent = "";
    if (!users.length) {
      target.textContent = "No users found.";
      return;
    }

    users.forEach(user => {
      const role = roleFromUser(user);
      const row = createElement("div", { className: "sidekick-admin-row" });
      row.append(
        createElement("div", { className: "sidekick-admin-row__main" }, [
          createElement("strong", { text: user.email || user.id }),
          createElement("span", { text: role === "admin" ? "Admin" : role === "trialsPreprep" ? "Trials Preprep" : "Device Coordinator" })
        ]),
        createElement("div", { className: "sidekick-admin-row__actions" }, [
          roleButton(user.id, "deviceCoordinator", "Device Coordinator"),
          roleButton(user.id, "trialsPreprep", "Trials Preprep"),
          roleButton(user.id, "admin", "Admin")
        ])
      );
      target.appendChild(row);
    });
  }

  function roleButton(userId, roleId, label) {
    const button = createElement("button", {
      type: "button",
      className: "toggle-btn sidekick-admin-mini-btn",
      text: label
    });
    button.addEventListener("click", async () => {
      try {
        button.disabled = true;
        await adminAction("update-user-role", { userId, roleId });
        await loadUsers();
      } catch (error) {
        setStatus(error?.message || "Unable to update user role.", "error");
      } finally {
        button.disabled = false;
      }
    });
    return button;
  }

  async function loadLogs() {
    const target = document.getElementById("sidekickAdminLogs");
    const severity = document.getElementById("sidekickAuditSeverityFilter")?.value || "";
    if (!target) return;
    target.textContent = "Loading logs...";
    try {
      const result = await adminAction("get-audit-logs", { limit: 50, severity });
      renderLogs(result.logs || []);
    } catch (error) {
      target.textContent = error?.message || "Unable to load audit logs.";
    }
  }

  function renderLogs(logs) {
    const target = document.getElementById("sidekickAdminLogs");
    if (!target) return;
    target.textContent = "";
    if (!logs.length) {
      target.textContent = "No audit logs found.";
      return;
    }

    logs.forEach(log => {
      const row = createElement("div", { className: "sidekick-admin-row sidekick-admin-row--log" });
      row.append(
        createElement("div", { className: "sidekick-admin-row__main" }, [
          createElement("strong", { text: `${log.severity || "info"} | ${log.event_type || "event"}` }),
          createElement("span", { text: log.action || "" }),
          createElement("small", { text: `${formatDate(log.created_at)} | ${log.profile_label || "Unknown user"}` })
        ])
      );
      target.appendChild(row);
    });
  }

  function formatDate(value) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString();
  }

  function bindButtons() {
    ["onboarding", "settings"].forEach(scope => {
      const suffix = scope === "settings" ? "Settings" : "";
      document.getElementById(`sidekickAuthConnectBtn${suffix}`)?.addEventListener("click", () => {
        void connectFromScope(scope);
      });
      document.getElementById(`sidekickAuthSignOutBtn${suffix}`)?.addEventListener("click", () => {
        void signOutSupabase();
      });
    });
  }

  function removeLegacyLogFolderControls() {
    document.querySelectorAll("[data-log-folder-pick], [data-log-folder-status]").forEach(element => {
      const removable = element.closest(".settings-card, .lookup-file, .note-preview") || element;
      removable.remove();
    });
  }

  function initFrame() {
    addOnboardingAuth();
    addSettingsAuth();
    ensureAdminButton();
    ensureAdminView();
    removeLegacyLogFolderControls();
    installTaskLogOverride();
    bindButtons();
    updateAdminVisibility();
    void refreshSession();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initFrame, { once: true });
  } else {
    initFrame();
  }
})();
