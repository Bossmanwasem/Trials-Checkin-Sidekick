#!/usr/bin/env python3
import json
import os
import shutil
import sys
import winreg
from pathlib import Path

HOST_NAME = "com.ttmt.crm_sidekick.zip_bridge"
INSTALL_DIR = Path(os.environ.get("LOCALAPPDATA", Path.home())) / "TTMT" / "CRM Sidekick Native Host"
MANIFEST_PATH = INSTALL_DIR / f"{HOST_NAME}.json"
HOST_SCRIPT_NAME = "zip_bridge_host.py"
REG_PATH = rf"Software\Google\Chrome\NativeMessagingHosts\{HOST_NAME}"
EDGE_REG_PATH = rf"Software\Microsoft\Edge\NativeMessagingHosts\{HOST_NAME}"


def build_manifest(host_script: Path) -> dict:
    extension_id = os.environ.get("CRM_SIDEKICK_EXTENSION_ID", "REPLACE_WITH_EXTENSION_ID")
    return {
        "name": HOST_NAME,
        "description": "TTMT CRM Sidekick native zip bridge",
        "path": str(host_script),
        "type": "stdio",
        "allowed_origins": [f"chrome-extension://{extension_id}/"]
    }


def write_registry_value(root, reg_path: str, manifest_path: Path) -> None:
    key = winreg.CreateKey(root, reg_path)
    try:
        winreg.SetValueEx(key, None, 0, winreg.REG_SZ, str(manifest_path))
    finally:
        winreg.CloseKey(key)


def install() -> None:
    repo_root = Path(__file__).resolve().parent
    source_host = repo_root / HOST_SCRIPT_NAME
    if not source_host.exists():
        raise FileNotFoundError(f"Missing host script: {source_host}")

    INSTALL_DIR.mkdir(parents=True, exist_ok=True)
    target_host = INSTALL_DIR / HOST_SCRIPT_NAME
    shutil.copy2(source_host, target_host)

    manifest = build_manifest(target_host)
    MANIFEST_PATH.write_text(json.dumps(manifest, indent=2), encoding="utf-8")

    write_registry_value(winreg.HKEY_CURRENT_USER, REG_PATH, MANIFEST_PATH)
    write_registry_value(winreg.HKEY_CURRENT_USER, EDGE_REG_PATH, MANIFEST_PATH)

    print("Installed TTMT CRM Sidekick native host.")
    print(f"Manifest: {MANIFEST_PATH}")
    print("Set CRM_SIDEKICK_EXTENSION_ID before running if you need a real allowed_origins value.")


if __name__ == "__main__":
    if sys.platform != "win32":
        raise SystemExit("This installer only runs on Windows.")
    install()
