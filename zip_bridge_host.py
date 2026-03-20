#!/usr/bin/env python3
import base64
import json
import os
import shutil
import struct
import subprocess
import sys
import tempfile
from pathlib import Path

HOST_VERSION = "1.0.0"


def send_message(message):
    encoded = json.dumps(message).encode("utf-8")
    sys.stdout.buffer.write(struct.pack("I", len(encoded)))
    sys.stdout.buffer.write(encoded)
    sys.stdout.buffer.flush()


def read_message():
    raw_length = sys.stdin.buffer.read(4)
    if not raw_length:
        return None
    message_length = struct.unpack("I", raw_length)[0]
    data = sys.stdin.buffer.read(message_length)
    return json.loads(data.decode("utf-8"))


def powershell(command: str):
    completed = subprocess.run(
        ["powershell", "-NoProfile", "-NonInteractive", "-Command", command],
        capture_output=True,
        text=True,
        check=False,
    )
    if completed.returncode != 0:
        raise RuntimeError((completed.stderr or completed.stdout or "PowerShell command failed").strip())
    return (completed.stdout or "").strip()


def pick_folder():
    script = r"""
Add-Type -AssemblyName System.Windows.Forms | Out-Null
$dialog = New-Object System.Windows.Forms.FolderBrowserDialog
$dialog.Description = 'Choose the folder where CRM Sidekick should save zip files.'
$dialog.ShowNewFolderButton = $true
if ($dialog.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) {
  Write-Output $dialog.SelectedPath
}
"""
    return powershell(script)


def write_temp_files(temp_root: Path, files):
    for file_info in files:
        relative_path = Path(file_info["name"])
        target = temp_root / relative_path
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(base64.b64decode(file_info["contentBase64"]))


def create_zip(destination: Path, files):
    destination.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="crm-sidekick-zip-") as temp_dir:
        temp_root = Path(temp_dir)
        write_temp_files(temp_root, files)
        if destination.exists():
            destination.unlink()
        escaped_source = str(temp_root / "*").replace("'", "''")
        escaped_dest = str(destination).replace("'", "''")
        powershell(f"Compress-Archive -Path '{escaped_source}' -DestinationPath '{escaped_dest}' -Force")
    return str(destination)


def handle_message(message):
    command = message.get("command")
    if command == "ping":
        return {"ok": True, "version": HOST_VERSION}
    if command == "pick_folder":
        folder = pick_folder()
        return {"ok": bool(folder), "folder": folder}
    if command == "zip_files":
        folder = Path(message["destinationFolder"])
        filename = message["zipName"]
        files = message.get("files", [])
        if not files:
            return {"ok": False, "message": "No files were provided to zip."}
        output_path = create_zip(folder / filename, files)
        return {"ok": True, "outputPath": output_path}
    return {"ok": False, "message": f"Unknown command: {command}"}


def main():
    while True:
        message = read_message()
        if message is None:
            break
        try:
            send_message(handle_message(message))
        except Exception as exc:  # noqa: BLE001
            send_message({"ok": False, "message": str(exc)})


if __name__ == "__main__":
    if os.name != "nt":
        send_message({"ok": False, "message": "Windows only."})
        raise SystemExit(1)
    main()
