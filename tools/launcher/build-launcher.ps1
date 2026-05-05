param(
  [string]$OutputPath = (Join-Path $PSScriptRoot "dist\\TeplaLauncher.exe")
)

$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\\..")
$htaPath = Join-Path $PSScriptRoot "TeplaLauncher.hta"
$scriptPath = Join-Path $repoRoot "scripts\\dev\\tepla-dev.ps1"
$nodeScriptPath = Join-Path $repoRoot "scripts\\dev\\tepla-dev.mjs"
$shScriptPath = Join-Path $repoRoot "scripts\\dev\\tepla-dev.sh"
$manifestPath = Join-Path $repoRoot "scripts\\dev\\core-stack.json"
$distDir = Split-Path -Parent $OutputPath
$sedPath = Join-Path $PSScriptRoot "TeplaLauncher.sed"

New-Item -ItemType Directory -Path $distDir -Force | Out-Null

$escapedOutput = $OutputPath.Replace("\", "\\")
# IExpress requires FILE entries to be listed under a single source group. Use launcher dir for the HTA,
# and copy support files next to it before packaging.
Copy-Item $scriptPath (Join-Path $PSScriptRoot (Split-Path $scriptPath -Leaf)) -Force
Copy-Item $nodeScriptPath (Join-Path $PSScriptRoot (Split-Path $nodeScriptPath -Leaf)) -Force
Copy-Item $shScriptPath (Join-Path $PSScriptRoot (Split-Path $shScriptPath -Leaf)) -Force
Copy-Item $manifestPath (Join-Path $PSScriptRoot (Split-Path $manifestPath -Leaf)) -Force

$sed = @"
[Version]
Class=IEXPRESS
SEDVersion=3
[Options]
PackagePurpose=InstallApp
ShowInstallProgramWindow=1
HideExtractAnimation=1
UseLongFileName=1
InsideCompressed=0
CAB_FixedSize=0
CAB_ResvCodeSigning=0
RebootMode=N
InstallPrompt=
DisplayLicense=
FinishMessage=
TargetName=$escapedOutput
FriendlyName=Tepla Launcher
AppLaunched=mshta.exe TeplaLauncher.hta
PostInstallCmd=<None>
AdminQuietInstCmd=
UserQuietInstCmd=
SourceFiles=SourceFiles
[SourceFiles]
SourceFiles0=$PSScriptRoot
[SourceFiles0]
%FILE0%=
%FILE1%=
%FILE2%=
%FILE3%=
%FILE4%=
[Strings]
FILE0=TeplaLauncher.hta
FILE1=tepla-dev.ps1
FILE2=tepla-dev.mjs
FILE3=tepla-dev.sh
FILE4=core-stack.json
"@

Set-Content -Path $sedPath -Value $sed -Encoding ASCII

& "$env:SystemRoot\System32\iexpress.exe" /N $sedPath | Out-Null

Remove-Item (Join-Path $PSScriptRoot "tepla-dev.ps1") -Force -ErrorAction SilentlyContinue
Remove-Item (Join-Path $PSScriptRoot "tepla-dev.mjs") -Force -ErrorAction SilentlyContinue
Remove-Item (Join-Path $PSScriptRoot "tepla-dev.sh") -Force -ErrorAction SilentlyContinue
Remove-Item (Join-Path $PSScriptRoot "core-stack.json") -Force -ErrorAction SilentlyContinue
Remove-Item $sedPath -Force -ErrorAction SilentlyContinue

Write-Host "Tepla launcher built at: $OutputPath"
