# -----------------------------------------------------------
# 🔹RESUMEN DE MAPEOS... DE POWERSHELL:🔹
# -----------------------------------------------------------
#🔹 PSReadLine (predicciones y navegación)🔹

# F2 → Alterna entre ListView (lista) e InlineView (texto fantasma gris).

# Tab → MenuComplete → muestra un menú con opciones de comandos/carpetas/ejecutables.

# Ctrl+Space → (igual que Tab, si lo tienes mapeado) menú de completado.

# ↑ / ↓ → Historial normal de comandos.

# Ctrl+r (sin PSFzf) → búsqueda incremental de historial.

#🔹 PSFzf (historial + búsqueda con fzf)🔹

# Ctrl+r → Historial con fzf interactivo (mucho más potente que el de PSReadLine).

# Ctrl+t → Selector fzf de archivos/carpetas para autocompletar en la línea.

#🔹 Zoxide🔹

# cd <palabra> → salta rápido a carpetas visitadas (aprende de tu historial).

# z <palabra> → lo mismo que arriba (alias corto).

#🔹 Alias personalizados🔹

# ls-a → Get-ChildItem -Force (lista archivos ocultos, tipo ls -a).

#npm → apunta a npm.cmd (evita que salga el .cmd feo en autocompletado).

# -----------------------------------------------------------
# 🔹INSTALACION DE MODULOS🔹
# -----------------------------------------------------------

# 0. Instalacion previa de modulos.

#📌 IMPORTANTE: Los comandos de instalación (Install-Module)

# no deben estar en este archivo. Solo se ejecutan una vez.
# Instalaciones nuevas:
# Install-Module -Name ZLocation -Force
# Install-Module -Name CompletionPredictor -Force
# winget install ajeetdsouza.zoxide
# winget install --id GitHub.cli -e --source winget # instalar github gh cli
# winget install --id Microsoft.PowerToys -e --scope machine
# winget install fzf
# winget install junegunn.fzf
# Install-Module -Name PSFzf -Force
# gh extension install meiji163/gh-notify
# gh ext install meiji163/gh-notify
# scoop install fd
# scoop install ripgrep
# iwr -useb get.scoop.sh | iex

# 	DESINSTALA E INSTALA nodejs:
# scoop uninstall nodejs-lts
# scoop install nodejs-lts
# npm install -g neovim
# $env:PATH += ";C:\Users\Diego\scoop\shims"
# t
#                  [tu usuario]

#	 INSTALA python-pi:
# pip install pynvim
# pip install 'python-lsp-server[all]'

#📌 Otras instalaciones para NVIM dizzigentleman:

# 	INSTALA CHOCHO y luego mingw:
#Set-ExecutionPolicy Bypass -Scope Process -Force
#[System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
#iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
#choco install mingw

# LUEGO ABRE NVIM. Ejecuta: Lazy sync, luego: Mason [con 2 puntos :] .. y por ultimo:
# :MasonInstall --force prettier markdownlint-cli2 markdown-toc vtsls

# :MasonInstall --force angular-language-server lua-language-server marksman eslint-lsp eslint_d emmylua_ls markdown

# -----------------------------------------------------------
# 🔹ARCHIVO DE PERFIL DE POWERSHELL🔹
# -----------------------------------------------------------

# 1. Configuración de idioma
$env:PSCORE_ICU_INVARIANT = 1
$env:LC_ALL = 'C.UTF-8'
$env:LANG = 'C.UTF-8'

# 2. Inicialización de Oh My Posh
# La ruta puede variar, usa la correcta
#& 'C:\Users\Diego\AppData\Local\oh-my-posh\init.1485567614143659716.ps1'
$env:POSH_SESSION_ID = "0dc46671-78eb-4a28-9e0d-53c78ecf680c"; & 'C:\Users\Diego\AppData\Local\oh-my-posh\init.1485567614143659716.ps1'

# 3. 📌 Importación de módulos esenciales

Import-Module PSReadLine
Import-Module Terminal-Icons
Import-Module CompletionPredictor
Import-Module PSFzf
# Importar winwal [Pywal, para poder usarlo en WT, nvim wallwaper]
Import-Module ~\Documents\winwal\winwal.psm1 -DisableNameChecking
Import-Module ~\Documents\winwal\WalManager.psm1 -DisableNameChecking
# Luego ZLocation - para evitar sobreescribir el prompt suggestion.
Import-Module ZLocation

# PSScriptAnalyzer no necesita ser importado en el perfil.

# Autocompletado y autocorrección
Set-PSReadLineOption -PredictionSource HistoryAndPlugin
#Set-PSReadLineOption -PredictionViewStyle ListView
# ¿Prefieras todo en una sola linea fantasma gris y no una lista? descomenta Inline y comenta Listview.
Set-PSReadLineOption -PredictionViewStyle InlineView
Set-PSReadLineOption -HistorySearchCursorMovesToEnd:$true

# 🐔✍📌¡¡TRUCAZO!! En vez de remapear List view como Inline y perder la lista
# Simplemente presiona F2 para alternar de modo segun convenga!

# 4. Alias de ls
# Alias para que 'ls' muestre todo como ls -a
Set-Alias ls-a Get-ChildItem -Force

# 5. Arrancar zoxide para mejorar sugerencias con z.. z = cd
Invoke-Expression (& { (zoxide init powershell --cmd cd | Out-String) })

# 6. PSReadLine MenuComplete (Ctrl+Space)

# Esto hace que Tab abra el menú de comandos y ejecutables
Set-PSReadLineKeyHandler -Key Tab -ScriptBlock {
  [Microsoft.PowerShell.PSConsoleReadLine]::MenuComplete($null)
}


# 7. Alias para npm
# Alias para evitar que npm.cmd se autocomplete en MenuComplete
# SOLUCION *esto pasaba porque .cmd era la unica opcion aparte de npm al ejecutar Ctrl+Space):
Set-Alias npm npm.cmd

# 8 configurar ruta de NPM Y NODE
$env:PATH += ";C:\Users\Diego\scoop\shims"
$env:PATH += ";C:\Users\Diego.DESKTOP-0CQHRL5\.npm-global\bin"

#9 PSFZF para buscar comandos [Ctrl+R] y [Ctrl+T] para Filtrar busqueda pro

Set-PsFzfOption -PSReadLineChordProvider 'Ctrl+t' -PSReadLineChordReverseHistory 'Ctrl+r'

#10 NOTEPAD - notepads.exe de la store xd

function notepad {
  param(
    [string]$Path = $null
  )
  if (-not $Path) {
    Start-Process -FilePath "notepads.exe"
  }
  else {
    $path = $Path.Replace("/", "\")
    Start-Process -FilePath "notepads.exe" -ArgumentList $path
  }
}
# 📌 [Abrir Antigravity o VSCode]
# Si Antigravity está instalado, lo abre; si no, abre > Cursor > VSCode
function code {
  param([string]$Path = ".")
  $antigravityPath = "$env:LOCALAPPDATA\Programs\Antigravity\Antigravity.exe"
  $cursorPath = "$env:LOCALAPPDATA\Programs\Cursor\Cursor.exe"
  $codePath = "$env:LOCALAPPDATA\Programs\Microsoft VS Code\Code.exe"

  if ($Path -and $Path -ne ".") { $Path = $Path.Replace("/", "\") }

  if (Test-Path $antigravityPath) { & $antigravityPath $Path }
  elseif (Test-Path $cursorPath) { & $cursorPath $Path }
  elseif (Test-Path $codePath) { & $codePath $Path }
  else { & code.exe $Path }
}

# 📌 Abrir únicamente vscode (FUERA de la función code)
function vscode {
  param([string]$Path = ".")
  $codePath = "$env:LOCALAPPDATA\Programs\Microsoft VS Code\Code.exe"
  if ($Path -and $Path -ne ".") { $Path = $Path.Replace("/", "\") }
  if (Test-Path $codePath) { & $codePath $Path }
  else { & code.exe $Path }
}

# MIIcAgYJKoZIhvcNAQcCoIIb8zCCG+8CAQExDzANBglghkgBZQMEAgEFADB5Bgor
# BgEEAYI3AgEEoGswaTA0BgorBgEEAYI3AgEeMCYCAwEAAAQQH8w7YFlLCE63JNLG
# KX7zUQIBAAIBAAIBAAIBAAIBADAxMA0GCWCGSAFlAwQCAQUABCCdmEp/pMPIy/fQ
# IlLmRiLcdlnZ9n2nusX8W2vzIEU636CCFkowggMMMIIB9KADAgECAhAp5q1s/ah4
# tU2lSxZiKq8TMA0GCSqGSIb3DQEBCwUAMB4xHDAaBgNVBAMME1Bvd2VyU2hlbGw3
# IFNjcmlwdHMwHhcNMjUxMjI5MjA1MTM1WhcNMjYxMjI5MjExMTM1WjAeMRwwGgYD
# VQQDDBNQb3dlclNoZWxsNyBTY3JpcHRzMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8A
# MIIBCgKCAQEA471+22vHMrsexaqmhfgbmR+V18Tui2aXIcstNnI97lFRKknCJbRr
# g5mGjzzAjx6jnE6hU5zUpkXzgXWNV3V+b+C2ola7uJafRQ5Z2vecsnFVSDokVWIu
# hx6UjI52tX1EvValmVexRZ9MRHsSSWIWyIax9RsWcCQVZ80eXskDx6DU5TCYA8xO
# 9TvWOZZL2sOQNHM3HFhJBQO3STkpsWFPfFWEZnja4kczNcjnzX+dIYPuSiJsWw3H
# iSvYClmsxM8KumCioADC8E2l7BQhe0Y6ESAmE3uPJO7NQWiztAuOQ0v/F2zmZAEg
# +w/F2N3pYP1BFUTZQwuxbwdSgT6+3i2xkQIDAQABo0YwRDAOBgNVHQ8BAf8EBAMC
# B4AwEwYDVR0lBAwwCgYIKwYBBQUHAwMwHQYDVR0OBBYEFLVouxpNSFyeNqGJPe50
# 99jn4+/bMA0GCSqGSIb3DQEBCwUAA4IBAQDNq13tJjVN7CEckzqPTzmVRmqTcxxU
# RUxhYjl/vC8PSwlrF3nUwRLxpkDVZscxaN5bQlsikEJDY9DHC/DBnnt8zMyaMMrn
# gULujsdiMlkImxctNw1O79Hbki5chcnfNbOeqhxzS+jM2M9hEblDi893wWRAWCEj
# snm/erSUEXZeY8f0oRQv3nRp7/aSKJURdu8vFyOmOChl4vZJ6oBr5nyqcPZ6HS5E
# 2o0UQh1G8GzAp20UfRHLRmWZzXNqT+KJFCRzOhPOAQ5kdSnIbcLGP+Z723iceOQL
# B8c2fDV+dRkT6Oy8HoqI015D0WOCI+8d2ghOfUuF3yBdCiwJ06GqoWNSMIIFjTCC
# BHWgAwIBAgIQDpsYjvnQLefv21DiCEAYWjANBgkqhkiG9w0BAQwFADBlMQswCQYD
# VQQGEwJVUzEVMBMGA1UEChMMRGlnaUNlcnQgSW5jMRkwFwYDVQQLExB3d3cuZGln
# aWNlcnQuY29tMSQwIgYDVQQDExtEaWdpQ2VydCBBc3N1cmVkIElEIFJvb3QgQ0Ew
# HhcNMjIwODAxMDAwMDAwWhcNMzExMTA5MjM1OTU5WjBiMQswCQYDVQQGEwJVUzEV
# MBMGA1UEChMMRGlnaUNlcnQgSW5jMRkwFwYDVQQLExB3d3cuZGlnaWNlcnQuY29t
# MSEwHwYDVQQDExhEaWdpQ2VydCBUcnVzdGVkIFJvb3QgRzQwggIiMA0GCSqGSIb3
# DQEBAQUAA4ICDwAwggIKAoICAQC/5pBzaN675F1KPDAiMGkz7MKnJS7JIT3yithZ
# wuEppz1Yq3aaza57G4QNxDAf8xukOBbrVsaXbR2rsnnyyhHS5F/WBTxSD1Ifxp4V
# pX6+n6lXFllVcq9ok3DCsrp1mWpzMpTREEQQLt+C8weE5nQ7bXHiLQwb7iDVySAd
# YyktzuxeTsiT+CFhmzTrBcZe7FsavOvJz82sNEBfsXpm7nfISKhmV1efVFiODCu3
# T6cw2Vbuyntd463JT17lNecxy9qTXtyOj4DatpGYQJB5w3jHtrHEtWoYOAMQjdjU
# N6QuBX2I9YI+EJFwq1WCQTLX2wRzKm6RAXwhTNS8rhsDdV14Ztk6MUSaM0C/CNda
# SaTC5qmgZ92kJ7yhTzm1EVgX9yRcRo9k98FpiHaYdj1ZXUJ2h4mXaXpI8OCiEhtm
# mnTK3kse5w5jrubU75KSOp493ADkRSWJtppEGSt+wJS00mFt6zPZxd9LBADMfRyV
# w4/3IbKyEbe7f/LVjHAsQWCqsWMYRJUadmJ+9oCw++hkpjPRiQfhvbfmQ6QYuKZ3
# AeEPlAwhHbJUKSWJbOUOUlFHdL4mrLZBdd56rF+NP8m800ERElvlEFDrMcXKchYi
# Cd98THU/Y+whX8QgUWtvsauGi0/C1kVfnSD8oR7FwI+isX4KJpn15GkvmB0t9dmp
# sh3lGwIDAQABo4IBOjCCATYwDwYDVR0TAQH/BAUwAwEB/zAdBgNVHQ4EFgQU7Nfj
# gtJxXWRM3y5nP+e6mK4cD08wHwYDVR0jBBgwFoAUReuir/SSy4IxLVGLp6chnfNt
# yA8wDgYDVR0PAQH/BAQDAgGGMHkGCCsGAQUFBwEBBG0wazAkBggrBgEFBQcwAYYY
# aHR0cDovL29jc3AuZGlnaWNlcnQuY29tMEMGCCsGAQUFBzAChjdodHRwOi8vY2Fj
# ZXJ0cy5kaWdpY2VydC5jb20vRGlnaUNlcnRBc3N1cmVkSURSb290Q0EuY3J0MEUG
# A1UdHwQ+MDwwOqA4oDaGNGh0dHA6Ly9jcmwzLmRpZ2ljZXJ0LmNvbS9EaWdpQ2Vy
# dEFzc3VyZWRJRFJvb3RDQS5jcmwwEQYDVR0gBAowCDAGBgRVHSAAMA0GCSqGSIb3
# DQEBDAUAA4IBAQBwoL9DXFXnOF+go3QbPbYW1/e/Vwe9mqyhhyzshV6pGrsi+Ica
# aVQi7aSId229GhT0E0p6Ly23OO/0/4C5+KH38nLeJLxSA8hO0Cre+i1Wz/n096ww
# epqLsl7Uz9FDRJtDIeuWcqFItJnLnU+nBgMTdydE1Od/6Fmo8L8vC6bp8jQ87PcD
# x4eo0kxAGTVGamlUsLihVo7spNU96LHc/RzY9HdaXFSMb++hUD38dglohJ9vytsg
# jTVgHAIDyyCwrFigDkBjxZgiwbJZ9VVrzyerbHbObyMt9H5xaiNrIv8SuFQtJ37Y
# OtnwtoeW/VvRXKwYw02fc7cBqZ9Xql4o4rmUMIIGtDCCBJygAwIBAgIQDcesVwX/
# IZkuQEMiDDpJhjANBgkqhkiG9w0BAQsFADBiMQswCQYDVQQGEwJVUzEVMBMGA1UE
# ChMMRGlnaUNlcnQgSW5jMRkwFwYDVQQLExB3d3cuZGlnaWNlcnQuY29tMSEwHwYD
# VQQDExhEaWdpQ2VydCBUcnVzdGVkIFJvb3QgRzQwHhcNMjUwNTA3MDAwMDAwWhcN
# MzgwMTE0MjM1OTU5WjBpMQswCQYDVQQGEwJVUzEXMBUGA1UEChMORGlnaUNlcnQs
# IEluYy4xQTA/BgNVBAMTOERpZ2lDZXJ0IFRydXN0ZWQgRzQgVGltZVN0YW1waW5n
# IFJTQTQwOTYgU0hBMjU2IDIwMjUgQ0ExMIICIjANBgkqhkiG9w0BAQEFAAOCAg8A
# MIICCgKCAgEAtHgx0wqYQXK+PEbAHKx126NGaHS0URedTa2NDZS1mZaDLFTtQ2oR
# jzUXMmxCqvkbsDpz4aH+qbxeLho8I6jY3xL1IusLopuW2qftJYJaDNs1+JH7Z+Qd
# SKWM06qchUP+AbdJgMQB3h2DZ0Mal5kYp77jYMVQXSZH++0trj6Ao+xh/AS7sQRu
# QL37QXbDhAktVJMQbzIBHYJBYgzWIjk8eDrYhXDEpKk7RdoX0M980EpLtlrNyHw0
# Xm+nt5pnYJU3Gmq6bNMI1I7Gb5IBZK4ivbVCiZv7PNBYqHEpNVWC2ZQ8BbfnFRQV
# ESYOszFI2Wv82wnJRfN20VRS3hpLgIR4hjzL0hpoYGk81coWJ+KdPvMvaB0WkE/2
# qHxJ0ucS638ZxqU14lDnki7CcoKCz6eum5A19WZQHkqUJfdkDjHkccpL6uoG8pbF
# 0LJAQQZxst7VvwDDjAmSFTUms+wV/FbWBqi7fTJnjq3hj0XbQcd8hjj/q8d6ylgx
# CZSKi17yVp2NL+cnT6Toy+rN+nM8M7LnLqCrO2JP3oW//1sfuZDKiDEb1AQ8es9X
# r/u6bDTnYCTKIsDq1BtmXUqEG1NqzJKS4kOmxkYp2WyODi7vQTCBZtVFJfVZ3j7O
# gWmnhFr4yUozZtqgPrHRVHhGNKlYzyjlroPxul+bgIspzOwbtmsgY1MCAwEAAaOC
# AV0wggFZMBIGA1UdEwEB/wQIMAYBAf8CAQAwHQYDVR0OBBYEFO9vU0rp5AZ8esri
# kFb2L9RJ7MtOMB8GA1UdIwQYMBaAFOzX44LScV1kTN8uZz/nupiuHA9PMA4GA1Ud
# DwEB/wQEAwIBhjATBgNVHSUEDDAKBggrBgEFBQcDCDB3BggrBgEFBQcBAQRrMGkw
# JAYIKwYBBQUHMAGGGGh0dHA6Ly9vY3NwLmRpZ2ljZXJ0LmNvbTBBBggrBgEFBQcw
# AoY1aHR0cDovL2NhY2VydHMuZGlnaWNlcnQuY29tL0RpZ2lDZXJ0VHJ1c3RlZFJv
# b3RHNC5jcnQwQwYDVR0fBDwwOjA4oDagNIYyaHR0cDovL2NybDMuZGlnaWNlcnQu
# Y29tL0RpZ2lDZXJ0VHJ1c3RlZFJvb3RHNC5jcmwwIAYDVR0gBBkwFzAIBgZngQwB
# BAIwCwYJYIZIAYb9bAcBMA0GCSqGSIb3DQEBCwUAA4ICAQAXzvsWgBz+Bz0RdnEw
# vb4LyLU0pn/N0IfFiBowf0/Dm1wGc/Do7oVMY2mhXZXjDNJQa8j00DNqhCT3t+s8
# G0iP5kvN2n7Jd2E4/iEIUBO41P5F448rSYJ59Ib61eoalhnd6ywFLerycvZTAz40
# y8S4F3/a+Z1jEMK/DMm/axFSgoR8n6c3nuZB9BfBwAQYK9FHaoq2e26MHvVY9gCD
# A/JYsq7pGdogP8HRtrYfctSLANEBfHU16r3J05qX3kId+ZOczgj5kjatVB+NdADV
# ZKON/gnZruMvNYY2o1f4MXRJDMdTSlOLh0HCn2cQLwQCqjFbqrXuvTPSegOOzr4E
# Wj7PtspIHBldNE2K9i697cvaiIo2p61Ed2p8xMJb82Yosn0z4y25xUbI7GIN/TpV
# fHIqQ6Ku/qjTY6hc3hsXMrS+U0yy+GWqAXam4ToWd2UQ1KYT70kZjE4YtL8Pbzg0
# c1ugMZyZZd/BdHLiRu7hAWE6bTEm4XYRkA6Tl4KSFLFk43esaUeqGkH/wyW4N7Oi
# gizwJWeukcyIPbAvjSabnf7+Pu0VrFgoiovRDiyx3zEdmcif/sYQsfch28bZeUz2
# rtY/9TCA6TD8dC3JE3rYkrhLULy7Dc90G6e8BlqmyIjlgp2+VqsS9/wQD7yFylIz
# 0scmbKvFoW2jNrbM1pD2T7m3XDCCBu0wggTVoAMCAQICEAqA7xhLjfEFgtHEdqeV
# dGgwDQYJKoZIhvcNAQELBQAwaTELMAkGA1UEBhMCVVMxFzAVBgNVBAoTDkRpZ2lD
# ZXJ0LCBJbmMuMUEwPwYDVQQDEzhEaWdpQ2VydCBUcnVzdGVkIEc0IFRpbWVTdGFt
# cGluZyBSU0E0MDk2IFNIQTI1NiAyMDI1IENBMTAeFw0yNTA2MDQwMDAwMDBaFw0z
# NjA5MDMyMzU5NTlaMGMxCzAJBgNVBAYTAlVTMRcwFQYDVQQKEw5EaWdpQ2VydCwg
# SW5jLjE7MDkGA1UEAxMyRGlnaUNlcnQgU0hBMjU2IFJTQTQwOTYgVGltZXN0YW1w
# IFJlc3BvbmRlciAyMDI1IDEwggIiMA0GCSqGSIb3DQEBAQUAA4ICDwAwggIKAoIC
# AQDQRqwtEsae0OquYFazK1e6b1H/hnAKAd/KN8wZQjBjMqiZ3xTWcfsLwOvRxUwX
# cGx8AUjni6bz52fGTfr6PHRNv6T7zsf1Y/E3IU8kgNkeECqVQ+3bzWYesFtkepEr
# vUSbf+EIYLkrLKd6qJnuzK8Vcn0DvbDMemQFoxQ2Dsw4vEjoT1FpS54dNApZfKY6
# 1HAldytxNM89PZXUP/5wWWURK+IfxiOg8W9lKMqzdIo7VA1R0V3Zp3DjjANwqAf4
# lEkTlCDQ0/fKJLKLkzGBTpx6EYevvOi7XOc4zyh1uSqgr6UnbksIcFJqLbkIXIPb
# cNmA98Oskkkrvt6lPAw/p4oDSRZreiwB7x9ykrjS6GS3NR39iTTFS+ENTqW8m6TH
# uOmHHjQNC3zbJ6nJ6SXiLSvw4Smz8U07hqF+8CTXaETkVWz0dVVZw7knh1WZXOLH
# gDvundrAtuvz0D3T+dYaNcwafsVCGZKUhQPL1naFKBy1p6llN3QgshRta6Eq4B40
# h5avMcpi54wm0i2ePZD5pPIssoszQyF4//3DoK2O65Uck5Wggn8O2klETsJ7u8xE
# ehGifgJYi+6I03UuT1j7FnrqVrOzaQoVJOeeStPeldYRNMmSF3voIgMFtNGh86w3
# ISHNm0IaadCKCkUe2LnwJKa8TIlwCUNVwppwn4D3/Pt5pwIDAQABo4IBlTCCAZEw
# DAYDVR0TAQH/BAIwADAdBgNVHQ4EFgQU5Dv88jHt/f3X85FxYxlQQ89hjOgwHwYD
# VR0jBBgwFoAU729TSunkBnx6yuKQVvYv1Ensy04wDgYDVR0PAQH/BAQDAgeAMBYG
# A1UdJQEB/wQMMAoGCCsGAQUFBwMIMIGVBggrBgEFBQcBAQSBiDCBhTAkBggrBgEF
# BQcwAYYYaHR0cDovL29jc3AuZGlnaWNlcnQuY29tMF0GCCsGAQUFBzAChlFodHRw
# Oi8vY2FjZXJ0cy5kaWdpY2VydC5jb20vRGlnaUNlcnRUcnVzdGVkRzRUaW1lU3Rh
# bXBpbmdSU0E0MDk2U0hBMjU2MjAyNUNBMS5jcnQwXwYDVR0fBFgwVjBUoFKgUIZO
# aHR0cDovL2NybDMuZGlnaWNlcnQuY29tL0RpZ2lDZXJ0VHJ1c3RlZEc0VGltZVN0
# YW1waW5nUlNBNDA5NlNIQTI1NjIwMjVDQTEuY3JsMCAGA1UdIAQZMBcwCAYGZ4EM
# AQQCMAsGCWCGSAGG/WwHATANBgkqhkiG9w0BAQsFAAOCAgEAZSqt8RwnBLmuYEHs
# 0QhEnmNAciH45PYiT9s1i6UKtW+FERp8FgXRGQ/YAavXzWjZhY+hIfP2JkQ38U+w
# tJPBVBajYfrbIYG+Dui4I4PCvHpQuPqFgqp1PzC/ZRX4pvP/ciZmUnthfAEP1HSh
# TrY+2DE5qjzvZs7JIIgt0GCFD9ktx0LxxtRQ7vllKluHWiKk6FxRPyUPxAAYH2Vy
# 1lNM4kzekd8oEARzFAWgeW3az2xejEWLNN4eKGxDJ8WDl/FQUSntbjZ80FU3i54t
# px5F/0Kr15zW/mJAxZMVBrTE2oi0fcI8VMbtoRAmaaslNXdCG1+lqvP4FbrQ6IwS
# BXkZagHLhFU9HCrG/syTRLLhAezu/3Lr00GrJzPQFnCEH1Y58678IgmfORBPC1JK
# kYaEt2OdDh4GmO0/5cHelAK2/gTlQJINqDr6JfwyYHXSd+V08X1JUPvB4ILfJdmL
# +66Gp3CSBXG6IwXMZUXBhtCyIaehr0XkBoDIGMUG1dUtwq1qmcwbdUfcSYCn+Own
# cVUXf53VJUNOaMWMts0VlRYxe5nK+At+DI96HAlXHAL5SlfYxJ7La54i71McVWRP
# 66bW+yERNpbJCjyCYG2j+bdpxo/1Cy4uPcU3AWVPGrbn5PhDBf3Froguzzhk++am
# i+r3Qrx5bIbY3TVzgiFI7Gq3zWcxggUOMIIFCgIBATAyMB4xHDAaBgNVBAMME1Bv
# d2VyU2hlbGw3IFNjcmlwdHMCECnmrWz9qHi1TaVLFmIqrxMwDQYJYIZIAWUDBAIB
# BQCggYQwGAYKKwYBBAGCNwIBDDEKMAigAoAAoQKAADAZBgkqhkiG9w0BCQMxDAYK
# KwYBBAGCNwIBBDAcBgorBgEEAYI3AgELMQ4wDAYKKwYBBAGCNwIBFTAvBgkqhkiG
# 9w0BCQQxIgQgnpV0mCeFKhVGzk1WOQU5zLgr6xQLjL9hNZcvg2CzimMwDQYJKoZI
# hvcNAQEBBQAEggEAp2MePGEcqCe1LUiob9bEK1dlr5jozWVf/mqtK0Z1BCbOb0Nu
# uE9lCkvjxmTB5VpXDcnv/QeyUICkeQMnhiXOOczVTydnbCrQjDMFKvQhcbh5ZqWn
# rb44cII0Z07/uzY3D/ldbdc3X/ST1Pq1WMfh47tAt6InjTKeI3BFNh2j6I5IMIa3
# rpI6p5fnMuUlcy48ihdMBTi/L6nbZHjLjPJeRe1ypFq/uDOZttAsHnYJsncwPMPh
# eDhVqdPY8hrf2qJwSt0rVvWiUsdmpz+Hohk7OyMGS+vHQ24Bek0z/OTudSyUI247
# K6bD1jqS94e/+OCMQ51jAAabJCj/Pj+z3eM1N6GCAyYwggMiBgkqhkiG9w0BCQYx
# ggMTMIIDDwIBATB9MGkxCzAJBgNVBAYTAlVTMRcwFQYDVQQKEw5EaWdpQ2VydCwg
# SW5jLjFBMD8GA1UEAxM4RGlnaUNlcnQgVHJ1c3RlZCBHNCBUaW1lU3RhbXBpbmcg
# UlNBNDA5NiBTSEEyNTYgMjAyNSBDQTECEAqA7xhLjfEFgtHEdqeVdGgwDQYJYIZI
# AWUDBAIBBQCgaTAYBgkqhkiG9w0BCQMxCwYJKoZIhvcNAQcBMBwGCSqGSIb3DQEJ
# BTEPFw0yNTEyMjkyMTAxMzZaMC8GCSqGSIb3DQEJBDEiBCC7icRWB/5TzrVUMEMO
# Ui6kdLPsLeWew0dS2GcR9++6ITANBgkqhkiG9w0BAQEFAASCAgCWad1sOUkIyGnO
# nmjb+zQTiYAGJkJtA0Oq1Imfv38ZVHMMvGraBWQk6+ZBcw4zJcCAvGRyGRkaUEVd
# Qc/PHqtrld0T8ZrT8WTo3QzT8tIryzIsx6nO3phJjzHN+UxXeVs51wexCVb5qKf6
# FURdCudPRITkv48OtjkB1qfSqfzDI7lnMMHnTg4mEGrQjtlVuzjepb3kSDTvgl5x
# fMZfWXiYnLM4wCs36F5AuufxJ10AC/DsT6R2l+mB017hgwVrCVbId504lBqMNCQ3
# tElH34QYOy3f5kBN6ysBa15c3BNXqLk/mItayq6M5YyYaRKl5NJawsBr8cmQLsp1
# TYgufDi69njV3S75b8+Y15exUF2cCL7Wvjztp89buv2ezbrujo69h/ppegBJxTnp
# KgUHLyKEOtO7qBgZ+6puJG1cHDzvrhCckmixxw2hgekHB9GJWjZc5f/5VjJC7zGY
# PsUmJ0WK/Lenc1TWwFb3JsFw2N0UOpBajjBv8Y8JDu0Fei84TYrVpsGREiEQ+mOO
# 0BRU2KeRQxVzffu6Op45mYwTMGdgWdKi8u/UyZRq5bCl2lSgYYJ89UjX6TZZERe3
# cvtKZ3vz0ikx7n41lxlYhtJ8Tom1QDSplj85BGUkAkjfK3KbE0H8sYvaeoC8GaTo
# dWgnTHFmSIeO/LrcnWtjFnlUvjX0eA==


