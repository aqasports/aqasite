# deploy-watcher.ps1
# Watches for deploy.trigger file in the project folder and runs auto_git.py when changed

$projectPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$pythonExe = 'C:\Users\dell\AppData\Local\Programs\Python\Python313\python.exe'

Write-Host "Watching for deploy.trigger in: $projectPath"
Write-Host "Using Python: $pythonExe"

$fsw = New-Object System.IO.FileSystemWatcher $projectPath, 'deploy.trigger'
$fsw.EnableRaisingEvents = $true
$action = {
    param($source, $eventArgs)
    Start-Sleep -Milliseconds 250
    Write-Host "[$(Get-Date -Format o)] Trigger detected: $($eventArgs.FullPath)"
    try {
        Push-Location $projectPath
        Write-Host "Running: $pythonExe auto_git.py"
        & $pythonExe auto_git.py 2>&1
        Write-Host "auto_git finished with exit code: $LASTEXITCODE"
        Pop-Location
    } catch {
        Write-Host "Error running auto_git.py: $_"
    }
}

Register-ObjectEvent -InputObject $fsw -EventName Changed -Action $action -SourceIdentifier DeployTriggerChanged | Out-Null
Register-ObjectEvent -InputObject $fsw -EventName Created -Action $action -SourceIdentifier DeployTriggerCreated | Out-Null

Write-Host "Press Ctrl+C to stop watcher."
while ($true) { Start-Sleep -Seconds 1 }
