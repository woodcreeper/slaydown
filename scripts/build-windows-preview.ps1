$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$stage = Join-Path $root 'build/quicklook-sdk'
New-Item -ItemType Directory -Force $stage | Out-Null
$archive = Join-Path $stage 'QuickLook-4.5.0.zip'
if (!(Test-Path $archive)) { Invoke-WebRequest 'https://github.com/QL-Win/QuickLook/releases/download/4.5.0/QuickLook-4.5.0.zip' -OutFile $archive }
if ((Get-FileHash $archive -Algorithm SHA256).Hash.ToLower() -ne '852d8bcccd984e416fc8491ccedb848f0c3472e930ee0d292188b2ea3df524e0') { throw 'QuickLook SDK checksum mismatch' }
Expand-Archive $archive -DestinationPath "$stage/sdk" -Force
$dll = Get-ChildItem "$stage/sdk" -Filter QuickLook.Common.dll -Recurse | Select-Object -First 1
if (!$dll) { throw 'QuickLook SDK DLL missing' }
$out = Join-Path $root 'build/SlayDown-QuickLook'
dotnet build "$root/preview/windows/QuickLook.Plugin.SlayDown.csproj" -c Release "-p:QuickLookPath=$($dll.DirectoryName)" -o $out
if ($LASTEXITCODE -ne 0) { throw 'QuickLook plugin compilation failed' }
Copy-Item "$root/preview/LICENSE" "$out/LICENSE"
Copy-Item "$root/preview/README.md" "$out/README.md"
New-Item -ItemType Directory -Force "$root/release-assets" | Out-Null
$zip = "$root/build/SlayDown-QuickLook.zip"
Compress-Archive "$out/*" -DestinationPath $zip -Force
Copy-Item $zip "$root/release-assets/SlayDown-QuickLook.qlplugin" -Force
