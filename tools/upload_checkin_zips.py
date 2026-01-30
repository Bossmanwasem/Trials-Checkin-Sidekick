import argparse
import json
import mimetypes
import os
from pathlib import Path

import requests
from bs4 import BeautifulSoup

BASE = "https://portal.talktometechnologies.com"

# ---- Choose ONE auth approach ----
# A) Quick test: paste cookies from your browser (dev tools > Application > Cookies)
COOKIES = {
    # Only keep FIRST-PARTY portal cookies. Example names (values truncated here):
    ".AspNet.ApplicationCookie": "v7hoQ1-...snip...",
    "ASP.NET_SessionId": "ffkb5jjswsnmjorqueca42ak",
    "ARRAffinity": "a9a58...snip...",
    "ARRAffinitySameSite": "a9a58...snip..."
}

# B) (Recommended for production) Implement a real login here if you have the login form URL.
# Then comment out COOKIES above and let the session manage auth cookies.

# ---- Field names from your HTML ----
FIELD_FILE = "ctl00$MainContent$Tabs$tpDocuments$filUpload"
FIELD_UPLOAD_BTN = "ctl00$MainContent$Tabs$tpDocuments$btnUpload"
FIELD_TITLE = "ctl00$MainContent$Tabs$tpDocuments$txtDocumentTitle"
FIELD_ADD_BTN = "ctl00$MainContent$Tabs$tpDocuments$btnAddDocument"


def parse_hidden_fields(html):
    soup = BeautifulSoup(html, "html.parser")
    data = {}
    # Grab all hidden inputs (WebForms can add many)
    for inp in soup.select("input[type=hidden]"):
        name = inp.get("name")
        if name:
            data[name] = inp.get("value", "")
    # Ensure event target/argument exist
    data.setdefault("__EVENTTARGET", "")
    data.setdefault("__EVENTARGUMENT", "")
    return data


def guess_mime(path):
    m = mimetypes.guess_type(path)[0]
    return m or "application/octet-stream"


def upload_one(session, page_url, file_path, document_title):
    # 1) GET page to capture hidden fields
    r1 = session.get(page_url)
    r1.raise_for_status()
    hidden1 = parse_hidden_fields(r1.text)

    # 2) POST file with Upload button
    filename = os.path.basename(file_path)
    with open(file_path, "rb") as handle:
        files = {
            FIELD_FILE: (filename, handle, guess_mime(file_path))
        }
        data_upload = hidden1.copy()
        data_upload[FIELD_UPLOAD_BTN] = "Upload"

        r2 = session.post(page_url, data=data_upload, files=files)
        r2.raise_for_status()

    # 3) Parse refreshed hidden fields from response
    hidden2 = parse_hidden_fields(r2.text)

    # 4) POST title with Add Document button (no file this time)
    data_add = hidden2.copy()
    data_add[FIELD_TITLE] = document_title
    data_add[FIELD_ADD_BTN] = "Add Document"

    r3 = session.post(page_url, data=data_add)
    r3.raise_for_status()

    # Simple success heuristic
    if "View Documents" in r3.text or "Documents" in r3.text:
        print(f"✅ Uploaded: {filename} → '{document_title}'")
    else:
        print(f"⚠️ Posted '{filename}' + title, but couldn't verify from HTML. Check the page to confirm.")


def load_cookie_overrides(cookie_json_path):
    if not cookie_json_path:
        return {}
    with open(cookie_json_path, "r", encoding="utf-8") as handle:
        data = json.load(handle)
    if not isinstance(data, dict):
        raise ValueError("Cookie JSON must be an object of {name: value}.")
    return data


def collect_zip_files(file_args, zip_dir):
    files = []
    if zip_dir:
        for path in sorted(Path(zip_dir).glob("*.zip")):
            files.append(path)
    if file_args:
        files.extend(Path(item) for item in file_args)
    unique_files = []
    seen = set()
    for path in files:
        resolved = path.resolve()
        if resolved in seen:
            continue
        seen.add(resolved)
        unique_files.append(path)
    return unique_files


def main():
    parser = argparse.ArgumentParser(
        description=(
            "Upload check-in zip files to the CRM Documents tab. "
            "Document titles default to the generated zip filename (without .zip)."
        )
    )
    parser.add_argument("--client-id", required=True, help="CRM client ID (from EditClient.aspx?ID=...)")
    parser.add_argument("--zip-dir", help="Folder containing check-in zip files to upload.")
    parser.add_argument("--file", action="append", dest="files", help="Path to a zip file (repeatable).")
    parser.add_argument(
        "--cookie-json",
        help="Optional path to JSON file with portal cookies (overrides COOKIES in this script)."
    )
    args = parser.parse_args()

    page_url = f"{BASE}/admin/EditClient.aspx?ID={args.client_id}"

    zip_files = collect_zip_files(args.files, args.zip_dir)
    if not zip_files:
        raise SystemExit("No zip files found. Provide --zip-dir and/or --file.")

    session = requests.Session()
    session.headers.update({"User-Agent": "Mozilla/5.0"})
    cookie_overrides = load_cookie_overrides(args.cookie_json)
    session.cookies.update(COOKIES | cookie_overrides)

    for file_path in zip_files:
        if not file_path.exists():
            print(f"⚠️ Skipping missing file: {file_path}")
            continue
        if file_path.suffix.lower() != ".zip":
            print(f"⚠️ Skipping non-zip file: {file_path}")
            continue
        document_title = file_path.stem
        upload_one(session, page_url, str(file_path), document_title)


if __name__ == "__main__":
    main()
