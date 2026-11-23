# Claude Code (Windows)

- `settings.json` → copiar a `%USERPROFILE%\.claude\settings.json` (bypassPermissions + sin prompt de modo peligroso).
- MCPs: fuente única en `dotfiles-dizzi/home/.claude/mcp-servers.json`, registrados con scope user en `~/.claude.json`.
  En Windows los stdio usan rutas nativas (el `claude-mcp-sync` de dotfiles solo conoce rutas Linux):

  ```bash
  claude mcp add-json -s user engram '{"type":"stdio","command":"C:/Users/Administrator/bin/engram.exe","args":["mcp","--tools=agent"]}'
  claude mcp add-json -s user figma '{"type":"stdio","command":"cmd","args":["/c","C:/Users/Administrator/AppData/Roaming/npm/figma-developer-mcp.cmd","--stdio"],"env":{"FIGMA_API_KEY":"${FIGMA_API_KEY}"}}'
  claude mcp list
  ```

  Sin binario en Windows: `n8n`, `shopify`. Remotos OAuth → `/mcp` → Authenticate.
- Tokens: variables de entorno de usuario (desde `~/.api-keys.ps1`). Faltan: `POSTMAN_API_KEY`, `RENTAHUMAN_API_KEY`.

## OpenCode: Claude Agent

OpenCode comprueba el login de Claude Code lanzando `claude`. Con solo el shim npm (`claude.CMD`)
falla con `spawn EINVAL` y la cuenta queda en "Sign in required" sin modelos. Arreglo (PowerShell):

```powershell
New-Item -ItemType SymbolicLink -Path "$HOME\.local\bin\claude.exe" `
  -Target "$env:APPDATA\npm\node_modules\@anthropic-ai\claude-code\bin\claude.exe"
```

`~/.local/bin` va antes que `npm` en el PATH; el symlink sobrevive a `npm update`.

## swissdevjobs

Si el MCP da `exit code 103 ... Python314\python.exe`, el venv de uv quedó huérfano:

```bash
rm -rf ~/AppData/Roaming/uv/tools/swissdevjobs-cli
uv tool install --force --python 3.14 "swissdevjobs-cli @ git+https://github.com/Stupidoodle/swissdevjobs-cli"
```

## OpenCode: Webshare

- Se usa el MCP remoto `webshare` (`https://mcp.webshare.io/`, OAuth: `opencode mcp auth webshare`).
- `webshare-uk` queda solo como referencia, `disabled: true` (proxy local vía `opencode/scripts/run-webshare-mcp.ps1` + dataimpulse-mcp).
  Ojo: según el handoff de dotfiles, OpenCode v2 puede ignorar `disabled`; si arranca igual, bórralo.
