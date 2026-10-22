# OpenCode en Windows

Esta es la adaptación para Windows de `dotfiles-dizzi/opencode/.config/opencode/opencode.json`.
El archivo global que utiliza OpenCode es `%USERPROFILE%\.config\opencode\opencode.json`.
La plantilla versionada en este directorio no contiene credenciales; las toma de las variables de entorno del usuario.

## Componentes gestionados

- **DataImpulse MCP**: `C:\Users\Administrator\workspace\dataimpulse-mcp\index.js`.
  Solo recibe `DI_USER` y `DI_PASS` desde OpenCode. No define `HTTP_PROXY` ni
  `HTTPS_PROXY` globalmente, por lo que el proxy no afecta el resto de Windows.
- **OpenCode Discord RPC**: `C:\Users\Administrator\workspace\opencode-discord-rpc`.
  La entrada usa un URI `file:///` para que OpenCode no confunda la unidad `C:`
  con el nombre de un paquete npm; su `package.json` carga `dist/index.js`.
  El plugin conserva la API V1 que utiliza el TUI terminal; los hooks se
  registran mediante el export por función compatible con OpenCode `1.19.1`.

## Instalación y actualización

```powershell
git clone https://github.com/dizzi1222/dataimpulse-mcp.git "$env:USERPROFILE\workspace\dataimpulse-mcp"
git clone https://github.com/dizzi1222/opencode-discord-rpc.git "$env:USERPROFILE\workspace\opencode-discord-rpc"

npm ci --prefix "$env:USERPROFILE\workspace\dataimpulse-mcp"
npm ci --prefix "$env:USERPROFILE\workspace\opencode-discord-rpc"
npm run build --prefix "$env:USERPROFILE\workspace\opencode-discord-rpc"
```

El TUI instalado en esta máquina es OpenCode `1.19.1`. Si WinGet muestra una
actualización disponible, cierra primero cualquier proceso `opencode serve` y
ejecuta `winget upgrade --id SST.opencode` para que pueda reemplazar el binario.

Para actualizar ambos repositorios, ejecuta `git pull --ff-only` en cada uno y
repite `npm ci`; vuelve a ejecutar el build de Discord RPC.

Configura las credenciales de DataImpulse una sola vez, sin escribirlas en el
JSON ni en un `.env` versionado:

```powershell
setx DI_USER "tu_usuario_de_dataimpulse"
setx DI_PASS "tu_password_de_dataimpulse"
```

Cierra y abre una terminal nueva después de `setx`, y reinicia OpenCode. Si
las variables no existen, el MCP termina deliberadamente al iniciar y OpenCode
no podrá ofrecer las herramientas `dataimpulse_fetch_page` y
`dataimpulse_check_exit_ip`.

## Verificación

1. Abre Discord Desktop antes de iniciar OpenCode.
2. En Discord, activa **User Settings → Activity Privacy → Display current
   activity as a status message**.
3. Inicia OpenCode, envía un mensaje y revisa que Discord muestre `opencode`.
   El plugin sólo publica presencia cuando hay actividad; al estar idle cede la
   tarjeta a `cord.nvim` si está en ejecución.
4. Ejecuta `opencode mcp list` después de abrir una terminal nueva. Con las
   credenciales correctas, DataImpulse debe conectar y exponer sus dos tools.

## Por qué Discord no aparecía

El checkout local del plugin estaba referenciado correctamente, pero le
faltaban `node_modules` y `dist/`. Sin `npm ci` faltaba
`@xhayper/discord-rpc`; sin `npm run build` el `package.json` apuntaba a un
`dist/index.js` inexistente. OpenCode no tenía una entrada ejecutable para
conectar al IPC de Discord. Reiniciar OpenCode tras compilar es necesario,
porque el plugin se carga al arrancar.
