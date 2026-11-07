# A2 — Validación operativa del alcance de red

**Rama:** `security-hardening`  
**Fecha de revisión:** 2026-11-07  
**Estado:** selección explícita de interfaz integrada y CI actual verificado; ejecución del Launcher empaquetado y validación entre equipos no realizadas en esta revisión. A2 continúa abierto.  
**Alcance:** Launcher Desktop + backend Go. No modifica Android/POS ni reglas de negocio.

## 1. Resultado de la revisión estática

Se revisaron los siguientes puntos de la implementación:

- `cmd/abacophy/main.go`: `LOCAL` resuelve por defecto a `127.0.0.1`; `LAN` requiere modo explícito. En el flujo del Launcher se usa la IPv4 exacta seleccionada; el backend conserva soporte wildcard para configuraciones directas fuera de ese flujo. `PRODUCTION` requiere host explícito.
- `launcher/shared/.../GoProcessLauncher.kt`: el Launcher sobrescribe explícitamente `ABACOPHY_BIND_MODE` y `ABACOPHY_HOST`. En LOCAL envía `127.0.0.1`; en LAN envía la IPv4 privada actual de la interfaz seleccionada como `ABACOPHY_HOST` y `ABACOPHY_LAN_INTERFACE_IP`.
- `launcher/desktopApp/.../main.kt`: LOCAL/LAN se persiste en las preferencias del Launcher; instalaciones sin preferencia usan LOCAL y valores desconocidos se normalizan a LOCAL.
- `OrchestratorUseCase.kt`: mDNS solo se consulta/anuncia cuando el scope es LAN.

**Conclusión estática:** la selección del Launcher llega al backend y el valor LOCAL no depende de variables de entorno heredadas. `SystemLanInterfaceResolver` enumera adaptadores activos con IPv4 privada y excluye nombres asociados a VPN/ProtonVPN, WireGuard, túneles y adaptadores virtuales. El nombre del adaptador se persiste y su IP se vuelve a resolver al iniciar. El código limita HTTP a la IP elegida más loopback y mDNS a la interfaz propietaria de esa IP. Esto es evidencia de revisión estática, no de ejecución real en Windows ni de conectividad entre equipos.

## 2. Advertencia de seguridad: alcance real de LAN

El Launcher configura LAN con la IPv4 privada de una interfaz elegida en su selector. El backend escucha en esa dirección y en loopback, y limita el anuncio mDNS a la interfaz propietaria de la IP. La opción LAN no configura automáticamente el firewall del sistema.

Por tanto:

- No habilitar LAN en redes públicas o no confiables.
- Antes de habilitar LAN, permitir el puerto del backend solo desde la subred privada confiable mediante el firewall del sistema.
- No publicar ni redirigir ese puerto desde el router hacia Internet.
- La presencia de mDNS no constituye control de acceso ni sustituye autenticación, firewall o TLS.

El bind por interfaz reduce la exposición accidental, pero no sustituye el firewall ni controles de acceso. No habilitar LAN en redes públicas o no confiables.

## 3. Evidencia operativa histórica recibida — 2026-11-06

**Importante:** los siguientes logs pertenecen a la ejecución anterior a la integración del selector de interfaz. Documentan el problema original (`0.0.0.0` / `[::]` y anuncio por varias interfaces); no describen el comportamiento del HEAD actual.

La ejecución real del Launcher en Windows aportó esta evidencia:

```text
Scope de red=LAN
PORT=60565
EVENT=server.start host="0.0.0.0" port_setting="60565" bind="0.0.0.0:60565"
EVENT=http.listening bind="[::]:60565" actual_port=60565
EVENT=network.interface_up interface="ProtonVPN" ip="10.2.0.2"
EVENT=network.interface_up interface="Wi-Fi" ip="10.214.5.177"
EVENT=discovery.advertised service=_abacophy._tcp domain=local. port=60565
```

El proceso fue identificado como el backend empaquetado `abacophy.exe` bajo `launcher/desktopApp/build/compose/tmp/prepareAppResources/backend/bin/`.

### Interpretación

- El Launcher seleccionó y comunicó correctamente el scope `LAN`; no es una ejecución LOCAL.
- El backend recibió `0.0.0.0` como host solicitado, mientras que el socket efectivo fue registrado como `[::]:60565`.
- Las pruebas locales previas contra `127.0.0.1:60565` y `::1:60565` tuvieron éxito. Esto es compatible con un socket IPv6 wildcard que acepta IPv4 en este Windows; no demuestra por sí solo accesibilidad desde Internet.
- El Launcher detectó y anunció Wi-Fi (`10.214.5.177`) y ProtonVPN (`10.2.0.2`). La interfaz VPN no debe considerarse automáticamente una interfaz LAN confiable ni anunciarse como tal sin una política explícita.
- Los perfiles Domain, Private y Public de Windows Defender Firewall están desactivados por decisión del administrador. No se encontró una regla Allow habilitada específica para `60565`. Esta es una condición deliberada del entorno de prueba; el proyecto no debe cambiarla ni pedir que se active para continuar el desarrollo.
- Al estar desactivado el firewall del host, esta ejecución no acredita aislamiento por firewall ni permite validar el bloqueo de interfaces no autorizadas. Tampoco demuestra que el puerto sea accesible desde Internet.

### Hallazgos de implementación

| ID | Hallazgo | Estado |
|---|---|---|
| A2-E01 | El Launcher pasa LAN y el backend registra host solicitado `0.0.0.0` | Confirmado |
| A2-E02 | Listener efectivo registrado como `[::]:60565` con `net.Listen("tcp", ...)` | Causa identificada; corregido mediante selección explícita `tcp4`/`tcp6`; falta CI y prueba empaquetada |
| A2-E03 | La detección/impresión de direcciones incluye ProtonVPN | Causa corregida en código: Launcher exige una IPv4 explícita; validación empaquetada pendiente |
| A2-E04 | Firewall de Windows desactivado intencionalmente | Condición del entorno; no modificar |
| A2-E05 | Acceso desde un segundo equipo en LAN | Pendiente |
| A2-E06 | Modo LOCAL probado en la instalación empaquetada | Pendiente |
| A2-E07 | Selector Launcher, persistencia del adaptador y resolución DHCP | Integrado en código; prueba empaquetada pendiente |

### Implementación posterior a la evidencia

**Completado en código:** `cmd/abacophy/main.go` selecciona explícitamente `tcp4` para hosts IPv4 y `tcp6` para IPv6; se registra `EVENT=http.listen_config`. Además, el backend ya admite `ABACOPHY_LAN_INTERFACE_IP`: valida que sea una IPv4 asignada a una interfaz activa, exige que coincida con `ABACOPHY_HOST`, limita la escucha HTTP a esa IP y usa `AdvertiseOnInterface` para publicar mDNS únicamente por la interfaz propietaria de esa IP. La API de mDNS usa `RegisterProxy` para anunciar solo la dirección seleccionada. La integración de la selección de interfaz en la UI/preferencias del Launcher queda completada en esta revisión. CI Go, CI Launcher Desktop y CI Docker Image finalizaron correctamente para el commit de código `4988114`. La validación operativa con el binario empaquetado y dos equipos sigue pendiente.

**Implementación integrada; validación operativa pendiente:**
1. Launcher enumera interfaces IPv4 privadas activas y presenta un selector con nombre del adaptador e IP informativa; el usuario no escribe direcciones IP.
2. Se persiste el nombre del adaptador, no la IP. En cada inicio se vuelve a resolver su dirección actual para tolerar cambios DHCP.
3. HTTP escucha en la IP seleccionada y, simultáneamente, en `127.0.0.1`; no usa `0.0.0.0` en el flujo normal del Launcher. mDNS se limita a la interfaz propietaria de la IP seleccionada.
4. AbacoPOS no configura interfaces: descubre el servicio mDNS y se conecta.
5. Probar LOCAL con el Launcher empaquetado y confirmar loopback estricto y mDNS desactivado.
6. Probar LAN desde un segundo equipo y comprobar que no se anuncia ni acepta tráfico por interfaces no seleccionadas. Registrar por separado el estado del firewall del entorno.

La activación del firewall del equipo del usuario no forma parte de este plan ni está autorizada por esta validación. En instalaciones de terceros, la restricción del puerto mediante firewall sigue siendo un requisito de despliegue cuando se use LAN.
## 4. Prueba operativa LOCAL

1. En el Launcher seleccionar **LOCAL** y guardar la preferencia.
2. Iniciar AbacoPhy.
3. Confirmar en la consola/log del backend:
   - `EVENT=server.start bind_mode="LOCAL" host="127.0.0.1"`
   - `EVENT=http.listening bind="127.0.0.1:<PUERTO>"`
   - `EVENT=discovery.disabled` con razón `local_only_bind`.
4. En el mismo equipo abrir `http://127.0.0.1:<PUERTO>/api/v1/health`; debe responder correctamente.
5. Desde otro equipo de la misma LAN ejecutar:
   - Windows: `Test-NetConnection <IP_DEL_SERVIDOR> -Port <PUERTO>`
   - Linux/macOS: `nc -vz <IP_DEL_SERVIDOR> <PUERTO>`
6. La conexión desde el segundo equipo debe fallar. Si tiene éxito, A2 no supera la prueba LOCAL.

## 5. Prueba operativa LAN

Realizarla únicamente en una red privada confiable y aislada. No cambiar el Firewall de Windows del equipo de prueba: registrar el estado que exista. Si no está restrictivo, la prueba de conectividad no acredita aislamiento por firewall; ese control queda como requisito de despliegue para instalaciones de terceros.

1. En el Launcher seleccionar **LAN**, elegir la interfaz por su nombre (Ethernet/Wi-Fi) y guardar. La IPv4 aparece como información; no se introduce manualmente.
2. Reiniciar el backend.
3. Confirmar:
   - `EVENT=server.start bind_mode="LAN" host="<IP_LAN_SELECCIONADA>"`
   - `EVENT=http.listening bind="<IP_LAN_SELECCIONADA>:<PUERTO>"`
   - `EVENT=http.listening bind="127.0.0.1:<PUERTO>"`
   - `EVENT=network.interface_selected ip="<IP_LAN_SELECCIONADA>"`
   - `EVENT=discovery.advertised` o un evento explícito de fallo mDNS.
4. Desde otro equipo de la misma subred:
   - Windows: `Test-NetConnection <IP_DEL_SERVIDOR> -Port <PUERTO>`
   - Linux/macOS: `nc -vz <IP_DEL_SERVIDOR> <PUERTO>`
   - Abrir `http://<IP_DEL_SERVIDOR>:<PUERTO>/api/v1/health`.
5. Verificar que la aplicación web carga y que las operaciones protegidas siguen exigiendo autenticación.
6. Confirmar que el Launcher registra `CLIENT_CONNECTED` al recibir una petición API desde el equipo remoto.
7. Registrar qué interfaces adicionales existen y comprobar el alcance real del bind. No modificar el firewall durante esta validación. Si no puede demostrarse el filtrado de otras redes, dejar explícitamente pendiente la restricción por firewall para el despliegue.

## 6. Persistencia y recuperación

- Cerrar y abrir el Launcher: debe conservar el último scope seleccionado.
- Una instalación nueva o una preferencia ausente/corrupta debe iniciar en LOCAL.
- Seleccionar LOCAL después de LAN y reiniciar: debe volver a escuchar solo en loopback y dejar de anunciar mDNS.
- Detener el Launcher: el proceso Go debe terminar y liberar el puerto.

## 7. Evidencias que deben adjuntarse al cierre de A2

| Evidencia | Resultado |
|---|---|
| Log de arranque LOCAL con bind loopback | Pendiente |
| Health local correcto | Pendiente |
| Fallo de conexión remota en LOCAL | Pendiente |
| Log de arranque LAN con bind IPv4 explícito en la IP elegida y loopback (`<IP_LAN>:<PUERTO>`, `127.0.0.1:<PUERTO>`) | CI Go/Launcher/Docker correcto; prueba empaquetada pendiente |
| Health y web accesibles desde segundo equipo LAN | Pendiente |
| Firewall limita el puerto a la subred confiable | No comprobado. Último estado reportado para el equipo Windows: perfiles Domain/Private/Public desactivados intencionalmente el 2026-11-06; no se revalidó en esta ejecución. No modificarlo. Requisito de despliegue externo |
| mDNS solo activo en LAN | Pendiente |
| Preferencia LOCAL/LAN e interfaz seleccionada persisten | Pendiente |
| Proceso termina y libera el puerto | Pendiente |

## 8. Criterio de cierre

A2 solo se marcará como validado cuando todas las evidencias anteriores estén verificadas en una instalación real. La revisión estática y los tests unitarios de resolución de configuración no sustituyen la prueba de red entre dos equipos.

**No aumentar la puntuación global de hardening por esta evidencia parcial.** Mantener 55/100 hasta cerrar las pruebas operativas aplicables y las tareas pendientes de A1. El firewall desactivado se registra como condición del entorno de prueba; no se modifica. La protección mediante firewall continúa siendo un requisito para desplegar LAN en equipos de terceros.


## 9. Verificación CI de Launcher — 2026-11-06

**Commit verificado:** `e8fc28aa593e03049df164243f3109880be7ffe6`  
**Workflow:** [CI Launcher Desktop](https://github.com/yecharlot/AbacoPhy/actions/runs/42245015081)  
**Resultado:** `success`.

Pasos ejecutados por GitHub Actions en Ubuntu + JDK 21:

| Paso | Resultado |
|---|---|
| `:shared:jvmTest` — pruebas JVM del Launcher | Correcto |
| `:desktopApp:compileKotlin` — compilación Desktop | Correcto |

La verificación confirma que las pruebas JVM existentes pasan y que el Launcher Desktop compila en el entorno CI. No acredita la enumeración de adaptadores de una máquina Windows concreta, la selección real de Wi-Fi/Ethernet, la conectividad desde un segundo equipo ni el comportamiento del firewall.

### Estado técnico confirmado en la rama

- El selector de interfaz está en Launcher; presenta el nombre del adaptador y su IPv4 como dato informativo.
- Se persiste el nombre del adaptador. La dirección se vuelve a resolver al iniciar para evitar reutilizar una IP DHCP antigua.
- El backend recibe `ABACOPHY_HOST` y `ABACOPHY_LAN_INTERFACE_IP` con la IP elegida.
- En modo LAN, HTTP escucha en la IP seleccionada y en loopback; mDNS se registra mediante `AdvertiseOnInterface` para la interfaz propietaria de esa IPv4.
- AbacoPOS no participa en la selección de interfaz: su responsabilidad es descubrir el servicio y conectarse.

**Criterio pendiente:** realizar las pruebas operativas LOCAL/LAN descritas en las secciones 4–7 con el Launcher empaquetado y, para LAN, un segundo dispositivo. No cambiar la configuración del firewall del equipo de prueba sin autorización explícita.


## 10. Revisión de ejecución y CI — 2026-11-07

### Resultado de esta ejecución

No se pudo ejecutar el Launcher Desktop empaquetado ni interactuar con el equipo Windows del usuario desde este entorno. Tampoco hay acceso al segundo dispositivo de la LAN. No se obtuvieron logs nuevos de arranque LOCAL/LAN, no se comprobó la IP Wi-Fi vigente y no se realizó una prueba HTTP/mDNS en la red física. Por tanto, **ninguna prueba operativa solicitada en esta revisión se marca como completada**.

La revisión del workflow confirma que CI Launcher Desktop se ejecuta en `ubuntu-latest` y ejecuta `:shared:jvmTest` y `:desktopApp:compileKotlin`; no construye ni adjunta un instalador/binario empaquetado. La consulta de artefactos de esa ejecución devolvió una lista vacía. CI no sustituye la ejecución en Windows.

### CI verificado en HEAD

**Rama:** `security-hardening`  
**Commit HEAD:** `0fb9c5d415db088b73f5050a7f81f71b6306640c`

| Workflow | Ejecución | Resultado | Alcance confirmado |
|---|---|---|---|
| CI Go | [42329339328](https://github.com/yecharlot/AbacoPhy/actions/runs/42329339328) | `success` | Job Go del commit HEAD |
| CI Launcher Desktop | [42329339650](https://github.com/yecharlot/AbacoPhy/actions/runs/42329339650) | `success` | `:shared:jvmTest` y `:desktopApp:compileKotlin` en Ubuntu + JDK 21 |
| CI Docker Image | [42329339911](https://github.com/yecharlot/AbacoPhy/actions/runs/42329339911) | `success` | Build de imagen Docker del commit HEAD |

### Evidencia estática actualizada

- El selector persiste el nombre del adaptador (`lanInterfaceName`), no una IP DHCP; la IP se vuelve a resolver al iniciar.
- El enumerador excluye adaptadores cuyos nombres contienen `vpn`, `proton`, `wireguard`, `tun`, `tap` y otros indicadores de túneles/virtualización.
- LAN entrega la misma IPv4 seleccionada a `ABACOPHY_HOST` y `ABACOPHY_LAN_INTERFACE_IP`; LOCAL fuerza `127.0.0.1` y elimina la variable LAN.
- El backend usa la familia TCP correspondiente; en LAN con interfaz seleccionada crea listeners para la IPv4 elegida y `127.0.0.1`. mDNS se registra en la interfaz propietaria de la IPv4 seleccionada.
- En LOCAL, el backend no entra en el flujo de registro mDNS y emite `EVENT=discovery.disabled`.

### Pendiente para continuar

1. Ejecutar el Launcher empaquetado en Windows con la versión correspondiente al HEAD validado.
2. En LAN, elegir explícitamente Wi-Fi de la lista y registrar nombre/IP vigentes; comprobar los dos binds y el anuncio mDNS exclusivo de esa interfaz, sin ProtonVPN.
3. Probar health y carga web desde un segundo dispositivo de la misma red.
4. En LOCAL, comprobar bind exclusivo a loopback, health local correcto y ausencia de anuncio mDNS; confirmar que el segundo dispositivo no conecta.
5. Registrar el estado del Firewall de Windows como condición del entorno, sin modificarlo ni solicitar cambios.
6. Adjuntar logs completos y resultados antes de cerrar A2.

**Estado final de esta revisión:** CI y revisión estática correctos; ejecución empaquetada, LOCAL/LAN, mDNS real y prueba entre equipos pendientes. A2 no se cierra y la puntuación de hardening no aumenta.
