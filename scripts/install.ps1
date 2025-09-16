# Claudette Cross-Platform Installation Entry Point (PowerShell)
# Automatically detects platform and runs appropriate installer

param(
    [Parameter(ValueFromRemainingArguments)]
    [string[]]$RemainingArgs
)

Write-Host "🚀 Claudette Universal Installer" -ForegroundColor Blue
Write-Host "================================" -ForegroundColor Blue

# Detect platform
if ($IsWindows -or ($env:OS -eq "Windows_NT")) {
    Write-Host "✅ Detected Windows" -ForegroundColor Green
    $installerPath = Join-Path $PSScriptRoot "install\install-windows.ps1"
    
    if (Test-Path $installerPath) {
        & $installerPath @RemainingArgs
    } else {
        Write-Host "❌ Windows installer not found at: $installerPath" -ForegroundColor Red
        exit 1
    }
} elseif ($IsMacOS) {
    Write-Host "✅ Detected macOS" -ForegroundColor Green
    $installerPath = Join-Path $PSScriptRoot "install/install-unix.sh"
    
    if (Test-Path $installerPath) {
        bash $installerPath @RemainingArgs
    } else {
        Write-Host "❌ Unix installer not found at: $installerPath" -ForegroundColor Red
        exit 1
    }
} elseif ($IsLinux) {
    Write-Host "✅ Detected Linux" -ForegroundColor Green
    $installerPath = Join-Path $PSScriptRoot "install/install-unix.sh"
    
    if (Test-Path $installerPath) {
        bash $installerPath @RemainingArgs
    } else {
        Write-Host "❌ Unix installer not found at: $installerPath" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "⚠️  Platform detection failed" -ForegroundColor Yellow
    Write-Host "Please run the appropriate installer manually:" -ForegroundColor Yellow
    Write-Host "  Windows: .\scripts\install\install-windows.ps1" -ForegroundColor Yellow
    Write-Host "  Unix:    ./scripts/install/install-unix.sh" -ForegroundColor Yellow
    exit 1
}