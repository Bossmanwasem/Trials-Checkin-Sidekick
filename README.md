# Trials Check-in Sidekick

Trials Check-in Sidekick is a lightweight browser extension that streamlines participant check-ins and session tracking. It focuses on fast, reliable workflows for coordinators without exposing internal URLs or system links.

## Key Features

- **Fast check-in workflow**: Capture attendance quickly with a clear, focused interface.
- **Session awareness**: Keep track of active sessions and participant status at a glance.
- **Validation safeguards**: Prevent incomplete submissions with basic input checks and prompts.
- **In-context panel**: Operate from a dedicated side panel while staying on the current page.
- **Native Windows zip bridge**: Save check-in zip files silently through a Native Messaging Host instead of browser downloads.
- **Lightweight and responsive**: Minimal footprint for smooth performance.

## Native zip bridge

This repo now includes a Windows Native Messaging Host pair:

- `zip_bridge_host.py` is the source for the native host, which is packaged into `zip_bridge_host.exe` for distribution and uses PowerShell's native `Compress-Archive` command.
- `native_host_installer.py` is the source for the installer, which is packaged into `native_host_installer.exe` to install the host, write the Native Messaging manifest, and register it for Chrome and Edge in the current user's registry hive.
- `build_native_host.ps1` creates both packaged `.exe` files with PyInstaller so end users do not need Python installed.

Before running the packaged installer, set `CRM_SIDEKICK_EXTENSION_ID` to the unpacked or published extension ID so the generated manifest allows your extension origin.

For a full Windows deployment walkthrough, see [`docs/messaging-bridge-install.md`](docs/messaging-bridge-install.md).

## Core Functions

- **Open side panel** to manage check-ins without navigating away.
- **Record participant status** with a consistent, repeatable flow.
- **Review session details** to confirm timing and status before submitting.
- **Update entries** when participant information changes.
- **Silently zip and save trial vocab files** using the native Windows bridge and the existing Sidekick naming convention.

## Who It’s For

- Trial coordinators and staff who need a streamlined, reliable check-in tool.
- Teams that want a simple workflow with minimal distractions.

## Notes

This README intentionally avoids internal system links and implementation-specific URLs.
