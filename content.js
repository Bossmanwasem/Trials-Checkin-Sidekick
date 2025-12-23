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

function dispatchChangeEvents(el) {
  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));
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
    firstName: getInputValueById(
      "ctl00_MainContent_Tabs_tpClient_ClientTabs_tpClientInfo_txtClientFirstName"
    ),
    lastName: getInputValueById(
      "ctl00_MainContent_Tabs_tpClient_ClientTabs_tpClientInfo_txtClientLastName"
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

});
