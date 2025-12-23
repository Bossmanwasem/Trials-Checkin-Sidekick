// content.js

/* ---------------- Utilities ---------------- */

const INVENTORY_URL = "https://portal.talktometechnologies.com/admin/ManageInventory.aspx";
const INVENTORY_RETURNED_DROPDOWN_XPATH = '//*[@id="ctl00_MainContent_dvwInventory_ddlReturned"]';
const INVENTORY_SUBMIT_LINK_XPATH = '//*[@id="ctl00_MainContent_dvwInventory"]/tbody/tr[10]/td/a[1]';

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

function waitForElementByXPath(xpath, timeoutMs = 7000, pollMs = 150) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const check = () => {
      const el = getElementByXPath(xpath);
      if (el) {
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

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function dispatchChangeEvents(el) {
  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));
}

const UNSAFE_NAME_REGEX = /\s?(\*\d{5}|\*.*?\*|\(.*?\)|\b\d{5}\b|"[^"]*")/g;

function sanitizeName(name) {
  return (name || "").replace(UNSAFE_NAME_REGEX, "").trim();
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

  if ("value" in el) el.value = value;
  else el.textContent = value;

  dispatchChangeEvents(el);
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

async function runInventoryEditSearch(searchValueRaw) {
  const target = (searchValueRaw || "").trim().toLowerCase();
  const rows = document.querySelectorAll("table tr");
  let foundRow = null;

  for (const row of rows) {
    row.style.outline = "";
    const cells = row.querySelectorAll("td");
    if (cells.length < 2) continue;

    const serialCell = cells[1];
    const cellText = serialCell.textContent.trim().toLowerCase();

    if (cellText.startsWith(target)) {
      foundRow = row;
      break;
    }
  }

  if (foundRow) {
    foundRow.style.outline = "4px solid limegreen";
    foundRow.scrollIntoView({ behavior: "smooth", block: "center" });

    await delay(1200);
    const editBtn = foundRow.querySelector("input[src*='Edit.gif']");
    if (!editBtn) {
      alert("Edit icon not found in matching row!");
      return false;
    }
    editBtn.click();

    try {
      await waitForElementByXPath(INVENTORY_RETURNED_DROPDOWN_XPATH);
    } catch (err) {
      alert(err.message || "Inventory edit view did not load.");
      return false;
    }

    const setDropdown = setDropdownByVisibleText(INVENTORY_RETURNED_DROPDOWN_XPATH, "Yes");
    if (!setDropdown) {
      alert('Could not set "Returned" dropdown to "Yes".');
      return false;
    }

    try {
      const submitLink = await waitForElementByXPath(INVENTORY_SUBMIT_LINK_XPATH);
      submitLink.click();
    } catch (err) {
      alert(err.message || "Could not click the submit link.");
      return false;
    }

    return true;
  } else {
    alert("No matching row found for: " + searchValueRaw);
    return false;
  }
}

/* ---------------- Message Listener ---------------- */

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
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

  if (msg.type === "RUN_INVENTORY_SCRIPT") {
    const href = window.location.href;
    if (!href.startsWith(INVENTORY_URL)) {
      sendResponse({ ok: false, error: "Inventory tab is not open to ManageInventory.aspx." });
      return true;
    }

    if (!msg.searchValue) {
      sendResponse({ ok: false, error: "No search value provided." });
      return true;
    }

    (async () => {
      const ok = await runInventoryEditSearch(msg.searchValue);
      sendResponse({ ok });
    })();
    return true;
  }

});
