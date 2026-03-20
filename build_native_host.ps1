param(
    [switch]$Clean
)

$ErrorActionPreference = 'Stop'

$RepoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $RepoRoot

if ($Clean) {
    Remove-Item -Recurse -Force dist, build -ErrorAction SilentlyContinue
    Remove-Item -Force zip_bridge_host.spec, native_host_installer.spec -ErrorAction SilentlyContinue
}

if (-not (Get-Command pyinstaller -ErrorAction SilentlyContinue)) {
    Write-Host 'PyInstaller was not found. Installing it for the current Python environment...'
    python -m pip install pyinstaller
}

python -m PyInstaller --noconfirm --clean --onefile --name zip_bridge_host zip_bridge_host.py
python -m PyInstaller --noconfirm --clean --onefile --name native_host_installer native_host_installer.py

Copy-Item .\dist\zip_bridge_host.exe .\zip_bridge_host.exe -Force
Copy-Item .\dist\native_host_installer.exe .\native_host_installer.exe -Force

Write-Host 'Built packaged executables:'
Write-Host ' - .\zip_bridge_host.exe'
Write-Host ' - .\native_host_installer.exe'
Write-Host ''
Write-Host 'Distribute native_host_installer.exe together with zip_bridge_host.exe.'
