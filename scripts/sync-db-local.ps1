# sync-db-local.ps1
# This script downloads the latest MongoDB backup from GitHub Actions and restores it locally.
# Prerequisites: GitHub CLI (gh) installed and authenticated, mongorestore installed locally.

# Find gh executable
$ghPath = "gh"
if (-not (Get-Command "gh" -ErrorAction SilentlyContinue)) {
    $defaultGhPath = "C:\Program Files\GitHub CLI\gh.exe"
    if (Test-Path $defaultGhPath) {
        $ghPath = "& '$defaultGhPath'"
    } else {
        Write-Error "GitHub CLI (gh) not found in PATH or at $defaultGhPath. Please install it and restart your terminal."
        exit 1
    }
}

# 1. Get the latest successful run ID of the "MongoDB Atlas Backup" workflow
$runId = Invoke-Expression "$ghPath run list --workflow 'mongodb-backup.yml' --status success --limit 1 --json databaseId --jq '.[0].databaseId'"

if (-not $runId) {
    Write-Error "No successful backup runs found."
    exit 1
}

Write-Host "Found latest successful backup run: $runId"

# 2. Download the artifact
Write-Host "Downloading artifact..."
Invoke-Expression "$ghPath run download $runId --name 'mongodb-atlas-dump' --dir './tmp_backup'"

if (-not (Test-Path "./tmp_backup")) {
    Write-Error "Failed to download artifact."
    exit 1
}

# 3. Unzip the backup
Write-Host "Unzipping backup..."
$zipFile = Get-ChildItem "./tmp_backup/*.zip" | Select-Object -First 1
if (-not $zipFile) {
    Write-Error "No zip file found in artifact."
    exit 1
}

# Expand-Archive requires the destination to not exist or use -Force
if (Test-Path "./tmp_backup/extracted") { Remove-Item "./tmp_backup/extracted" -Recurse }
Expand-Archive -Path $zipFile.FullName -DestinationPath "./tmp_backup/extracted"

# 4. Restore to local MongoDB
Write-Host "Restoring to local MongoDB..."
# Find the dump directory (it might be nested)
$dumpDir = Get-ChildItem "./tmp_backup/extracted" -Filter "dump" -Recurse | Where-Object { $_.PSIsContainer } | Select-Object -First 1
if (-not $dumpDir) {
    # If "dump" folder not found, look for any folder that might be the DB folder
    $dumpDir = Get-ChildItem "./tmp_backup/extracted/*" -Exclude "*.zip" | Where-Object { $_.PSIsContainer } | Select-Object -First 1
}

if (-not $dumpDir) {
    Write-Error "Could not find dump directory in extracted files."
    exit 1
}

# Find mongorestore executable
$restorePath = "mongorestore"
if (-not (Get-Command "mongorestore" -ErrorAction SilentlyContinue)) {
    $defaultRestorePath = "C:\Program Files\MongoDB\Tools\100\bin\mongorestore.exe"
    if (Test-Path $defaultRestorePath) {
        $restorePath = "& '$defaultRestorePath'"
    } else {
        Write-Host "---" -ForegroundColor Red
        Write-Host "ERROR: 'mongorestore' not found!" -ForegroundColor Red
        Write-Host "Please download and install MongoDB Database Tools from:" -ForegroundColor Yellow
        Write-Host "https://www.mongodb.com/try/download/database-tools" -ForegroundColor Yellow
        Write-Host "---"
        Write-Host "NOTE: I've kept your backup files in './tmp_backup'. Once installed, you can try again."
        exit 1
    }
}

Write-Host "Restoring from: $($dumpDir.FullName)"
Invoke-Expression "$restorePath --drop '$($dumpDir.FullName)'"

# Check if restore was successful
if ($LASTEXITCODE -ne 0) {
    Write-Error "mongorestore failed with exit code $LASTEXITCODE. Backup files are kept in './tmp_backup' for inspection."
    exit 1
}

# 5. Cleanup
Write-Host "Cleaning up project folder..."
Remove-Item "./tmp_backup" -Recurse -ErrorAction SilentlyContinue

Write-Host "Local sync complete!"
