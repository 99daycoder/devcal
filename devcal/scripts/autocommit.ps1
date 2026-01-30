# ============================================
# DEVCAL AUTO-COMMIT SCRIPT
# ============================================
# This PowerShell script automatically commits
# code changes every 60 seconds to a "pending"
# branch for tracking developer activity.
#
# USAGE:
#   1. Open PowerShell in your project directory
#   2. Run: .\scripts\autocommit.ps1
#   3. Press Ctrl+C to stop
#
# REQUIREMENTS:
#   - Git installed and in PATH
#   - PowerShell 5.0 or later
#   - Execution policy set (see below)
#
# IF YOU GET AN EXECUTION POLICY ERROR:
#   Run this command first (as Administrator):
#   Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
# ============================================

# Configuration
$BRANCH_NAME = "pending"
$COMMIT_INTERVAL = 60  # seconds between commits
$LOG_FILE = "autocommit.log"

# Colors for output
$colors = @{
    Success = "Green"
    Warning = "Yellow"
    Error = "Red"
    Info = "Cyan"
}

# ============================================
# HELPER FUNCTIONS
# ============================================

function Write-Log {
    param(
        [string]$Message,
        [string]$Level = "Info"
    )

    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logMessage = "[$timestamp] [$Level] $Message"

    # Write to console with color
    Write-Host $logMessage -ForegroundColor $colors[$Level]

    # Append to log file
    Add-Content -Path $LOG_FILE -Value $logMessage
}

function Show-Banner {
    $banner = @"

    ____              ______      __
   / __ \___ _   __  / ____/___ _/ /
  / / / / _ \ | / / / /   / __ '/ /
 / /_/ /  __/ |/ / / /___/ /_/ / /
/_____/\___/|___/  \____/\__,_/_/

    AUTO-COMMIT SCRIPT v1.0
    ========================

    Commits: Every $COMMIT_INTERVAL seconds
    Branch:  $BRANCH_NAME

    Press Ctrl+C to stop

"@
    Write-Host $banner -ForegroundColor Cyan
}

function Test-GitRepository {
    try {
        $null = git rev-parse --is-inside-work-tree 2>&1
        return $LASTEXITCODE -eq 0
    }
    catch {
        return $false
    }
}

function Get-CurrentBranch {
    return (git branch --show-current 2>&1).Trim()
}

function Test-BranchExists {
    param([string]$BranchName)

    $branches = git branch --list $BranchName 2>&1
    return $branches -match $BranchName
}

function New-PendingBranch {
    Write-Log "Creating branch: $BRANCH_NAME" "Info"

    # Get current branch to return to later if needed
    $currentBranch = Get-CurrentBranch

    if (Test-BranchExists $BRANCH_NAME) {
        Write-Log "Branch '$BRANCH_NAME' already exists" "Info"
    }
    else {
        # Create the branch from current HEAD
        git branch $BRANCH_NAME 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Log "Created branch: $BRANCH_NAME" "Success"
        }
        else {
            Write-Log "Failed to create branch: $BRANCH_NAME" "Error"
            return $false
        }
    }

    return $true
}

function Switch-ToBranch {
    param([string]$BranchName)

    $currentBranch = Get-CurrentBranch
    if ($currentBranch -eq $BranchName) {
        return $true
    }

    Write-Log "Switching to branch: $BranchName" "Info"
    git checkout $BranchName 2>&1

    return $LASTEXITCODE -eq 0
}

function Get-ChangedFiles {
    # Get list of changed files (modified, added, deleted)
    $status = git status --porcelain 2>&1
    return $status
}

function Invoke-AutoCommit {
    $changes = Get-ChangedFiles

    if ([string]::IsNullOrWhiteSpace($changes)) {
        Write-Log "No changes detected" "Info"
        return $false
    }

    # Count changes
    $changeLines = $changes -split "`n" | Where-Object { $_ -ne "" }
    $changeCount = $changeLines.Count

    Write-Log "Detected $changeCount changed file(s)" "Info"

    # Stage all changes
    git add -A 2>&1

    if ($LASTEXITCODE -ne 0) {
        Write-Log "Failed to stage changes" "Error"
        return $false
    }

    # Create commit message with timestamp
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $commitMessage = "Auto-commit: $timestamp - $changeCount file(s) changed"

    # Add file details to commit message
    $fileList = $changeLines | ForEach-Object {
        $status = $_.Substring(0, 2).Trim()
        $file = $_.Substring(3)
        switch ($status) {
            "M" { "  Modified: $file" }
            "A" { "  Added: $file" }
            "D" { "  Deleted: $file" }
            "?" { "  New: $file" }
            default { "  Changed: $file" }
        }
    }

    $fullMessage = @"
$commitMessage

Files:
$($fileList -join "`n")

[DevCal Auto-Commit]
"@

    # Commit changes
    git commit -m $fullMessage 2>&1

    if ($LASTEXITCODE -eq 0) {
        Write-Log "Committed $changeCount file(s)" "Success"

        # Show committed files
        foreach ($line in $changeLines) {
            Write-Host "  $line" -ForegroundColor DarkGray
        }

        return $true
    }
    else {
        Write-Log "Commit failed" "Error"
        return $false
    }
}

function Get-CommitStats {
    # Get recent commit count for today
    $today = Get-Date -Format "yyyy-MM-dd"
    $commits = git log --since="$today 00:00:00" --oneline 2>&1

    if ($commits -is [array]) {
        return $commits.Count
    }
    elseif ([string]::IsNullOrWhiteSpace($commits)) {
        return 0
    }
    else {
        return 1
    }
}

function Show-Status {
    $branch = Get-CurrentBranch
    $todayCommits = Get-CommitStats
    $changes = Get-ChangedFiles
    $pendingChanges = if ([string]::IsNullOrWhiteSpace($changes)) { 0 } else { ($changes -split "`n" | Where-Object { $_ -ne "" }).Count }

    Write-Host "`n--- STATUS ---" -ForegroundColor Cyan
    Write-Host "Branch:          $branch" -ForegroundColor White
    Write-Host "Today's commits: $todayCommits" -ForegroundColor Green
    Write-Host "Pending changes: $pendingChanges" -ForegroundColor $(if ($pendingChanges -gt 0) { "Yellow" } else { "Green" })
    Write-Host "--------------`n" -ForegroundColor Cyan
}

# ============================================
# MAIN SCRIPT
# ============================================

# Show banner
Show-Banner

# Check if we're in a git repository
if (-not (Test-GitRepository)) {
    Write-Log "Not in a git repository! Please run this script from your project folder." "Error"
    Write-Host "`nTo initialize a git repository, run:" -ForegroundColor Yellow
    Write-Host "  git init" -ForegroundColor White
    exit 1
}

Write-Log "Git repository detected" "Success"

# Create/switch to pending branch
if (-not (New-PendingBranch)) {
    Write-Log "Failed to setup pending branch" "Error"
    exit 1
}

# Switch to pending branch
if (-not (Switch-ToBranch $BRANCH_NAME)) {
    Write-Log "Failed to switch to $BRANCH_NAME branch" "Error"
    exit 1
}

Write-Log "Now on branch: $BRANCH_NAME" "Success"

# Show initial status
Show-Status

# Main loop
$commitCount = 0
$startTime = Get-Date

Write-Log "Starting auto-commit loop (every $COMMIT_INTERVAL seconds)" "Info"
Write-Host "`nWatching for changes... (Press Ctrl+C to stop)`n" -ForegroundColor Yellow

try {
    while ($true) {
        # Show heartbeat
        $elapsed = [math]::Round(((Get-Date) - $startTime).TotalMinutes, 1)
        Write-Host "[$([datetime]::Now.ToString('HH:mm:ss'))] Checking for changes... (Running: ${elapsed}m, Commits: $commitCount)" -ForegroundColor DarkGray

        # Attempt commit
        if (Invoke-AutoCommit) {
            $commitCount++
        }

        # Wait for next cycle
        Start-Sleep -Seconds $COMMIT_INTERVAL
    }
}
catch {
    Write-Log "Error: $_" "Error"
}
finally {
    # Cleanup on exit
    Write-Host "`n" -NoNewline
    Write-Log "Auto-commit stopped" "Warning"
    Write-Host "`n--- SESSION SUMMARY ---" -ForegroundColor Cyan
    Write-Host "Total commits: $commitCount" -ForegroundColor Green
    Write-Host "Duration: $([math]::Round(((Get-Date) - $startTime).TotalMinutes, 1)) minutes" -ForegroundColor White
    Write-Host "Log file: $LOG_FILE" -ForegroundColor White
    Write-Host "-----------------------`n" -ForegroundColor Cyan
}
