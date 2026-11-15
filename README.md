# Comandos Importantes de GlazeWM [Con Powertoys 100% HYPRLAND]			

```
------------------------------------------------------	----------------------------
	\_;-> (Solo debes de mapear con Windows, cada atajo de Alt en Power)
------------------------------------------------------	----------------------------
🎯 MOVIMIENTO Y FOCO
Alt + H/J/K/L o Alt + Flechas - Mover foco entre ventanas
			\_;-> O USA LAS  FLECHAS; < ↓ ↑ >
			----------------------------------------
Alt + Shift + H/J/K/L - Mover ventana a otra posición

Alt + Control  + H/J/K/L - Mover ventana a otra posición

Alt + 1-9 - Cambiar a workspace 1-9

Alt + Shift + 1-9 - Mover ventana a workspace 1-9

------------------------------------------------------	----------------------------
##🪟 ESTADOS DE VENTANA

ALT + Space - Windows Start [Rofi like frfr]

Alt + T - Forzar modo tiling ✅ Salir del float
			\_;-> Windows + F = float, tiene menos poder
			
Alt + F11 - Pantalla completa -> [Windows + TAB]

ALT + F -  ✅ FLOATING MODE GODDD

Alt + M - Minimizar

------------------------------------------------------	----------------------------
🔄 LAYOUT Y DIRECCIÓN
Alt + V - Cambiar dirección de tiling (horizontal/vertical)

Alt + R → Modo resize → Usar HJKL para redimensionar → ESC para salir
------------------------------------------------------	----------------------------
##⚙️ SISTEMA

Alt + Shift + E - Recargar configuración

Alt + Shift + W - Redibujar ventanas

Alt + Shift + E - Salir de GlazeWM

Alt + Q - Cerrar ventana actual

Alt + M - Minimizar

Alt + Enter - Abrir terminal

```


https://github.com/user-attachments/assets/226106ac-2e0c-4912-adac-e3e41b31d91b



# ─❯ ⚠ make-windows-pretty-main-dizzi
        |
        ╰─❯ Basado en: https://github.com/vimichael/make-windows-pretty?tab=readme-ov-file

```U got this error??```

<img width="306" height="121" alt="2025-10-23 23_44_19-Google Drive" src="https://github.com/user-attachments/assets/18be57ad-89d6-4154-9757-abba0a75647e" />


```Showcase my rclone and best windows 10 setup, sayonara cloud services```

<img width="960" height="540" alt="2025-10-23 23_31_31-" src="https://github.com/user-attachments/assets/7d3ac9ea-b0b7-4131-9c45-df95ab73148a" />


https://github.com/user-attachments/assets/96f8b2d1-122b-4795-8c52-5ea184f916bd
      
         ╰─❯ ![Video in higher quality!] 󱞡↓
https://streamable.com/gzwuz6

DIZZI README ~ Best WINDOWS Tile Manager
------------------------------------------------------

~[ YO MODIFIQUE; config [glazeWM]
		 \_;-> LA CONFIG DE ZEBAR Y LA HICE MIA (fokiu vimichael)

~[ YASB ESTA CON otra CONFIG DE GLAZEWM (de SleepyCatHey)

# ....Al tonto se le olvido explicar:
# Al editar el config.yaml hay comandos:
# ✅ COMANDOS CORRECTOS:
commands: ["ignore"]                    # Ignorar ventana
commands: ["set-floating"]              # Hacer flotante
commands: ["set-floating --centered"]   # Flotante centrada
commands: ["set-tiling"]                # Hacer tiling
commands: ["set-always-on-top"]         # Siempre encima (SOLO Windows 11)

Con eso defines los windows similar a windowsrules en hypr.
------------------------------------------------------
C:\Users\Diego\.glzr\glazewm

En esa ruta debes de pegar

zebar-config config

 ~ Ignora .weztern.lua, private-build-plans.toml
	~ IGNORA vanilla-clear [hay temas mejores y funcionales].

██╗███╗░░██╗░██████╗████████╗░█████╗░██╗░░░░░░█████╗░██████╗░
██║████╗░██║██╔════╝╚══██╔══╝██╔══██╗██║░░░░░██╔══██╗██╔══██╗
██║██╔██╗██║╚█████╗░░░░██║░░░███████║██║░░░░░███████║██████╔╝
██║██║╚████║░╚═══██╗░░░██║░░░██╔══██║██║░░░░░██╔══██║██╔══██╗
██║██║░╚███║██████╔╝░░░██║░░░██║░░██║███████╗██║░░██║██║░░██║
╚═╝╚═╝░░╚══╝╚═════╝░░░░╚═╝░░░╚═╝░░╚═╝╚══════╝╚═╝░░╚═╝╚═╝░░╚═╝

------------------------------------------------------
1 ~[- Instalar YASB waybar] ~ (Mejores temas, interactivad)
		\_;-> winget install --id AmN.yasb

----......
2 ~[- Instalar ZEBAR topbar] ~ (Overline-zebar incluye AUTO TILING
					 y permite scripts .vbs.. but meh)
					 
		\_;-> https://github.com/glzr-io/zebar/releases

......----
3 ~[- Instalar glazeWM]
		\_;-> winget install GlazeWM
		
PD: Error de principiante, era mejor consultar la documentacion en: 
https://github.com/glzr-io/glazewm/blob/main/README.md
## Clic a Y (MuMu / Wild Rift)

Paquete: https://github.com/dizzi1222/Y-Click-setup

* Instalar: doble clic en `INSTALAR.cmd` (o `install.ps1`).
* Copia AutoHotkey portable + scripts a `%USERPROFILE%\Tools\AutoHotkey`
  y crea los 2 .lnk: *Clic a Y* y *Detener Clic a Y*.
* Autostart: `HKCU\...\Run\Clic-a-Y-MuMu` ->
  `AutoHotkey64.exe "...\mumu-toggle-y-click.ahk" --hotkey`
* Atajos: **Ctrl+Y** y **Alt+Y** encienden/apagan el mapeo.
  Invisible: sin ventana ni icono de bandeja.
* No mapear esto en PowerToys *Start App*: detecta `AutoHotkey64.exe`
  en ejecucion y abre ventana en vez de alternar.
* Requisito: raton en modo **diestro** (Panel de control > Mouse).
