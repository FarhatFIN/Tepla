param(
  [string]$OutputPath = (Join-Path $PSScriptRoot "dist\TeplaLauncher.exe")
)

$ErrorActionPreference = "Stop"

$sourcePath = Join-Path $PSScriptRoot "TeplaLauncher.cs"
$distDir = Split-Path -Parent $OutputPath
$cscPath = Join-Path $env:SystemRoot "Microsoft.NET\Framework64\v4.0.30319\csc.exe"

if (-not (Test-Path $cscPath)) {
  $cscPath = Join-Path $env:SystemRoot "Microsoft.NET\Framework\v4.0.30319\csc.exe"
}

if (-not (Test-Path $cscPath)) {
  throw "csc.exe was not found. Install .NET Framework build tools or use the cross-platform launcher: node scripts/dev/tepla-dev.mjs start"
}

New-Item -ItemType Directory -Path $distDir -Force | Out-Null

& $cscPath `
  /nologo `
  /target:winexe `
  /platform:anycpu `
  /optimize+ `
  /reference:System.dll `
  /reference:System.Drawing.dll `
  /reference:System.Windows.Forms.dll `
  /out:$OutputPath `
  $sourcePath

Write-Host "Tepla launcher built at: $OutputPath"
