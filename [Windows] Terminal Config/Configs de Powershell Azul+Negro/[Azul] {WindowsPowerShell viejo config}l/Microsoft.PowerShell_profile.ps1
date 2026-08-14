# ═══════════════════════════════════════════════════════════
# PERFIL WINDOWS POWERSHELL (viejo - Windows PowerShell 5.1)
# ═══════════════════════════════════════════════════════════

# 1. Idioma / encoding
$env:LC_ALL = 'C.UTF-8'
$env:LANG = 'C.UTF-8'

# 2. Oh My Posh (tema dracula)
$ompTheme = "C:\Program Files\WindowsApps\ohmyposh.cli_30.6.2.0_x64__96v55e8n804z4\themes\dracula.omp.json"
if (Test-Path $ompTheme) {
    oh-my-posh init pwsh --config $ompTheme | Invoke-Expression
}

# 3. Módulos (Windows PowerShell 5.1 - verificar instalados)
Import-Module PSReadLine
Import-Module Terminal-Icons
Import-Module PSFzf

# 4. PSReadLine: predicciones y menú
Set-PSReadLineOption -PredictionSource HistoryAndPlugin
Set-PSReadLineOption -PredictionViewStyle InlineView
Set-PSReadLineOption -HistorySearchCursorMovesToEnd:$true
Set-PSReadLineKeyHandler -Key Tab -ScriptBlock {
    [Microsoft.PowerShell.PSConsoleReadLine]::MenuComplete($null)
}

# 5. Alias
Set-Alias ls-a Get-ChildItem -Force

# 6. PSFzf: Ctrl+r historial, Ctrl+t archivos
Set-PsFzfOption -PSReadLineChordProvider 'Ctrl+t' -PSReadLineChordReverseHistory 'Ctrl+r'

# 7. Cargar API keys (.api-keys.sh) en la sesión.
# Seguro: ignora las líneas que referencian otras vars (ej. OCO_API_KEY="$OPEN_ROUTER_API_KEY")
# para no pisar el valor real que ya viene persistido en el entorno (User).
if (Test-Path "$env:USERPROFILE\.api-keys.sh") {
    Get-Content "$env:USERPROFILE\.api-keys.sh" | ForEach-Object {
        if ($_ -match '^export ([A-Z_0-9]+)="([^"]+)"' -and $matches[2] -notmatch '\$') {
            Set-Item -Path "Env:$($matches[1])" -Value $matches[2] -ErrorAction SilentlyContinue
        }
    }
}

# Ejecuta con dot-sourcing - CARGAR API keys (setx -> permanentes) en la sesion actual.
. .\.api-keys.ps1