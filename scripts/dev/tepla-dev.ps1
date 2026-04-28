param(
  [ValidateSet("StartInfra", "StopInfra", "StartCore", "StartClient", "StartAll", "StopAll", "RunService", "OpenApp", "OpenHealth", "SelectRepo", "StartBot", "StartService", "StopService", "GetStatus")]
  [string]$Action = "StartAll",
  [string]$RepoRoot,
  [string]$ServiceId
)

$ErrorActionPreference = "Stop"

function Get-LauncherStatePath {
  $dir = Join-Path $env:TEMP "TeplaLauncher"
  if (-not (Test-Path $dir)) {
    New-Item -ItemType Directory -Path $dir -Force | Out-Null
  }

  return Join-Path $dir "state.json"
}

function Get-ScriptRootPath {
  return Split-Path -Parent $PSCommandPath
}

function Get-Manifest {
  $manifestPath = Join-Path (Get-ScriptRootPath) "core-stack.json"
  return Get-Content -Raw $manifestPath | ConvertFrom-Json
}

function Test-RepoRoot([string]$Path) {
  if (-not $Path) {
    return $false
  }

  $manifest = Get-Manifest
  foreach ($marker in $manifest.repoMarkers) {
    if (-not (Test-Path (Join-Path $Path $marker))) {
      return $false
    }
  }

  return $true
}

function Read-State {
  $statePath = Get-LauncherStatePath
  if (-not (Test-Path $statePath)) {
    return [pscustomobject]@{
      repoRoot = $null
      processes = @{}
    }
  }

  return Get-Content -Raw $statePath | ConvertFrom-Json
}

function Write-State([object]$State) {
  $statePath = Get-LauncherStatePath
  $State | ConvertTo-Json -Depth 8 | Set-Content -Path $statePath -Encoding UTF8
}

function Select-RepoRoot {
  Add-Type -AssemblyName System.Windows.Forms
  $dialog = New-Object System.Windows.Forms.FolderBrowserDialog
  $dialog.Description = "Select your Tepla repository root"
  $dialog.UseDescriptionForTitle = $true
  $dialog.ShowNewFolderButton = $false

  if ($dialog.ShowDialog() -ne [System.Windows.Forms.DialogResult]::OK) {
    throw "Tepla repository root was not selected."
  }

  if (-not (Test-RepoRoot $dialog.SelectedPath)) {
    throw "The selected folder is not a Tepla repository root."
  }

  return $dialog.SelectedPath
}

function Resolve-RepoRootNoPrompt {
  if (Test-RepoRoot $RepoRoot) {
    return (Resolve-Path $RepoRoot).Path
  }

  $state = Read-State
  if (Test-RepoRoot $state.repoRoot) {
    return (Resolve-Path $state.repoRoot).Path
  }

  $candidate = Resolve-Path (Join-Path (Get-ScriptRootPath) "..\..")
  if (Test-RepoRoot $candidate.Path) {
    return $candidate.Path
  }

  return $null
}

function Get-Status {
  $state = Read-State
  $repo = Resolve-RepoRootNoPrompt
  $manifest = Get-Manifest
  $services = @()

  foreach ($service in $manifest.services) {
    $pidValue = $null
    if ($state.processes -and $state.processes.PSObject.Properties[$service.id]) {
      $pidValue = [int]$state.processes.PSObject.Properties[$service.id].Value
    }

    $running = $false
    if ($pidValue) {
      $running = [bool](Get-Process -Id $pidValue -ErrorAction SilentlyContinue)
    }

    $port = $null
    if ($service.env -and $service.env.PSObject.Properties['PORT']) {
      $port = [string]$service.env.PSObject.Properties['PORT'].Value
    }

    $services += [pscustomobject]@{
      id = $service.id
      name = $service.name
      command = $service.command
      port = $port
      running = $running
      pid = $(if ($running) { $pidValue } else { $null })
    }
  }

  [pscustomobject]@{
    repoRoot = $repo
    clientUrl = $manifest.clientUrl
    gatewayHealthUrl = $manifest.gatewayHealthUrl
    services = $services
  } | ConvertTo-Json -Depth 8
}

function Resolve-RepoRoot {
  if (Test-RepoRoot $RepoRoot) {
    return (Resolve-Path $RepoRoot).Path
  }

  $state = Read-State
  if (Test-RepoRoot $state.repoRoot) {
    return (Resolve-Path $state.repoRoot).Path
  }

  $scriptCandidate = Resolve-Path (Join-Path (Get-ScriptRootPath) "..\..")
  if (Test-RepoRoot $scriptCandidate.Path) {
    return $scriptCandidate.Path
  }

  $selected = Select-RepoRoot
  $state.repoRoot = $selected
  Write-State $state
  return $selected
}

function Save-RepoRoot([string]$Path) {
  $state = Read-State
  $state.repoRoot = $Path
  if (-not $state.processes) {
    $state | Add-Member -MemberType NoteProperty -Name processes -Value @{}
  }
  Write-State $state
}

function Get-ServiceById([string]$Id) {
  $manifest = Get-Manifest
  foreach ($service in $manifest.services) {
    if ($service.id -eq $Id) {
      return $service
    }
  }

  throw "Unknown service id: $Id"
}

function Get-SharedEnv {
  $manifest = Get-Manifest
  $envMap = @{}

  $manifest.sharedEnv.PSObject.Properties | ForEach-Object {
    $envMap[$_.Name] = [string]$_.Value
  }

  return $envMap
}

function Start-ManagedService([string]$Repo, [object]$Service) {
  $scriptPath = $PSCommandPath
  $quotedRepo = $Repo.Replace("'", "''")
  $quotedServiceId = $Service.id.Replace("'", "''")
  $windowTitle = "Tepla - {0}" -f $Service.name.Replace("'", "''")

  $command = @(
    "`$host.UI.RawUI.WindowTitle = '$windowTitle'"
    "& '$scriptPath' -Action RunService -RepoRoot '$quotedRepo' -ServiceId '$quotedServiceId'"
  ) -join "; "

  $process = Start-Process -FilePath "powershell.exe" -ArgumentList @(
    "-NoExit",
    "-ExecutionPolicy",
    "Bypass",
    "-Command",
    $command
  ) -WorkingDirectory $Repo -PassThru

  $state = Read-State
  if (-not $state.processes) {
    $state | Add-Member -MemberType NoteProperty -Name processes -Value @{}
  }

  $currentProcesses = @{}
  $state.processes.PSObject.Properties | ForEach-Object {
    $currentProcesses[$_.Name] = $_.Value
  }

  $currentProcesses[$Service.id] = $process.Id
  $state.processes = [pscustomobject]$currentProcesses
  $state.repoRoot = $Repo
  Write-State $state
}

function Start-Infra([string]$Repo) {
  $manifest = Get-Manifest
  $composeArgs = @()
  foreach ($composeFile in $manifest.infra.composeFiles) {
    $composeArgs += "-f `"$composeFile`""
  }

  $composeCommand = "docker compose {0} up -d" -f ($composeArgs -join " ")
  Start-Process -FilePath "powershell.exe" -ArgumentList @(
    "-NoExit",
    "-ExecutionPolicy",
    "Bypass",
    "-Command",
    "`$host.UI.RawUI.WindowTitle = 'Tepla - Infra'; Set-Location '$($Repo.Replace("'", "''"))'; $composeCommand"
  ) -WorkingDirectory $Repo | Out-Null
}

function Stop-Infra([string]$Repo) {
  $manifest = Get-Manifest
  $composeArgs = @()
  foreach ($composeFile in $manifest.infra.composeFiles) {
    $composeArgs += "-f `"$composeFile`""
  }

  $composeCommand = "docker compose {0} down" -f ($composeArgs -join " ")
  & powershell.exe -ExecutionPolicy Bypass -Command "Set-Location '$($Repo.Replace("'", "''"))'; $composeCommand"
}

function Stop-ManagedService([string]$Id) {
  $state = Read-State
  if (-not $state.processes -or -not $state.processes.PSObject.Properties[$Id]) {
    return
  }

  $pidValue = [int]$state.processes.PSObject.Properties[$Id].Value
  try { Stop-Process -Id $pidValue -Force -ErrorAction Stop } catch {}

  $currentProcesses = @{}
  $state.processes.PSObject.Properties | ForEach-Object {
    if ($_.Name -ne $Id) { $currentProcesses[$_.Name] = $_.Value }
  }
  $state.processes = [pscustomobject]$currentProcesses
  Write-State $state
}

function Stop-ManagedServices {
  $state = Read-State
  if (-not $state.processes) {
    return
  }

  foreach ($processInfo in $state.processes.PSObject.Properties) {
    $pid = [int]$processInfo.Value
    try {
      Stop-Process -Id $pid -Force -ErrorAction Stop
    } catch {
    }
  }

  $state.processes = [pscustomobject]@{}
  Write-State $state
}

function Run-Service([string]$Repo, [string]$Id) {
  $service = Get-ServiceById $Id
  $envMap = Get-SharedEnv
  $service.env.PSObject.Properties | ForEach-Object {
    $envMap[$_.Name] = [string]$_.Value
  }

  foreach ($key in $envMap.Keys) {
    [System.Environment]::SetEnvironmentVariable($key, $envMap[$key], "Process")
  }

  Set-Location (Join-Path $Repo $service.workdir)
  Invoke-Expression $service.command
}

function Start-Core([string]$Repo) {
  foreach ($serviceId in @("gateway", "auth-user", "messaging", "media", "realtime")) {
    Start-ManagedService -Repo $Repo -Service (Get-ServiceById $serviceId)
  }
}

function Start-Client([string]$Repo) {
  Start-ManagedService -Repo $Repo -Service (Get-ServiceById "client")
}

function Start-Bot([string]$Repo) {
  Start-ManagedService -Repo $Repo -Service (Get-ServiceById "bot-platform")
}

function Open-Url([string]$Url) {
  Start-Process $Url | Out-Null
}

if ($Action -eq "GetStatus") { Get-Status; exit 0 }

if ($Action -eq "SelectRepo") {
  $resolvedRepo = Select-RepoRoot
} else {
  $resolvedRepo = Resolve-RepoRoot
}
Save-RepoRoot $resolvedRepo

switch ($Action) {
  "SelectRepo" {
    Write-Host "Tepla repository root set to: $resolvedRepo"
  }
  "StartInfra" {
    Start-Infra -Repo $resolvedRepo
  }
  "StopInfra" {
    Stop-Infra -Repo $resolvedRepo
  }
  "StartCore" {
    Start-Core -Repo $resolvedRepo
  }
  "StartClient" {
    Start-Client -Repo $resolvedRepo
  }
  "StartBot" {
    Start-Bot -Repo $resolvedRepo
  }
  "StartService" {
    Start-ManagedService -Repo $resolvedRepo -Service (Get-ServiceById $ServiceId)
  }
  "StopService" {
    Stop-ManagedService -Id $ServiceId
  }
  "StartAll" {
    Start-Infra -Repo $resolvedRepo
    Start-Core -Repo $resolvedRepo
    Start-Client -Repo $resolvedRepo
  }
  "StopAll" {
    Stop-ManagedServices
    Stop-Infra -Repo $resolvedRepo
  }
  "RunService" {
    Run-Service -Repo $resolvedRepo -Id $ServiceId
  }
  "OpenApp" {
    Open-Url -Url (Get-Manifest).clientUrl
  }
  "OpenHealth" {
    Open-Url -Url (Get-Manifest).gatewayHealthUrl
  }
}
