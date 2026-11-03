# Diagnóstico de descubrimiento AbacoPhy

Esta guía permite separar los fallos del anuncio mDNS, Android NSD y la validación HTTP.

## 1. Regenerar el backend Go para Windows

Desde la raíz del repositorio, después de actualizar la rama:

```powershell
.\launcher\scripts\build-runtime.ps1
```

El ejecutable que utiliza el Launcher queda en `launcher/runtime/bin/abacophy.exe`. El Launcher no recompila Go por sí mismo al arrancar: debe regenerarse el runtime tras modificar el backend.

## 2. Ejecutar el Launcher con el backend actualizado

```powershell
cd launcher
.\gradlew.bat :desktopApp:run
```

La consola del Launcher recoge stdout/stderr del proceso Go y los eventos del orquestador. El botón **Copiar logs** copia la consola completa. También se persisten en:

```text
%USERPROFILE%\.abacophy\data\launcher.log
```

Si se define `ABACOPHY_DATA`, el archivo queda dentro de ese directorio de datos.

Eventos clave del backend:
- `EVENT=http.listening`: el servidor HTTP abrió el puerto.
- `EVENT=network.interface_up`: interfaz/IP LAN detectada.
- `EVENT=discovery.register_start`: empezó el registro mDNS.
- `EVENT=discovery.advertised`: el registro mDNS se completó.
- `EVENT=discovery.register_failed` o `EVENT=discovery.disabled`: mDNS no quedó anunciado.
- `EVENT=http.request` y `CLIENT_CONNECTED`: una solicitud llegó al backend desde un cliente.

## 3. Regenerar e instalar el APK

Desde la raíz del repositorio:

```powershell
cd posapps
.\gradlew.bat :androidApp:installDebug
```

No basta con reiniciar un APK antiguo: hay que instalar la versión recompilada que contiene los nuevos logs.

## 4. Filtrar Logcat

Con el teléfono conectado por ADB:

```powershell
adb logcat -c
adb logcat -s AbacoPhy-Discovery:I AbacoPhy-Setup:I AbacoPhy-Probe:I
```

Significado de los tags:
- `AbacoPhy-Discovery`: callbacks NSD, servicios encontrados/resueltos y errores de inicio/parada.
- `AbacoPhy-Setup`: flujo de búsqueda y número de candidatos.
- `AbacoPhy-Probe`: resultado de `/api/v1/info` y compatibilidad de la API.

Interpretación rápida:
- `DISCOVERY_START` sin `DISCOVERY_CALLBACK_STARTED`: el escaneo no llegó a arrancar correctamente.
- `DISCOVERY_CALLBACK_STARTED` y `DISCOVERY_FINISHED candidates=0`: Android inició NSD pero no encontró/resolvió servicios durante la ventana.
- `SERVICE_RESOLVED` seguido de `HTTP_PROBE_EXCEPTION`: mDNS funciona; falla la conectividad HTTP o la validación.
- `HTTP_PROBE_OK`: descubrimiento y validación completados.

## 5. Separar mDNS de conectividad IP

En el teléfono, abrir la dirección LAN que imprime el Launcher, añadiendo `/api/v1/info`, por ejemplo:

`http://192.168.x.x:8090/api/v1/info`

Si responde JSON, la conectividad TCP/IP funciona aunque el descubrimiento mDNS no aparezca. Si no responde, revisar IP de la interfaz, puerto, firewall de Windows y aislamiento de clientes del hotspot.
