import asyncio
import websockets
import json
import subprocess
import time

async def try_connect(ports):
    for port in ports:
        try:
            uri = f"ws://localhost:{port}"
            print(f"🔍 Intentando conectar a {uri}...")
            websocket = await asyncio.wait_for(
                websockets.connect(uri), 
                timeout=3
            )
            print(f"✅ Conectado al puerto {port}")
            return websocket
        except Exception as e:
            print(f"❌ Puerto {port} falló: {e}")
            continue
    return None

async def send_glazewm_command(*args):
    """Envía un comando a GlazeWM usando la sintaxis correcta"""
    try:
        command_list = ["glazewm", "command"] + list(args)
        print(f"📝 Ejecutando: {' '.join(command_list)}")
        
        result = subprocess.run(
            command_list,
            capture_output=True,
            text=True,
            timeout=5
        )
        if result.returncode == 0:
            print(f"✅ Comando ejecutado: {' '.join(args)}")
            return True
        else:
            print(f"❌ Error en comando {' '.join(args)}: {result.stderr}")
            return False
    except Exception as e:
        print(f"💥 Error ejecutando comando {' '.join(args)}: {e}")
        return False

async def hybrid_auto_tiling_logic(websocket):
    """
    Lógica híbrida que funciona en ambos modos:
    - En floating: monitorea y permite cambiar a tiling con Alt+T
    - En tiling: aplica auto-tiling VERTICAL (ventanas apiladas por debajo)
    """
    try:
        await websocket.send("sub -e window_managed")
        await websocket.send("sub -e window_focused")
        print("🎯 Modo híbrido activado (floating + tiling vertical)")
        
        # Estado para tracking
        tiling_windows_count = 0
        workspace_windows = {}  # Track ventanas por workspace
        
        while True:
            response = await websocket.recv()
            json_response = json.loads(response)
            
            try:
                event_type = json_response["type"]
                
                if event_type == "window_managed":
                    window_data = json_response["data"]["managedWindow"]
                    
                    # Verificar si la ventana está en modo tiling
                    is_tiling = window_data.get("tilingSize") is not None
                    
                    if is_tiling:
                        # LÓGICA DE AUTO-TILING VERTICAL (apilado por debajo)
                        tiling_windows_count += 1
                        
                        print(f"📐 Ventana en tiling #{tiling_windows_count}")
                        
                        # Forzar dirección VERTICAL para que se apilen por debajo
                        await asyncio.sleep(0.1)
                        
                        # Si es la primera ventana, asegurar dirección vertical
                        if tiling_windows_count == 1:
                            # Asegurar que la primera ventana ocupe un buen espacio
                            await send_glazewm_command("resize", "--height", "60%")
                            print("📏 Primera ventana ajustada al 60%")
                        
                        # Para ventanas adicionales, mantener dirección vertical
                        elif tiling_windows_count >= 2:
                            # Verificar dirección actual y forzar vertical si es necesario
                            await send_glazewm_command("toggle-tiling-direction")
                            await asyncio.sleep(0.05)
                            await send_glazewm_command("toggle-tiling-direction")  # Doble toggle para asegurar vertical
                            print("⬇️  Manteniendo dirección vertical (apilado)")
                            
                            # Ajustar tamaños progresivamente
                            if tiling_windows_count == 2:
                                await send_glazewm_command("resize", "--height", "40%")
                            elif tiling_windows_count == 3:
                                await send_glazewm_command("resize", "--height", "30%")
                    
                    else:
                        # VENTANA EN FLOATING - Aplicar reglas inteligentes
                        window_class = window_data.get("class", "").lower()
                        window_title = window_data.get("title", "").lower()
                        
                        print(f"🪟 Ventana floating: {window_class}")
                        
                        # Auto-centrar ventanas flotantes nuevas
                        await asyncio.sleep(0.3)
                        await send_glazewm_command("center-window")
                        
                        # Ajustar tamaño según tipo de aplicación
                        if any(term in window_class for term in ["terminal", "wt.exe", "windows.terminal", "cmd"]):
                            await send_glazewm_command("resize", "--width", "85%", "--height", "75%")
                        elif any(browser in window_class for browser in ["chrome", "firefox", "msedge"]):
                            await send_glazewm_command("resize", "--width", "90%", "--height", "85%")
                
                elif event_type == "window_focused":
                    # Track cuando cambia el foco
                    focused_window = json_response["data"].get("focusedWindow", {})
                    
                    # Reset counter si no hay ventanas tileadas
                    if focused_window and focused_window.get("tilingSize") is None:
                        tiling_windows_count = 0
                        print("🔄 Contador de tiling reseteado")
                        
            except KeyError as e:
                # Ignorar errores de keys que no son críticos
                if "'type'" not in str(e) and "'data'" not in str(e):
                    print(f"⚠️ KeyError: {e}")
            except Exception as e:
                print(f"⚠️ Error procesando evento: {e}")
                
    except websockets.exceptions.ConnectionClosed:
        print("🔌 Conexión cerrada. Reintentando en 5 segundos...")
        await asyncio.sleep(5)
        return False
    return True

async def vertical_tiling_manager(websocket):
    """
    Gestor especializado en tiling VERTICAL (ventanas apiladas por debajo)
    """
    try:
        await websocket.send("sub -e window_managed")
        await websocket.send("sub -e window_focused")
        await websocket.send("sub -e window_unmanaged")  # Para detectar cierre de ventanas
        
        print("⬇️  Gestor de tiling vertical activado")
        
        tiling_windows = []  # Lista de ventanas tileadas
        current_workspace = "1"
        
        while True:
            response = await websocket.recv()
            json_response = json.loads(response)
            
            try:
                event_type = json_response["type"]
                
                if event_type == "window_managed":
                    window_data = json_response["data"]["managedWindow"]
                    window_id = window_data.get("id")
                    is_tiling = window_data.get("tilingSize") is not None
                    
                    if is_tiling and window_id not in tiling_windows:
                        # NUEVA VENTANA EN TILING - Aplicar layout vertical
                        tiling_windows.append(window_id)
                        print(f"📥 Ventana #{len(tiling_windows)} añadida al tiling vertical")
                        
                        await apply_vertical_layout(websocket, len(tiling_windows))
                        
                elif event_type == "window_unmanaged":
                    # Ventana cerrada - remover de la lista
                    window_data = json_response["data"].get("unmanagedWindow", {})
                    window_id = window_data.get("id")
                    
                    if window_id in tiling_windows:
                        tiling_windows.remove(window_id)
                        print(f"📤 Ventana removida. Total: {len(tiling_windows)}")
                        
                        # Re-aplicar layout a ventanas restantes
                        if tiling_windows:
                            await apply_vertical_layout(websocket, len(tiling_windows))
                
                elif event_type == "window_focused":
                    # Track workspace actual
                    focused_window = json_response["data"].get("focusedWindow", {})
                    if focused_window:
                        workspace = focused_window.get("workspace", "1")
                        if workspace != current_workspace:
                            current_workspace = workspace
                            tiling_windows.clear()  # Reset para nuevo workspace
                            print(f"🔄 Cambio a workspace {workspace}, contador reseteado")
                        
            except KeyError:
                pass
            except Exception as e:
                print(f"⚠️ Error en vertical manager: {e}")
                
    except websockets.exceptions.ConnectionClosed:
        print("🔌 Conexión cerrada. Reintentando...")
        await asyncio.sleep(5)
        return False
    return True

async def apply_vertical_layout(websocket, window_count):
    """Aplica layout vertical con tamaños proporcionales"""
    print(f"📐 Aplicando layout vertical para {window_count} ventanas")
    
    # Forzar dirección vertical
    await send_glazewm_command("toggle-tiling-direction")
    await asyncio.sleep(0.05)
    
    # Ajustar tamaños basado en cantidad de ventanas
    if window_count == 1:
        await send_glazewm_command("resize", "--height", "70%")
    elif window_count == 2:
        # Primera ventana 60%, segunda 40%
        await send_glazewm_command("resize", "--height", "60%")
        await asyncio.sleep(0.1)
        await send_glazewm_command("focus", "--direction", "down")
        await send_glazewm_command("resize", "--height", "40%")
    elif window_count >= 3:
        # Distribución más equitativa
        height_percent = max(30, 100 // window_count)
        await send_glazewm_command("resize", "--height", f"{height_percent}%")
        
    print(f"✅ Layout vertical aplicado: {window_count} ventanas apiladas")

async def smart_floating_manager(window_data):
    """Maneja ventanas en modo floating con posicionamiento inteligente"""
    window_class = window_data.get("class", "").lower()
    
    # Esperar a que la ventana esté completamente cargada
    await asyncio.sleep(0.3)
    
    # Centrar siempre
    await send_glazewm_command("center-window")
    
    # Tamaños inteligentes por tipo de aplicación
    app_sizes = {
        "terminal": ("80%", "70%"),
        "browser": ("90%", "85%"), 
        "code": ("85%", "80%"),
        "filemanager": ("75%", "70%"),
        "default": ("80%", "75%")
    }
    
    app_type = "default"
    if any(term in window_class for term in ["terminal", "wt", "cmd", "powershell"]):
        app_type = "terminal"
    elif any(browser in window_class for browser in ["chrome", "firefox", "edge", "opera"]):
        app_type = "browser"
    elif any(code in window_class for code in ["code", "vscode", "sublime", "notepad++"]):
        app_type = "code"
    elif any(fm in window_class for fm in ["explorer", "files", "nautilus"]):
        app_type = "filemanager"
    
    width, height = app_sizes[app_type]
    await send_glazewm_command("resize", "--width", width, "--height", height)
    print(f"📐 Ventana {app_type} ajustada a {width} x {height}")

async def main():
    print("🚀 Iniciando gestor híbrido con TILING VERTICAL...")
    
    # Puertos a probar
    ports = [6023, 6123, 6223, 6323]
    
    websocket = await try_connect(ports)
    
    if not websocket:
        print("💥 No se pudo conectar a ningún puerto.")
        return

    try:
        # Esperar estabilización
        print("⏳ Esperando 2 segundos...")
        await asyncio.sleep(2)
        
        # Mover terminal al workspace 9
        print("📦 Moviendo terminal al workspace 9...")
        await send_glazewm_command("move", "--workspace", "9")
        await asyncio.sleep(0.5)
        
        # Enfocar workspace 1
        print("🎯 Enfocando workspace 1...")
        await send_glazewm_command("focus", "--workspace", "1")
        await asyncio.sleep(1)
        
        # Recargar YASB (opcional)
        try:
            subprocess.run(["yasbc", "reload"], capture_output=True, text=True, timeout=10)
            print("✅ YASB recargado")
        except:
            print("⚠️ No se pudo recargar YASB")
        
        print("✅ Configuración completada!")
        print("""
🎮 Modos de operación:
   • Floating: Ventanas centradas y dimensionadas inteligentemente  
   • Tiling (Alt+T): Tiling VERTICAL (ventanas apiladas por debajo)
   • Layout automático y proporcional
        """)
        
        # Ejecutar el gestor VERTICAL (recomendado)
        while True:
            success = await vertical_tiling_manager(websocket)
            # success = await hybrid_auto_tiling_logic(websocket)  # Alternativa
            
            if not success:
                print("🔄 Reconectando...")
                websocket = await try_connect(ports)
                if not websocket:
                    break
                await asyncio.sleep(2)
        
    except Exception as e:
        print(f"💥 Error en main: {e}")
    finally:
        if websocket:
            await websocket.close()
        print("👋 Script terminado")

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n🛑 Script interrumpido por el usuario")