# A2 — Validación operativa del alcance de red

**Rama:** `security-hardening`  
**Fecha de revisión:** 2026-11-03  
**Estado:** revisión estática completada; validación operativa pendiente.  
**Alcance:** Launcher Desktop + backend Go. No modifica Android/POS ni reglas de negocio.

## 1. Resultado de la revisión estática

Se revisaron los siguientes puntos de la implementación:

- `cmd/abacophy/main.go`: `LOCAL` resuelve por defecto a `127.0.0.1`; `LAN` requiere modo explícito y admite IP de interfaz o wildcard; `PRODUCTION` requiere host explícito.
- `launcher/shared/.../GoProcessLauncher.kt`: el Launcher sobrescribe explícitamente `ABACOPHY_BIND_MODE` y `ABACOPHY_HOST` para el proceso hijo. En LOCAL envía `127.0.0.1`; en LAN envía `0.0.0.0`. También establece `PORT`, `ABACOPHY_DATA` y `ABACOPHY_STATIC`.
- `launcher/desktopApp/.../main.kt`: LOCAL/LAN se persiste en las preferencias del Launcher; instalaciones sin preferencia usan LOCAL y valores desconocidos se normalizan a LOCAL.
- `OrchestratorUseCase.kt`: mDNS solo se consulta/anuncia cuando el scope es LAN.

**Conclusión estática:** la selección del Launcher llega al backend y el valor LOCAL no depende de variables de entorno heredadas. La implementación cubre el comportamiento previsto en código; esto no demuestra conectividad real entre equipos ni reglas de firewall.

## 2. Advertencia de seguridad: alcance real de LAN

El Launcher configura LAN con `ABACOPHY_HOST=0.0.0.0`. Esto hace que el backend escuche en todas las interfaces IPv4 disponibles, no exclusivamente en una interfaz Wi-Fi/Ethernet privada. La opción LAN no configura automáticamente el firewall del sistema.

Por tanto:

- No habilitar LAN en redes públicas o no confiables.
- Antes de habilitar LAN, permitir el puerto del backend solo desde la subred privada confiable mediante el firewall del sistema.
- No publicar ni redirigir ese puerto desde el router hacia Internet.
- La presencia de mDNS no constituye control de acceso ni sustituye autenticación, firewall o TLS.

Este comportamiento debe mantenerse visible en la documentación y en la interfaz del Launcher hasta que exista selección explícita de interfaz o un mecanismo de bind más restrictivo.

## 3. Prueba operativa LOCAL

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

## 4. Prueba operativa LAN

Realizarla únicamente en una red privada confiable y con firewall restrictivo.

1. Configurar en el firewall una regla de entrada para el puerto del backend limitada a la subred privada de prueba.
2. En el Launcher seleccionar **LAN**, guardar y reiniciar el backend.
3. Confirmar:
   - `EVENT=server.start bind_mode="LAN" host="0.0.0.0"`
   - `EVENT=http.listening bind="0.0.0.0:<PUERTO>"`
   - `EVENT=discovery.advertised` o un evento explícito de fallo mDNS.
4. Desde otro equipo de la misma subred:
   - Windows: `Test-NetConnection <IP_DEL_SERVIDOR> -Port <PUERTO>`
   - Linux/macOS: `nc -vz <IP_DEL_SERVIDOR> <PUERTO>`
   - Abrir `http://<IP_DEL_SERVIDOR>:<PUERTO>/api/v1/health`.
5. Verificar que la aplicación web carga y que las operaciones protegidas siguen exigiendo autenticación.
6. Confirmar que el Launcher registra `CLIENT_CONNECTED` al recibir una petición API desde el equipo remoto.
7. Comprobar que el puerto no es accesible desde interfaces/redes que no formen parte de la subred autorizada. Si lo es, corregir firewall antes de aceptar LAN.

## 5. Persistencia y recuperación

- Cerrar y abrir el Launcher: debe conservar el último scope seleccionado.
- Una instalación nueva o una preferencia ausente/corrupta debe iniciar en LOCAL.
- Seleccionar LOCAL después de LAN y reiniciar: debe volver a escuchar solo en loopback y dejar de anunciar mDNS.
- Detener el Launcher: el proceso Go debe terminar y liberar el puerto.

## 6. Evidencias que deben adjuntarse al cierre de A2

| Evidencia | Resultado |
|---|---|
| Log de arranque LOCAL con bind loopback | Pendiente |
| Health local correcto | Pendiente |
| Fallo de conexión remota en LOCAL | Pendiente |
| Log de arranque LAN con bind esperado | Pendiente |
| Health y web accesibles desde segundo equipo LAN | Pendiente |
| Firewall limita el puerto a la subred confiable | Pendiente |
| mDNS solo activo en LAN | Pendiente |
| Preferencia LOCAL/LAN persiste | Pendiente |
| Proceso termina y libera el puerto | Pendiente |

## 7. Criterio de cierre

A2 solo se marcará como validado cuando todas las evidencias anteriores estén verificadas en una instalación real. La revisión estática y los tests unitarios de resolución de configuración no sustituyen la prueba de red entre dos equipos.

**No aumentar la puntuación global de hardening por esta revisión estática.** Mantener 55/100 hasta cerrar la validación operativa y las tareas pendientes de A1.
