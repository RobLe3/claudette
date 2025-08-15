# Claudette Universal Windows Installer
# Cross-Platform Agent - Phase 1 Implementation Swarm
# Supports Windows 10/11 with PowerShell 5.1+ and Core

param(
    [string]$InstallPath = "$env:LOCALAPPDATA\Claudette",
    [string]$Version = "latest",
    [switch]$NoCredentials,
    [switch]$SkipDependencies,
    [switch]$Verbose,
    [switch]$DryRun
)

# Set error action and progress preferences
$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

# Colors for output
$Colors = @{
    Success = "Green"
    Warning = "Yellow" 
    Error = "Red"
    Info = "Cyan"
    Verbose = "Gray"
}

function Write-Status {
    param(
        [string]$Message,
        [string]$Type = "Info",
        [switch]$NoNewline
    )
    
    $color = $Colors[$Type]
    $prefix = switch ($Type) {
        "Success" { "✅" }
        "Warning" { "⚠️ " }
        "Error" { "❌" }
        "Info" { "ℹ️ " }
        "Verbose" { "🔍" }
    }
    
    if ($NoNewline) {
        Write-Host "${prefix} ${Message}" -ForegroundColor $color -NoNewline
    } else {
        Write-Host "${prefix} ${Message}" -ForegroundColor $color
    }
}

function Write-Section {
    param([string]$Title)
    Write-Host "`n🚀 $Title" -ForegroundColor Magenta
    Write-Host ("=" * ($Title.Length + 3)) -ForegroundColor Magenta
}

function Test-Administrator {
    $currentUser = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($currentUser)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Get-NodeJSStatus {
    try {
        $nodeVersion = & node --version 2>$null
        if ($nodeVersion) {
            $versionNumber = $nodeVersion.TrimStart('v')
            $majorVersion = [int]($versionNumber -split '\.')[0]
            
            return @{
                Installed = $true
                Version = $nodeVersion
                Compatible = $majorVersion -ge 18
                Path = (Get-Command node).Source
            }
        }
    } catch {
        # Node not found
    }
    
    return @{
        Installed = $false
        Version = $null
        Compatible = $false
        Path = $null
    }
}

function Install-NodeJS {
    Write-Section "Node.js Installation"
    
    $nodeStatus = Get-NodeJSStatus
    
    if ($nodeStatus.Installed -and $nodeStatus.Compatible) {
        Write-Status "Node.js $($nodeStatus.Version) already installed and compatible" "Success"
        return $true
    }
    
    if ($nodeStatus.Installed -and -not $nodeStatus.Compatible) {
        Write-Status "Node.js $($nodeStatus.Version) installed but incompatible (need >=18.0.0)" "Warning"
        Write-Status "Please update Node.js manually or continue with automatic installation" "Warning"
    }
    
    Write-Status "Installing Node.js LTS..." "Info"
    
    # Try winget first (Windows 10 1709+ / Windows 11)
    if (Get-Command winget -ErrorAction SilentlyContinue) {
        Write-Status "Using winget to install Node.js..." "Info"
        try {
            if ($DryRun) {
                Write-Status "[DRY RUN] Would execute: winget install OpenJS.NodeJS" "Verbose"
                return $true
            }
            
            & winget install OpenJS.NodeJS --accept-package-agreements --accept-source-agreements
            
            # Refresh PATH
            $env:PATH = [System.Environment]::GetEnvironmentVariable("PATH", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("PATH", "User")
            
            # Verify installation
            Start-Sleep -Seconds 3
            $newStatus = Get-NodeJSStatus
            if ($newStatus.Installed -and $newStatus.Compatible) {
                Write-Status "Node.js installed successfully via winget" "Success"
                return $true
            }
        } catch {
            Write-Status "winget installation failed: $($_.Exception.Message)" "Warning"
        }
    }
    
    # Try Chocolatey as fallback
    if (Get-Command choco -ErrorAction SilentlyContinue) {
        Write-Status "Using Chocolatey to install Node.js..." "Info"
        try {
            if ($DryRun) {
                Write-Status "[DRY RUN] Would execute: choco install nodejs --version latest -y" "Verbose"
                return $true
            }
            
            & choco install nodejs --version latest -y
            
            # Refresh PATH  
            $env:PATH = [System.Environment]::GetEnvironmentVariable("PATH", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("PATH", "User")
            
            # Verify installation
            Start-Sleep -Seconds 3
            $newStatus = Get-NodeJSStatus
            if ($newStatus.Installed -and $newStatus.Compatible) {
                Write-Status "Node.js installed successfully via Chocolatey" "Success"
                return $true
            }
        } catch {
            Write-Status "Chocolatey installation failed: $($_.Exception.Message)" "Warning"
        }
    }
    
    # Manual download and install
    Write-Status "Downloading Node.js installer manually..." "Info"
    
    $arch = if ([Environment]::Is64BitOperatingSystem) { "x64" } else { "x86" }
    $nodeUrl = "https://nodejs.org/dist/v20.10.0/node-v20.10.0-win-$arch.zip"
    $tempPath = "$env:TEMP\nodejs-installer"
    
    try {
        if ($DryRun) {
            Write-Status "[DRY RUN] Would download: $nodeUrl" "Verbose"
            Write-Status "[DRY RUN] Would extract to: $InstallPath\nodejs" "Verbose"
            return $true
        }
        
        # Create temp directory
        New-Item -ItemType Directory -Path $tempPath -Force | Out-Null
        
        # Download Node.js
        $zipPath = "$tempPath\nodejs.zip"
        Write-Status "Downloading from $nodeUrl..." "Info"
        Invoke-WebRequest -Uri $nodeUrl -OutFile $zipPath -UseBasicParsing
        
        # Extract
        $extractPath = "$InstallPath\nodejs"
        Write-Status "Extracting to $extractPath..." "Info"
        Expand-Archive -Path $zipPath -DestinationPath $tempPath -Force
        
        # Move to final location
        $extractedDir = Get-ChildItem -Path $tempPath -Directory | Where-Object { $_.Name -like "node-*" } | Select-Object -First 1
        if ($extractedDir) {
            New-Item -ItemType Directory -Path (Split-Path $extractPath) -Force | Out-Null
            Move-Item -Path $extractedDir.FullName -Destination $extractPath -Force
            
            # Add to PATH
            $userPath = [System.Environment]::GetEnvironmentVariable("PATH", "User")
            if ($userPath -notlike "*$extractPath*") {
                $newPath = "$userPath;$extractPath"
                [System.Environment]::SetEnvironmentVariable("PATH", $newPath, "User")
                $env:PATH += ";$extractPath"
            }
            
            Write-Status "Node.js installed to $extractPath" "Success"
            Write-Status "Please restart your terminal to use node commands" "Warning"
            return $true
        }
    } catch {
        Write-Status "Manual Node.js installation failed: $($_.Exception.Message)" "Error"
    } finally {
        # Clean up temp files
        if (Test-Path $tempPath) {
            Remove-Item -Path $tempPath -Recurse -Force -ErrorAction SilentlyContinue
        }
    }
    
    Write-Status "Node.js installation failed. Please install manually from https://nodejs.org" "Error"
    return $false
}

function Test-WindowsCredentialManager {
    try {
        # Test if cmdkey is available (should be on all Windows versions)
        & cmdkey /list >$null 2>$null
        return $true
    } catch {
        return $false
    }
}

function Get-ClaudetteRelease {
    param([string]$Version = "latest")
    
    try {
        $apiUrl = if ($Version -eq "latest") {
            "https://api.github.com/repos/user/claudette/releases/latest"
        } else {
            "https://api.github.com/repos/user/claudette/releases/tags/$Version"
        }
        
        Write-Status "Fetching release information..." "Info"
        $release = Invoke-RestMethod -Uri $apiUrl -UseBasicParsing
        
        # Find the appropriate asset (tarball)
        $asset = $release.assets | Where-Object { $_.name -like "*.tar.gz" -or $_.name -like "*.zip" } | Select-Object -First 1
        
        if (-not $asset) {
            $asset = @{
                browser_download_url = $release.tarball_url
                name = "source.tar.gz"
            }
        }
        
        return @{
            Version = $release.tag_name
            DownloadUrl = $asset.browser_download_url
            FileName = $asset.name
            Size = $asset.size
        }
    } catch {
        Write-Status "Failed to fetch release information: $($_.Exception.Message)" "Warning"
        Write-Status "Falling back to direct download..." "Info"
        
        return @{
            Version = "main"
            DownloadUrl = "https://github.com/user/claudette/archive/refs/heads/main.zip"
            FileName = "main.zip"
            Size = $null
        }
    }
}

function Install-Claudette {
    Write-Section "Claudette Installation"
    
    # Get release information
    $release = Get-ClaudetteRelease -Version $Version
    Write-Status "Installing Claudette $($release.Version)..." "Info"
    
    if ($DryRun) {
        Write-Status "[DRY RUN] Would download: $($release.DownloadUrl)" "Verbose"
        Write-Status "[DRY RUN] Would install to: $InstallPath" "Verbose"
        return $true
    }
    
    # Create installation directory
    New-Item -ItemType Directory -Path $InstallPath -Force | Out-Null
    
    # Download and extract
    $tempPath = "$env:TEMP\claudette-install"
    New-Item -ItemType Directory -Path $tempPath -Force | Out-Null
    
    try {
        $archivePath = "$tempPath\$($release.FileName)"
        
        Write-Status "Downloading Claudette..." "Info"
        Invoke-WebRequest -Uri $release.DownloadUrl -OutFile $archivePath -UseBasicParsing
        
        Write-Status "Extracting archive..." "Info"
        
        if ($release.FileName -like "*.zip") {
            Expand-Archive -Path $archivePath -DestinationPath $tempPath -Force
        } else {
            # Handle .tar.gz files (requires tar command or 7zip)
            if (Get-Command tar -ErrorAction SilentlyContinue) {
                & tar -xzf $archivePath -C $tempPath
            } elseif (Get-Command 7z -ErrorAction SilentlyContinue) {
                & 7z x $archivePath -o"$tempPath"
            } else {
                Write-Status "Cannot extract .tar.gz file. Please install tar or 7-Zip" "Error"
                return $false
            }
        }
        
        # Find extracted directory
        $extractedDir = Get-ChildItem -Path $tempPath -Directory | Where-Object { $_.Name -like "claudette*" } | Select-Object -First 1
        
        if (-not $extractedDir) {
            Write-Status "Could not find extracted Claudette directory" "Error"
            return $false
        }
        
        # Copy files to installation directory
        Write-Status "Installing files..." "Info"
        Copy-Item -Path "$($extractedDir.FullName)\*" -Destination $InstallPath -Recurse -Force
        
        # Set up npm dependencies
        Write-Status "Installing npm dependencies..." "Info"
        Push-Location $InstallPath
        try {
            & npm install --production
            Write-Status "Dependencies installed successfully" "Success"
        } catch {
            Write-Status "npm install failed: $($_.Exception.Message)" "Warning"
        } finally {
            Pop-Location
        }
        
        return $true
        
    } catch {
        Write-Status "Installation failed: $($_.Exception.Message)" "Error"
        return $false
    } finally {
        # Clean up temp files
        if (Test-Path $tempPath) {
            Remove-Item -Path $tempPath -Recurse -Force -ErrorAction SilentlyContinue
        }
    }
}

function Setup-Environment {
    Write-Section "Environment Setup"
    
    # Add Claudette to PATH
    $binPath = "$InstallPath"
    $userPath = [System.Environment]::GetEnvironmentVariable("PATH", "User")
    
    if ($userPath -notlike "*$binPath*") {
        if ($DryRun) {
            Write-Status "[DRY RUN] Would add to PATH: $binPath" "Verbose"
        } else {
            $newPath = if ($userPath) { "$userPath;$binPath" } else { $binPath }
            [System.Environment]::SetEnvironmentVariable("PATH", $newPath, "User")
            $env:PATH += ";$binPath"
            Write-Status "Added Claudette to PATH" "Success"
        }
    } else {
        Write-Status "Claudette already in PATH" "Success"
    }
    
    # Create desktop shortcut
    try {
        $shortcutPath = "$env:USERPROFILE\Desktop\Claudette.lnk"
        $targetPath = "$InstallPath\claudette.cmd"
        
        if ($DryRun) {
            Write-Status "[DRY RUN] Would create desktop shortcut: $shortcutPath" "Verbose"
        } else {
            $WScriptShell = New-Object -ComObject WScript.Shell
            $Shortcut = $WScriptShell.CreateShortcut($shortcutPath)
            $Shortcut.TargetPath = "cmd.exe"
            $Shortcut.Arguments = "/k `"$targetPath`""
            $Shortcut.WorkingDirectory = $InstallPath
            $Shortcut.Description = "Claudette AI Middleware"
            $Shortcut.Save()
            Write-Status "Created desktop shortcut" "Success"
        }
    } catch {
        Write-Status "Could not create desktop shortcut: $($_.Exception.Message)" "Warning"
    }
}

function Setup-Credentials {
    param([string]$InstallPath)
    
    if ($NoCredentials) {
        Write-Status "Skipping credential setup (--NoCredentials specified)" "Warning"
        return
    }
    
    Write-Section "Credential Setup"
    
    if (-not (Test-WindowsCredentialManager)) {
        Write-Status "Windows Credential Manager not available" "Warning"
        Write-Status "Credentials will be stored in encrypted files" "Info"
    } else {
        Write-Status "Windows Credential Manager available" "Success"
    }
    
    Write-Status "Credential setup will be handled by Claudette on first run" "Info"
    Write-Status "Run 'claudette setup-credentials' to configure API keys" "Info"
}

function Test-Installation {
    Write-Section "Installation Verification"
    
    # Test Node.js
    $nodeStatus = Get-NodeJSStatus
    if ($nodeStatus.Installed -and $nodeStatus.Compatible) {
        Write-Status "Node.js: $($nodeStatus.Version) ✓" "Success"
    } else {
        Write-Status "Node.js: Not properly installed" "Error"
        return $false
    }
    
    # Test Claudette files
    $mainFile = "$InstallPath\package.json"
    if (Test-Path $mainFile) {
        try {
            $package = Get-Content $mainFile | ConvertFrom-Json
            Write-Status "Claudette: v$($package.version) ✓" "Success"
        } catch {
            Write-Status "Claudette: Installation corrupt" "Error"
            return $false
        }
    } else {
        Write-Status "Claudette: Files missing" "Error" 
        return $false
    }
    
    # Test npm dependencies
    $nodeModules = "$InstallPath\node_modules"
    if (Test-Path $nodeModules) {
        Write-Status "Dependencies: Installed ✓" "Success"
    } else {
        Write-Status "Dependencies: Missing (run npm install)" "Warning"
    }
    
    # Test credential manager
    if (Test-WindowsCredentialManager) {
        Write-Status "Credentials: Windows Credential Manager available ✓" "Success"
    } else {
        Write-Status "Credentials: Will use encrypted file storage" "Warning"
    }
    
    return $true
}

function Write-CompletionMessage {
    param([string]$InstallPath)
    
    Write-Host "`n🎉 " -NoNewline -ForegroundColor Green
    Write-Host "Claudette installation completed successfully!" -ForegroundColor Green
    Write-Host "`n📍 Installation Location: " -NoNewline -ForegroundColor Cyan
    Write-Host $InstallPath -ForegroundColor White
    
    Write-Host "`n🚀 Getting Started:" -ForegroundColor Magenta
    Write-Host "   1. Restart your terminal or run: refreshenv" -ForegroundColor White
    Write-Host "   2. Set up API keys: " -NoNewline -ForegroundColor White
    Write-Host "claudette setup-credentials" -ForegroundColor Yellow
    Write-Host "   3. Test installation: " -NoNewline -ForegroundColor White
    Write-Host "claudette status" -ForegroundColor Yellow
    Write-Host "   4. Start using Claudette: " -NoNewline -ForegroundColor White
    Write-Host "claudette `"Hello world`"" -ForegroundColor Yellow
    
    Write-Host "`n📚 Documentation: https://github.com/user/claudette" -ForegroundColor Cyan
    Write-Host "🆘 Support: https://github.com/user/claudette/issues" -ForegroundColor Cyan
}

# Main installation flow
function Main {
    try {
        Write-Host "🚀 Claudette Universal Windows Installer" -ForegroundColor Magenta
        Write-Host "========================================" -ForegroundColor Magenta
        Write-Host "Cross-Platform Agent - Phase 1 Implementation" -ForegroundColor Gray
        
        if ($DryRun) {
            Write-Status "DRY RUN MODE - No changes will be made" "Warning"
        }
        
        # System checks
        Write-Section "System Requirements"
        
        $isAdmin = Test-Administrator
        if ($isAdmin) {
            Write-Status "Running as Administrator" "Success"
        } else {
            Write-Status "Running as standard user (recommended)" "Info"
        }
        
        Write-Status "Windows Version: $([Environment]::OSVersion.VersionString)" "Info"
        Write-Status "PowerShell Version: $($PSVersionTable.PSVersion)" "Info"
        Write-Status "Architecture: $([Environment]::Is64BitOperatingSystem ? 'x64' : 'x86')" "Info"
        
        # Install dependencies
        if (-not $SkipDependencies) {
            if (-not (Install-NodeJS)) {
                Write-Status "Node.js installation failed - aborting" "Error"
                exit 1
            }
        } else {
            Write-Status "Skipping dependency installation" "Warning"
        }
        
        # Install Claudette
        if (-not (Install-Claudette)) {
            Write-Status "Claudette installation failed - aborting" "Error"
            exit 1
        }
        
        # Setup environment
        Setup-Environment
        
        # Setup credentials
        Setup-Credentials -InstallPath $InstallPath
        
        # Verify installation
        if (-not (Test-Installation)) {
            Write-Status "Installation verification failed" "Error"
            exit 1
        }
        
        # Success message
        Write-CompletionMessage -InstallPath $InstallPath
        
    } catch {
        Write-Status "Installation failed: $($_.Exception.Message)" "Error"
        Write-Status "Please check the error messages above and try again" "Error"
        exit 1
    }
}

# Run main installation
Main