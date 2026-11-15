<#
  Lanza el MCP de dataimpulse-mcp apuntando a un proxy Webshare concreto.

  Uso:
    powershell -NoProfile -ExecutionPolicy Bypass -File run-webshare-mcp.ps1 WS_HOST_UK WS_PORT_UK

  Carga ~/.api-keys.ps1 (que define WS_USER/WS_PASS/WS_HOST_*/WS_PORT_*),
  pero neutraliza `setx` para que no escriba en el registro en cada arranque
  (mucho mas rapido) y silencia cualquier salida para no contaminar el
  protocolo stdio de MCP.
#>
param(
  [Parameter(Mandatory = $true)][string]$HostVar,
  [Parameter(Mandatory = $true)][string]$PortVar
)

# No-op: evita que Set-ApiKey haga setx (lento y persistente) en cada arranque.
function setx { }

. "$HOME\.api-keys.ps1" *> $null

$env:DI_USER = $env:WS_USER
$env:DI_PASS = $env:WS_PASS
$env:DI_PROXY_HOST = [Environment]::GetEnvironmentVariable($HostVar)
$env:DI_PROXY_PORT = [Environment]::GetEnvironmentVariable($PortVar)

if (-not $env:DI_USER -or -not $env:DI_PASS) {
  [Console]::Error.WriteLine("webshare-mcp: WS_USER/WS_PASS no definidos en ~/.api-keys.ps1")
  exit 1
}
if (-not $env:DI_PROXY_HOST -or -not $env:DI_PROXY_PORT) {
  [Console]::Error.WriteLine("webshare-mcp: $HostVar/$PortVar no definidos en ~/.api-keys.ps1")
  exit 1
}

& node "C:\Users\Administrator\workspace\dataimpulse-mcp\index.js"
