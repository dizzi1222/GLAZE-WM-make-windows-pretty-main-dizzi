# autostart-glaze-admin
# SOLO EJECUTAR 1 VEZ.


#~ Manualmente [Windows + R > pwsh]
#Start-Process "glazewm.exe" -Verb RunAs   


# 1. Primero eliminar el acceso directo actual del Startup
Remove-Item "C:\Users\Diego\AppData\Roaming\Microsoft\Windows\Start Menu\Programs\Startup\glazewm.exe.lnk" -ErrorAction SilentlyContinue

# 2. Crear la tarea programada
$action = New-ScheduledTaskAction -Execute "C:\Program Files\glzr.io\GlazeWM\glazewm.exe"
$trigger = New-ScheduledTaskTrigger -AtLogon
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
$principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest

Register-ScheduledTask -TaskName "GlazeWM" -Action $action -Trigger $trigger -Settings $settings -Principal $principal

# 3. Verificar
Get-ScheduledTask -TaskName "GlazeWM"
