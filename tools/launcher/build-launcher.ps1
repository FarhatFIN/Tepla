param(
  [string]$OutputPath = (Join-Path $PSScriptRoot "dist\TeplaLauncher.exe")
)

$ErrorActionPreference = "Stop"
$source = Join-Path $PSScriptRoot "native\TeplaLauncher.cs"
$dist = Split-Path -Parent $OutputPath
$csc = Join-Path $env:WINDIR "Microsoft.NET\Framework64\v4.0.30319\csc.exe"
if (-not (Test-Path $csc)) { $csc = Join-Path $env:WINDIR "Microsoft.NET\Framework\v4.0.30319\csc.exe" }
if (-not (Test-Path $csc)) { throw "C# compiler not found. Install .NET Framework developer tools or .NET SDK." }
New-Item -ItemType Directory -Force -Path $dist | Out-Null
& $csc /nologo /target:winexe /platform:x64 /optimize+ /out:$OutputPath /reference:System.dll /reference:System.Core.dll /reference:System.Drawing.dll /reference:System.Windows.Forms.dll $source
if ($LASTEXITCODE -ne 0) { throw "Tepla Launcher compilation failed." }
Write-Host "Tepla launcher built at: $OutputPath"