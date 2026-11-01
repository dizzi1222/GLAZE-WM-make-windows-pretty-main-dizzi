# OpenCode en Windows

Configuración V2 para Windows, alineada con `dotfiles-dizzi/opencode/.config/opencode/`. OpenCode 2.2.5 lee la configuración global desde `%USERPROFILE%\.config\opencode\opencode.json`; la plantilla `tui.json` define los atajos del terminal. Las plantillas no contienen credenciales.

## Componentes

- **Engram**: `plugins/engram.ts` conserva los hooks de sesión en formato V2 (`default` con `id` y `setup`). Usa el ejecutable `%USERPROFILE%\bin\engram.exe`; configura `ENGRAM_BIN` para que el plugin también pueda iniciar el servicio HTTP.
- **Engram MCP**: está en `mcp.servers.engram` y habilitado cuando el binario existe. Usa `engram.exe mcp --tools=agent`.
- **OpenCode Discord RPC**: `C:\Users\Administrator\workspace\opencode-discord-rpc`. El plugin soporta V2 mediante `id`/`setup` y mantiene `server()` para compatibilidad V1. El paquete carga `dist/index.js`.
- **Atajos**: `Ctrl+X` y luego `1`, `2` o `3` selecciona las pestañas 1–3 en Windows; el chord funciona sin depender de cómo el emulador envía `Ctrl+1`.

## Instalación y actualización

Instala Engram para Windows desde [los releases oficiales](https://github.com/Gentleman-Programming/engram/releases/latest), extrae `engram.exe` a `%USERPROFILE%\bin\engram.exe` y define `ENGRAM_BIN` en el entorno de usuario. Añade `%USERPROFILE%\bin` a `PATH` para que también esté disponible desde shells y otras herramientas.

Clona o actualiza los repositorios de MCP y Discord RPC, e instala sus dependencias:

```powershell
git clone https://github.com/dizzi1222/opencode-discord-rpc.git "$env:USERPROFILE\workspace\opencode-discord-rpc"

npm ci --prefix "$env:USERPROFILE\workspace\opencode-discord-rpc"
npm run build --prefix "$env:USERPROFILE\workspace\opencode-discord-rpc"
```

Copia `opencode.json` y `tui.json` a `%USERPROFILE%\.config\opencode\`. Copia `plugins\engram.ts` a `%USERPROFILE%\.config\opencode\plugins\engram.ts`. Reinicia OpenCode después de actualizar plugins o variables de entorno.

## Verificación

1. Ejecuta `engram.exe version` y confirma `engram.exe mcp --tools=agent` desde una terminal nueva.
2. Inicia OpenCode y ejecuta `opencode mcp list`; Engram debe conectar cuando su binario esté disponible.
3. Prueba Engram con un prompt, contexto previo y compactación; el plugin debe conservar captura de prompts, filtros `<private>`, captura pasiva de tareas y recordatorios.
4. En Windows Terminal y Git Bash, cambia de pestaña con `Ctrl+X`, luego `1`, `2` o `3`.
5. Para Discord, abre Discord Desktop, activa la visibilidad de actividad y confirma que OpenCode publica presencia.

El plugin se carga al iniciar OpenCode. Si recompilas Discord RPC o actualizas Engram, reinicia el proceso para cargar las versiones nuevas.
