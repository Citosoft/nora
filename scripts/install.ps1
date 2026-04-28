$ErrorActionPreference = 'Stop'

$releaseRepository = 'Citosoft/nora'
$installerName = 'NoraSetup.exe'
$installerUrl = "https://github.com/$releaseRepository/releases/latest/download/$installerName"
$tempDirectory = Join-Path ([System.IO.Path]::GetTempPath()) ("nora-install-" + [System.Guid]::NewGuid().ToString('N'))
$installerPath = Join-Path $tempDirectory $installerName

function Test-Windows {
  return [System.Runtime.InteropServices.RuntimeInformation]::IsOSPlatform(
    [System.Runtime.InteropServices.OSPlatform]::Windows
  )
}

if (-not (Test-Windows)) {
  throw 'This installer only supports Windows.'
}

New-Item -ItemType Directory -Path $tempDirectory | Out-Null

try {
  Write-Host 'Downloading Nora installer...'
  Invoke-WebRequest -Uri $installerUrl -OutFile $installerPath

  Write-Host 'Running Nora installer...'
  $process = Start-Process -FilePath $installerPath -ArgumentList '/S' -Wait -PassThru
  if ($process.ExitCode -ne 0) {
    throw "Installer failed with exit code $($process.ExitCode)."
  }

  Write-Host 'Nora is installed.'
} finally {
  Remove-Item -LiteralPath $tempDirectory -Recurse -Force -ErrorAction SilentlyContinue
}
