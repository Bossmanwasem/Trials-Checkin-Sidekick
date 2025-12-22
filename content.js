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

/**
 * Attach zip bytes (ArrayBuffer) to an <input type="file">
 */
function setFileInputFromBytes(xpath, arrayBuffer, filename) {
  const input = getElementByXPath(xpath);
  if (!input || input.tagName !== "INPUT" || input.type !== "file") {
    return { ok: false, reason: "file_input_not_found_or_wrong_type" };
  }

  try {
    const bytes = new Uint8Array(arrayBuffer);
    const blob = new Blob([bytes], { type: "application/zip" });
    const file = new File([blob], filename, { type: "application/zip" });

    const dt = new DataTransfer();
    dt.items.add(file);

    input.files = dt.files;

    input.dispatchEvent(new Event("change", { bubbles: true }));
    input.dispatchEvent(new Event("input", { bubbles: true }));

    const count = input.files?.length ?? 0;
    const names = [];
    for (let i = 0; i < count; i++) names.push(input.files[i].name);

    return { ok: true, count, names };
  } catch {
    return { ok: false, reason: "exception_setting_files" };
  }
}

/**
 * Read displayed text from any element by xpath
 */
function getTextByXPath(xpath) {
  const el = getElementByXPath(xpath);
  if (!el) return null;

  const txt =
    (typeof el.innerText === "string" ? el.innerText : "") ||
    (typeof el.textContent === "string" ? el.textContent : "") ||
    (typeof el.value === "string" ? el.value : "");

  return (txt || "").trim();
}

/**
 * Confirm file input state
 */
function getFileInputInfoByXPath(xpath) {
  const input = getElementByXPath(xpath);
  if (!input || input.tagName !== "INPUT" || input.type !== "file") {
    return { ok: false, reason: "file_input_not_found_or_wrong_type" };
  }
  const count = input.files?.length ?? 0;
  const names = [];
  for (let i = 0; i < count; i++) names.push(input.files[i].name);
  const valueLen = (input.value || "").length;
  return { ok: true, count, names, valueLen };
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

  if (msg.type === "SET_FILE_INPUT_FROM_BYTES") {
    const result = setFileInputFromBytes(msg.xpath, msg.bytes, msg.filename);
    sendResponse(result);
    return true;
  }

  if (msg.type === "GET_TEXT_BY_XPATH") {
    const text = getTextByXPath(msg.xpath);
    sendResponse({ ok: true, text });
    return true;
  }

  if (msg.type === "GET_FILE_INPUT_INFO_BY_XPATH") {
    const info = getFileInputInfoByXPath(msg.xpath);
    sendResponse(info);
    return true;
  }
});
