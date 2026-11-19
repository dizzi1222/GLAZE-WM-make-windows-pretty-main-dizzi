# OpenCode en Windows

Configuración V2 para Windows, alineada con `dotfiles-dizzi/opencode/.config/opencode/`. OpenCode V2 lee la configuración global desde `%USERPROFILE%\.config\opencode\opencode.json` y las preferencias del terminal (incluidos los plugins TUI) desde `%USERPROFILE%\.config\opencode\cli.json`. Las plantillas no contienen credenciales.

## Componentes

- **Engram**: `plugins/engram.ts` conserva los hooks de sesión en formato V2 (`default` con `id` y `setup`). Usa el ejecutable `%USERPROFILE%\bin\engram.exe`; configura `ENGRAM_BIN` para que el plugin también pueda iniciar el servicio HTTP.
- **Engram MCP**: está en `mcp.servers.engram` y habilitado cuando el binario existe. Usa `engram.exe mcp --tools=agent`.
- **OpenCode Discord RPC**: `C:\Users\Administrator\workspace\opencode-discord-rpc`. El plugin soporta V2 mediante `id`/`setup` y mantiene `server()` para compatibilidad V1. El paquete carga `dist/index.js`.
- **Voz (dictado y Live)**: `plugins/voice` es un plugin TUI basado en la rama `main` de `dotfiles-dizzi` con adaptador nativo para Windows (FFmpeg/DirectShow + faster-whisper/SAPI). Se registra en `cli.json`, no en `plugins` de `opencode.json`.
- **TodoWrite**: `commands/todowrite.md` registra el comando `/todowrite`; requiere `experimental.todo: true` en `opencode.json`.
- **Atajos**: `Ctrl+X` y luego `1`, `2` o `3` selecciona las pestañas 1–3 en Windows; el chord funciona sin depender de cómo el emulador envía `Ctrl+1`.

## MCP habilitados

En OpenCode V2 los servidores MCP se desactivan con `disabled`:

- `"disabled": false` (o campo omitido) conecta el servidor al iniciar.
- `"disabled": true` lo deja configurado sin conectar.

No uses `"enabled": false`: OpenCode lo ignora y puede conectar el servidor igualmente.

En esta configuración, solo `webshare-es` y `webshare-uk` se conectan; `webshare-us`, `webshare-us-2` a `webshare-us-7` y `webshare-pl` tienen `"disabled": true`.

## Voz en Windows

Requisitos:

1. **FFmpeg** con DirectShow (instalado con `winget install Gyan.FFmpeg`). El plugin y el transcriptor lo buscan en `PATH`, aceptan `FFMPEG_PATH` y tienen fallback al alias estándar de WinGet si OpenCode conserva un `PATH` anterior.
2. **Micrófono DirectShow**. El plugin elige el primero que parece físico y evita cámaras virtuales como Iriun u OBS. Para forzar otro dispositivo define `VOICE_DEVICE` con el nombre exacto que devuelve `opencode-voice devices`.
3. **Transcripción Live/F5**: `/voice-config` ofrece faster-whisper local (recomendado), Windows SAPI, OpenAI API y Gemini API. faster-whisper usa Whisper local (`small` por defecto), intenta CUDA y cae a CPU `int8`; no usa cuota ni API key. Instálalo con `py -3.12 -m pip install -r .\scripts\requirements-voice.txt`. SAPI queda disponible como fallback explícito.
4. **TTS**: usa `System.Speech` de PowerShell (`SAPI`), incluido en Windows. No requiere eSpeak.
5. **Transcriptor**: `scripts/opencode-voice.mjs`, copiado a `%USERPROFILE%\.local\bin\opencode-voice.mjs`, y Node.js disponible en `PATH` (o indicado por `OPENCODE_VOICE_NODE`). El TUI debe invocar `node.exe`; `process.execPath` apunta a `opencode.exe` en la app empaquetada y no sirve para ejecutar el `.mjs`.

Instala el transcriptor y comprueba el audio:

```powershell
New-Item -ItemType Directory -Force -Path "$env:USERPROFILE\.local\bin" | Out-Null
Copy-Item .\scripts\opencode-voice.mjs "$env:USERPROFILE\.local\bin\opencode-voice.mjs" -Force
Copy-Item .\scripts\voice-stt-faster-whisper.py "$env:USERPROFILE\.local\bin\voice-stt-faster-whisper.py" -Force
py -3.12 -m pip install --user -r .\scripts\requirements-voice.txt
node "$env:USERPROFILE\.local\bin\opencode-voice.mjs" devices
node "$env:USERPROFILE\.local\bin\opencode-voice.mjs" doctor
```

Registra el plugin en `cli.json` (la ruta debe apuntar al paquete del repo o a una copia local):

```json
{
  "$schema": "https://opencode.ai/v2/cli.json",
  "plugins": [
    {
      "package": "C:/Users/Administrator/workspace/GLAZE-WM-make-windows-pretty-main-dizzi/opencode/plugins/voice"
    }
  ]
}
```

Atajos del plugin:

- `F4` (`/live`): inicia o termina la conversación Live.
- `F5` (`/voice-ask`): dicta y envía la transcripción al chat.
- `F6`: mute del micrófono durante Live.
- `F7`: cuelga Live o cancela la grabación.
- `F3` (`/voice-config`): **Transcripción STT** pide motor y modelo de transcripción, seguido de **Provider → Modelo → Variant** de respuesta. El selector muestra todos los providers y modelos de chat del catálogo de OpenCode e indica qué modelos están deshabilitados. El perfil nuevo usa GPT-5.6 Luna `low` de forma predeterminada. Los perfiles guardados se conservan. **Ruta de respuestas** permite elegir OpenCode, AGY ACP o Codex app-server.
- `Ctrl+X`, luego `V`: abre la lista de variantes del modelo (`low`, `high`, `max`, etc. según el modelo). Cambia el nivel de razonamiento, no el volumen ni la sensibilidad del micrófono.

Live (`F4`) detecta el final de una frase, la transcribe, envía el texto al motor elegido y reproduce la respuesta con SAPI al terminar el turno. La variante `low` reduce el esfuerzo del modelo de respuesta. Los motores STT de este plugin procesan segmentos completos. F5 dicta al chat usando su modelo actual. Para usar ChatGPT OAuth en la ruta OpenCode, inicia sesión con `opencode auth login openai` y elige **Sign in with ChatGPT**.

La preferencia STT guardada tiene prioridad sobre `VOICE_PROVIDER`, `VOICE_MODEL` y `VOICE_LANGUAGE` del entorno. Si falta soporte para faster-whisper, actualiza el transcriptor y su helper juntos y comprueba el intérprete de Python. La validación en Windows no acredita soporte para CTranslate2 en Termux. Android requiere su propio paquete compatible y una prueba de captura y reproducción en el dispositivo.

Los fallbacks no cambian de ruta silenciosamente. Para habilitar el fallback secundario de forma explícita define `OPENCODE_VOICE_ALLOW_FALLBACK=1`; de lo contrario Live informa el error del motor seleccionado y se detiene.

## Instalación y actualización

Instala Engram para Windows desde [los releases oficiales](https://github.com/Gentleman-Programming/engram/releases/latest), extrae `engram.exe` a `%USERPROFILE%\bin\engram.exe` y define `ENGRAM_BIN` en el entorno de usuario. Añade `%USERPROFILE%\bin` a `PATH` para que también esté disponible desde shells y otras herramientas.

Instala el comando global `/todowrite`:

```powershell
New-Item -ItemType Directory -Force -Path "$env:USERPROFILE\.config\opencode\commands" | Out-Null
Copy-Item .\commands\todowrite.md "$env:USERPROFILE\.config\opencode\commands\todowrite.md" -Force
```

Clona o actualiza los repositorios de MCP y Discord RPC, e instala sus dependencias:

```powershell
git clone https://github.com/dizzi1222/opencode-discord-rpc.git "$env:USERPROFILE\workspace\opencode-discord-rpc"

npm ci --prefix "$env:USERPROFILE\workspace\opencode-discord-rpc"
npm run build --prefix "$env:USERPROFILE\workspace\opencode-discord-rpc"
```

Copia `opencode.json` y `cli.json` a `%USERPROFILE%\.config\opencode\`. Copia `plugins\engram.ts` a `%USERPROFILE%\.config\opencode\plugins\engram.ts`. El plugin de voz puede quedar en el repo y enlazarse desde `cli.json`, o copiarse a `%USERPROFILE%\.config\opencode\plugins\voice` y ajustar la ruta. Reinicia OpenCode después de actualizar plugins o variables de entorno.

## Verificación

1. Ejecuta `engram.exe version` y confirma `engram.exe mcp --tools=agent` desde una terminal nueva.
2. Inicia OpenCode y ejecuta `opencode mcp list`; Engram debe conectar cuando su binario esté disponible.
3. Prueba Engram con un prompt, contexto previo y compactación; el plugin debe conservar captura de prompts, filtros `<private>`, captura pasiva de tareas y recordatorios.
4. En Windows Terminal y Git Bash, cambia de pestaña con `Ctrl+X`, luego `1`, `2` o `3`.
5. Para Discord, abre Discord Desktop, activa la visibilidad de actividad y confirma que OpenCode publica presencia.
6. Para voz, ejecuta `node "$env:USERPROFILE\.local\bin\opencode-voice.mjs" doctor`: debe listar micrófonos, capturar muestras y transcribir. Dentro de OpenCode pulsa `F5` para dictar y `F4` para Live.

El plugin se carga al iniciar OpenCode. Si recompilas Discord RPC o actualizas Engram, reinicia el proceso para cargar las versiones nuevas.
