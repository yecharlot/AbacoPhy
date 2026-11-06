# ABACOPHY — PLAN DE IMPLEMENTACIÓN DE HARDENING TÉCNICO

**Versión:** 1.0  
**Fecha:** 2026-11-03  
**Objetivo:** elevar la seguridad técnica de AbacoPhy/AbacoPOS antes de avanzar hacia ISO/IEC 27001 y SOC 2.

## 0. Línea base

**Puntuación inicial: 52/100 — 🟠 Hardening necesario**

**Puntuación actual: 55/100 — 🟠 Hardening en curso.** A1 fue validado operativamente. A2 ya cuenta con evidencia de arranque LAN del Launcher empaquetado: el backend recibe `0.0.0.0`, registra listener efectivo `[::]` y anuncia Wi-Fi y ProtonVPN. Siguen pendientes LOCAL empaquetado, prueba entre equipos y revisión de selección de interfaces. El firewall del equipo de prueba está desactivado intencionalmente y no se modificará como parte de esta tarea; se registra como condición del entorno. A4 admite reglas específicas y, por decisión explícita, el comodín global `*`. El commit `770cbf5e` pasó CI Go, CI Launcher Desktop y CI Docker. Siguen pendientes las pruebas manuales de A4 y la validación de migración A1 sobre datos operativos.

Esta puntuación procede de una revisión estática y de pruebas automatizadas del repositorio. No es una certificación ni un pentest.

### Ajuste del puntaje tras A1

| Dimensión | Línea base | Actual | Motivo |
|---|---:|---:|---|
| Autenticación | 70/100 | 78/100 | Eliminadas claves bootstrap reutilizables; rotación legacy, cambio inicial obligatorio y revocación de sesiones paralelas |
| Seguridad global | 52/100 | 55/100 | A1 validado; A2 implementado parcialmente y pendiente de pruebas operativas, por lo que aún no se acredita aumento de puntuación |

El puntaje es una evaluación interna de hardening, no una certificación. Se volverá a recalcular tras la validación operativa y al cerrar cada hallazgo.

### Prioridades
- [x] Eliminar credenciales administrativas conocidas o impresas (A1 implementado; CI correcto; validación operativa pendiente).
- [x] Definir política segura de bind de red (implementación y pruebas automatizadas en curso; validación de Launcher/operación pendiente).
- [x] Definir el alcance de transporte: LOCAL/LAN; HTTPS público fuera de alcance por decisión del proyecto.
- [x] Sustituir CORS abierto por allowlist configurable (IP, CIDR, dominio exacto y puerto), con excepción explícita `*` para instalaciones que necesiten permitir todos los orígenes; CI correcto, validación manual pendiente.
- [ ] Reducir duración de sesiones.
- [ ] Añadir rate limiting al login.
- [ ] Añadir cabeceras HTTP de seguridad.
- [ ] Endurecer Docker y evitar root.
- [ ] Restringir permisos de datos.
- [ ] Mejorar política de contraseñas.
- [ ] Revisar logs para impedir filtración de secretos.
- [ ] Automatizar análisis de dependencias, vulnerabilidades y secretos.

# 1. Reglas de implementación

- [x] Crear rama `security-hardening`.
- [ ] No modificar Android/POS salvo que una tarea lo indique.
- [ ] No cambiar reglas de negocio durante el hardening.
- [ ] Mantener la arquitectura de permisos existente salvo hallazgo.
- [ ] Hacer commits pequeños y reversibles.
- [ ] Cada cambio de seguridad debe tener una prueba.
- [ ] No guardar secretos en Git.
- [ ] Documentar excepciones aceptadas.

**Regla:** cambio → prueba → revisión → commit → siguiente cambio.

# 2. FASE A — Contención de riesgos altos

## A1. Credenciales de bootstrap
- [x] Localizar credenciales por defecto y rutas de creación de tenants.
- [x] Eliminar contraseñas administrativas visibles en logs/consola.
- [x] Eliminar contraseñas reutilizables del código y documentación activa, incluida la creación de nuevos tenants.
- [x] Diseñar bootstrap de primera ejecución con secretos aleatorios o variables de entorno protegidas.
- [x] Obligar a cambiar la credencial inicial antes de permitir operaciones autenticadas.
- [x] Invalidar las demás sesiones al cambiar la contraseña y eliminar el archivo temporal cuando no queden cuentas pendientes.
- [x] Verificar por pruebas automatizadas el bootstrap nuevo, la rotación legacy y el bloqueo hasta el cambio inicial (CI Go: success).
- [ ] Validar el primer arranque y la migración con un directorio de datos operativo real.
- [x] Añadir pruebas automáticas para bootstrap, rotación, creación de tenants y bloqueo por cambio obligatorio (CI Go: success).
- [x] Validar el frontend forzado de cambio de contraseña (CI Webapp: check, Vitest y build: success).
- [x] Integrar el build web en la imagen Docker y en el empaquetado Windows/Linux del Launcher. CI Docker: success; CI Launcher Desktop: success. La ejecución de los scripts `build-runtime.ps1/.sh` queda pendiente.

**Criterio de cierre:** ninguna credencial administrativa conocida funciona; el primer acceso obliga a cambiarla. Estado actual: implementación y pruebas automatizadas correctas; falta comprobar el flujo en una instancia operativa con datos reales.

**Nota sobre historial:** no se reescribió el historial Git. Los valores expuestos en commits anteriores deben tratarse como comprometidos; la migración invalida las contraseñas activas de los roles `master` y `admin` al iniciar esta versión.

## A2. Bind de red

**Evidencia y validación operativa:** consultar [A2 — Validación operativa del alcance de red](A2_VALIDACION_RED.md). Ya se comprobó el arranque LAN empaquetado: `Scope de red=LAN`, host solicitado `0.0.0.0`, listener registrado `[::]:60565` y detección/anuncio de Wi-Fi y ProtonVPN. Pendientes: revisar la familia/dirección efectiva del listener, filtrar o seleccionar interfaces anunciadas, probar LOCAL empaquetado y completar conectividad entre equipos. El firewall del equipo del usuario está desactivado voluntariamente; no se modificará. La limitación de firewall se conserva como requisito de despliegue LAN para instalaciones de terceros.

**Advertencia:** el Launcher configura LAN con `0.0.0.0`, que escucha en todas las interfaces IPv4. Antes de usar LAN debe limitarse el puerto mediante el firewall a una subred privada confiable; no publicar el puerto en Internet.

- [x] `LOCAL` como modo predeterminado y escucha en `127.0.0.1`.
- [x] `LAN` requiere selección explícita y admite IP de interfaz o wildcard configurado.
- [x] `PRODUCTION` requiere modo y `ABACOPHY_HOST` explícitos; wildcard permitido solo por configuración explícita para contenedores protegidos por la plataforma.
- [x] mDNS solo se anuncia en modo `LAN`.
- [x] Validar/rechazar combinaciones inseguras y modos desconocidos.
- [x] Documentar variables, precedencia de puertos y ejemplos de despliegue. El Launcher configura el scope desde su interfaz; PRODUCTION queda reservado al despliegue/servicio administrado.
- [x] Registrar modo, host y dirección real de escucha.
- [x] Integrar selector LOCAL/LAN en la interfaz del Launcher; el scope se pasa directamente al proceso hijo y no depende de variables heredadas.
- [x] Evitar ambigüedad de familia del listener: seleccionar `tcp4` para hosts IPv4 y `tcp6` para hosts IPv6; registrar `EVENT=http.listen_config`. Pendiente CI y validación del binario empaquetado.
- [ ] Revisar la detección de interfaces: no anunciar ProtonVPN como LAN confiable por defecto; definir filtro o selección explícita de interfaz.
- [ ] Probar LOCAL con el Launcher empaquetado: loopback estricto, health local correcto y mDNS desactivado.
- [ ] Ejecutar prueba de conectividad LAN desde otro equipo cuando el entorno esté disponible.
- [ ] Mantener firewall como requisito de despliegue LAN para instalaciones de terceros; no cambiar el firewall del equipo de desarrollo/validación por esta tarea.
- [ ] Validar despliegues Docker/producción con la configuración explícita.

**Terminado:** la exposición de red es una decisión explícita y el backend local no acepta conexiones LAN por defecto.

## A3. Transporte de red / HTTPS

**Decisión de alcance:** [A3 — Transporte de red y alcance de HTTPS](A3_TLS_HTTPS.md). No se utilizará dominio propio ni se desplegará Caddy/ACME. HTTPS público queda fuera del alcance actual; LOCAL y LAN se rigen por A2.

- [x] Documentar que LOCAL es el modo recomendado para uso individual.
- [x] Documentar que LAN solo se admite en una red privada confiable y con firewall limitado.
- [x] Prohibir la exposición directa del backend HTTP a Internet.
- [x] Registrar el riesgo de tráfico LAN sin cifrar y el criterio para reabrir la decisión.
- [ ] Validar operativamente LOCAL, LAN, firewall y ausencia de exposición pública (ver A2).

**Estado:** cerrado por alcance, no por implementación de HTTPS. No aumentar puntuación hasta validar la política de red.

## A4. CORS

**Decisión:** mantener same-origin como comportamiento predeterminado y ofrecer una allowlist explícita desde el Launcher. Se admite `*` solo cuando el administrador lo agrega expresamente y acepta permitir cualquier origen; no se habilitan credenciales CORS.

- [x] Eliminar \`Access-Control-Allow-Origin: *\`.
- [x] Eliminar el preflight global que autorizaba cualquier origen.
- [x] Añadir reglas por IPv4 exacta, IPv4/CIDR, dominio DNS exacto y puerto opcional.
- [x] Comparar contra el host y puerto del encabezado \`Origin\`; las reglas no incluyen esquema.
- [x] Persistir las reglas en preferencias del Launcher.
- [x] Pasar la configuración al proceso Go mediante \`ABACOPHY_CORS_ALLOWED_ORIGINS\` como JSON array.
- [x] Mantener lista vacía por defecto y fallo cerrado ante configuración inválida.
- [x] Añadir pruebas unitarias para reglas, puertos, subredes, dominios y preflight.
- [x] CI Go: vet, build y tests completados correctamente (commit `770cbf5e`).
- [x] CI Launcher Desktop: compilación completada correctamente (commit `770cbf5e`).
- [x] CI Docker Image: build completado correctamente (commit `770cbf5e`).
- [ ] Validar manualmente orígenes permitidos/no permitidos, LOCAL/LAN y proxy Vite.

CORS es una política del navegador; no sustituye firewall ni autenticación y no restringe clientes nativos o conexiones TCP. LOCAL/LAN y el firewall siguen siendo controles separados.

**Estado:** implementación y CI validados; falta validación operativa en Launcher. `*` es una excepción configurable, no el valor predeterminado.

# 3. FASE B — Autenticación y sesiones

## B1. Contraseñas
- [x] Mantener bcrypt.
- [x] Mínimo de 12 caracteres Unicode, validado centralmente en backend.
- [x] Permitir passphrases y espacios significativos.
- [x] Evitar reglas artificiales predecibles de composición.
- [x] Rechazar más de 72 bytes UTF-8 (límite bcrypt); nunca truncar silenciosamente.
- [x] Aplicar la misma política a bootstrap, alta/edición de usuarios y cambio propio/administrativo.
- [x] Los errores de validación y eventos de auditoría de estos flujos no incluyen el valor de la contraseña.
- [x] Añadir pruebas unitarias de límites, Unicode y passphrases.
- [ ] Revisar coste de bcrypt según hardware.
- [x] CI Go: `go vet`, build y tests correctos en commit `b557159e`.

**Estado B1:** política implementada y CI Go correcto; pendiente medir el coste bcrypt en el hardware objetivo. CI Go: [ejecución `42249371647`](https://github.com/yecharlot/AbacoPhy/actions/runs/42249371647). Las contraseñas ya existentes no se invalidan ni se reescriben automáticamente.

## B2. Sesiones
- [x] Reducir la duración absoluta de 30 días.
- [x] Sesión estándar: 12 horas.
- [x] Sesión privilegiada (admin/master): 4 horas.
- [x] Mantener revocación por cambio de rol y permisos (epoch + revocación explícita).
- [x] Revocar sesiones al desactivar un usuario.
- [x] Revocar sesiones anteriores al cambiar contraseña; conservar solo la sesión actual cuando el propio usuario cambia su clave.
- [x] Revisar y endurecer persistencia de `tokens.json`: permisos 0600, escritura temporal + reemplazo y limpieza de expiradas al iniciar/consultar.
- [ ] Evaluar access token corto + refresh token protegido; diferido para no introducir renovación silenciosa sin almacenamiento seguro y sincronización entre clientes.
- [ ] Evaluar cifrado de tokens persistidos; diferido hasta definir gestión y recuperación de una clave maestra.
- [x] Añadir pruebas de expiración, persistencia, permisos y revocación.

**Estado B2:** política de expiración absoluta y limpieza de tokens implementadas; CI Go (vet, build y tests) correcto en el commit `ccb17d31`. Los tokens continúan siendo bearer tokens persistidos localmente; `tokens.json` queda restringido a 0600 en sistemas compatibles. El cifrado en reposo y el esquema access/refresh quedan como decisiones pendientes, no se consideran implementados. [Ejecución CI Go](https://github.com/yecharlot/AbacoPhy/actions/runs/42254629295).

## B3. Brute force
- [x] Rate limiting de login en backend.
- [x] Límite independiente por IP directa y por nombre de usuario normalizado.
- [x] Backoff progresivo por usuario: desde 1 s, duplicación progresiva y tope de 30 s.
- [x] Límite por IP: 30 fallos dentro de una ventana móvil de 5 minutos.
- [x] Ventana de fallos por usuario: 15 minutos; el estado expira y nunca genera bloqueo permanente.
- [x] Respuesta genérica para credenciales inválidas; HTTP 429 genérico al alcanzar el límite.
- [x] Registro seguro de fallos: IP y etiqueta hash del usuario; nunca contraseña, token ni nombre de usuario en claro.
- [x] Ignorar `X-Forwarded-For` para el límite mientras no exista una allowlist de proxies confiables; usar el peer TCP real para impedir spoofing.
- [x] Estado en memoria acotado temporalmente y sin persistencia de bloqueos entre reinicios.
- [x] Pruebas de backoff, reset tras login correcto, buckets independientes, expiración y spoofing de IP.
- [ ] Validar límites detrás de un proxy inverso confiable (si se incorpora ese despliegue) y carga concurrente en hardware objetivo.

# 4. FASE C — Autorización

## C1. RBAC
- [x] Mantener separación de roles en el backend; el frontend no constituye una barrera de seguridad.
- [x] Verificar `readonly` en endpoints mutables: `CanMutate` deniega siempre, incluso con grants personalizados.
- [x] Corregir POST de asientos: exige permiso de escritura y no solo permiso de lectura.
- [x] Reservar el módulo `master` exclusivamente a `RoleMaster`; las políticas del tenant no pueden concederlo a otros roles.
- [x] Validar roles en creación y edición de usuarios; `master` no es asignable mediante el endpoint de usuarios y los roles desconocidos se rechazan.
- [x] Aplicar gates de módulo a endpoints sensibles que antes comprobaban solo sesión o rol: monedas, importación de salvas, notificación de sync, Kardex, reconciliación de inventario, mayor, balance e integridad contable.
- [x] Aplicar permisos efectivos de rol/usuario/módulo a lectura y entrada física de recepción; eliminar excepciones de admin que ignoraban módulos deshabilitados.
- [x] Crear matriz endpoint → permiso → operación en `docs/C1_RBAC_AUDITORIA.md`.
- [x] Añadir pruebas de denegación readonly y de escalada de admin hacia master.
- [ ] Ejecutar validación manual de matriz con usuarios reales de cada rol y módulos activados/desactivados.

**Estado C1:** correcciones y pruebas automatizadas integradas; cierre condicionado a CI del commit final y prueba manual por rol. La política mantiene la personalización de permisos existente, pero el espacio `master` queda reservado y readonly nunca obtiene escritura.

## C2. Aislamiento de tenants
- [ ] Revisar endpoints que reciben `tenantID`.
- [ ] Impedir cambio de tenant manipulando parámetros.
- [ ] Verificar coherencia `UserID`, `TenantID` y sesión.
- [ ] Crear pruebas de acceso cruzado.
- [ ] Revisar endpoints administrativos/globales.

**Terminado:** un usuario no puede acceder/modificar datos de otro tenant.

# 5. FASE D — Hardening HTTP/API

## D1. Middleware de seguridad
Crear `SecurityMiddleware`:
- [ ] `X-Content-Type-Options: nosniff`
- [ ] `Referrer-Policy`
- [ ] `Content-Security-Policy` cuando sea compatible.
- [ ] `Permissions-Policy`
- [ ] `Strict-Transport-Security` solamente bajo HTTPS.
- [ ] Limitar tamaño de request.
- [ ] Timeouts.
- [ ] Validar métodos.
- [ ] Controlar Content-Type.
- [ ] Rechazar requests anómalos.

## D2. Errores
- [ ] No devolver stack traces.
- [ ] No revelar rutas internas.
- [ ] No revelar credenciales/configuración.
- [ ] Usar mensajes seguros.
- [ ] Registrar detalle técnico solo del lado servidor.

## D3. Entradas
- [ ] Revisar validación JSON.
- [ ] Revisar IDs.
- [ ] Revisar nombres de archivo.
- [ ] Revisar parámetros.
- [ ] Revisar paginación.
- [ ] Revisar filtros/ordenamiento.
- [ ] Revisar endpoints con cuerpos grandes.

# 6. FASE E — Protección de datos

## E1. Archivos locales
- [ ] Directorio de datos con permisos mínimos.
- [ ] `tokens.json` restrictivo.
- [ ] Revisar `tenants/*.json`.
- [ ] Revisar `cids/*.json`.
- [ ] Separar secretos de datos normales.

## E2. Integridad
- [ ] Mantener CID.
- [ ] Verificar CID antes de aceptar datos críticos.
- [ ] Registrar discrepancias.
- [ ] Probar restauración.
- [ ] Documentar que CID aporta integridad/detección, no cifrado.

## E3. Cifrado
- [ ] Identificar datos sensibles en reposo.
- [ ] Identificar datos sensibles en tránsito.
- [ ] Definir qué debe cifrarse.
- [ ] No crear criptografía propia.
- [ ] Usar mecanismos estándar.

# 7. FASE F — Docker

- [ ] Fijar versión de imagen base.
- [ ] Evitar `latest`.
- [ ] Ejecutar como usuario no root.
- [ ] Crear usuario/grupo dedicado.
- [ ] Reducir paquetes.
- [ ] Revisar puertos.
- [ ] Añadir healthcheck.
- [ ] Evaluar filesystem read-only.
- [ ] Montar solo directorios necesarios.
- [ ] No incluir secretos en la imagen.
- [ ] Escanear imagen.
- [ ] Revisar volumen de datos.
- [ ] Eliminar capacidades Linux innecesarias.

**Terminado:** comprometer Abaco no implica automáticamente root en el host.

# 8. FASE G — Launcher Desktop

- [ ] Revisar runtime JVM empaquetado.
- [ ] Verificar módulos Java incluidos.
- [ ] No incluir secretos en el instalador.
- [ ] Revisar backend Go incluido.
- [ ] Revisar permisos del directorio del backend.
- [ ] Revisar ejecución de procesos hijos.
- [ ] Validar rutas de recursos.
- [ ] Evitar path traversal.
- [ ] Verificar actualización segura.
- [ ] Verificar integridad de binarios.
- [ ] Probar instalación limpia.
- [ ] Probar desinstalación.
- [ ] Probar ejecución sin privilegios administrativos.

# 9. FASE H — Logs y auditoría

## Registrar
- [ ] Login exitoso/fallido.
- [ ] Logout/revocación.
- [ ] Cambio de rol.
- [ ] Cambio de permisos.
- [ ] Alta/baja de usuarios.
- [ ] Operaciones administrativas.
- [ ] Eventos de integridad.
- [ ] Errores importantes.

## Nunca registrar
- [ ] Contraseñas.
- [ ] Tokens.
- [ ] Authorization headers.
- [ ] Claves privadas.
- [ ] Secretos de entorno.
- [ ] Datos sensibles innecesarios.

## Protección
- [ ] Rotación.
- [ ] Límites de tamaño.
- [ ] Retención definida.
- [ ] Protección contra modificación.
- [ ] Sincronización horaria.

# 10. FASE I — Backups y recuperación

- [ ] Definir datos a respaldar.
- [ ] Definir frecuencia.
- [ ] Definir retención.
- [ ] Separar backup del servidor principal.
- [ ] Proteger backups.
- [ ] Cifrar backups sensibles.
- [ ] Probar restauración.
- [ ] Definir RPO.
- [ ] Definir RTO.
- [ ] Simular pérdida de servidor.

**Regla:** backup no restaurado con éxito = backup no verificado.

# 11. FASE J — Dependencias y cadena de suministro

- [ ] `go vet`.
- [ ] Tests.
- [ ] `govulncheck`.
- [ ] Revisar `go.mod`.
- [ ] Revisar dependencias transitivas.
- [ ] Revisar dependencias frontend.
- [ ] Revisar Kotlin/Compose.
- [ ] Revisar Android.
- [ ] Revisar Docker.
- [ ] Buscar secretos en Git.
- [ ] Revisar historial Git.
- [ ] Definir proceso de actualización.

# 12. FASE K — SAST / DAST / Security CI

## SAST
- [ ] Análisis estático Go.
- [ ] Análisis frontend.
- [ ] Análisis Kotlin.
- [ ] Definir umbral de fallo.

## Secret scanning
- [ ] API keys.
- [ ] Passwords.
- [ ] Tokens.
- [ ] Certificados privados.

## DAST
- [ ] Levantar Abaco en entorno aislado.
- [ ] Escanear API.
- [ ] Probar autenticación.
- [ ] Probar autorización.
- [ ] Probar inyección.
- [ ] Probar headers.
- [ ] Probar CORS.
- [ ] Probar rate limiting.

# 13. FASE L — Pruebas manuales

## Autenticación
- [ ] Usuario inexistente.
- [ ] Password incorrecta.
- [ ] Usuario desactivado.
- [ ] Token expirado.
- [ ] Token revocado.
- [ ] Token manipulado.
- [ ] Reutilización de token.

## Autorización
- [ ] Readonly intentando escribir.
- [ ] Vendedor intentando administración.
- [ ] Usuario intentando cambiar su rol.
- [ ] Usuario intentando modificar otro usuario.
- [ ] Cambio de tenant.
- [ ] Acceso directo a endpoint oculto.

## HTTP
- [ ] CORS no autorizado.
- [ ] Requests enormes.
- [ ] Métodos inesperados.
- [ ] Content-Type incorrecto.
- [ ] Parámetros inválidos.
- [ ] Headers malformados.

## Infraestructura
- [ ] Escaneo de puertos.
- [ ] Servicios innecesarios.
- [ ] Firewall.
- [ ] SSH.
- [ ] Docker.
- [ ] Permisos filesystem.

# 14. FASE M — Hardening del servidor ODROID

- [ ] Sistema actualizado.
- [ ] Servicios innecesarios desactivados.
- [ ] Firewall activo.
- [ ] SSH endurecido.
- [ ] Login SSH por contraseña deshabilitado cuando sea viable.
- [ ] Claves SSH protegidas.
- [ ] Usuario de servicio sin privilegios.
- [ ] Puertos mínimos.
- [ ] Fail2ban o equivalente cuando proceda.
- [ ] Actualizaciones de seguridad.
- [ ] Logs.
- [ ] Backups externos.
- [ ] Restauración verificada.
- [ ] Protección física.
- [ ] UPS/energía estable.
- [ ] Monitorización.

# 15. FASE N — Revisión final

- [ ] Tests.
- [ ] Análisis estático.
- [ ] Escaneo de dependencias.
- [ ] Secret scanning.
- [ ] DAST.
- [ ] Revisión Docker.
- [ ] Revisión servidor.
- [ ] Revisión Launcher.
- [ ] Revisión POS.
- [ ] Revisión red.
- [ ] Revisión backups.
- [ ] Repetir auditoría.
- [ ] Recalcular puntuación.

# 16. Métrica de aceptación

| Etapa | Objetivo |
|---|---:|
| Línea base | 52/100 |
| Fase A | ≥70 |
| A+B+C | ≥80 |
| HTTP + Docker | ≥85 |
| Infraestructura + DAST | ≥90 |
| ISO/SOC readiness | ≥90 + evidencias |

La puntuación es un indicador interno, no una certificación.

# 17. Orden exacto recomendado

### Sprint 1 — Riesgo inmediato
- [ ] A1 Credenciales
- [ ] A2 Bind
- [x] A3 Alcance de transporte documentado (sin HTTPS público)
- [ ] A4 CORS

### Sprint 2 — Identidad
- [x] B1 Passwords
- [x] B2 Sesiones
- [ ] B3 Rate limiting
- [ ] C1 RBAC
- [ ] C2 Tenant isolation

### Sprint 3 — API
- [ ] D1 Security middleware
- [ ] D2 Errores
- [ ] D3 Validación

### Sprint 4 — Datos
- [ ] E1 Filesystem
- [ ] E2 Integridad
- [ ] E3 Cifrado
- [ ] I Backups

### Sprint 5 — Infraestructura
- [ ] F Docker
- [ ] G Launcher
- [ ] M ODROID

### Sprint 6 — Auditoría automatizada
- [ ] J Dependencias
- [ ] K SAST/DAST/CI
- [ ] H Logs

### Sprint 7 — Validación
- [ ] L Pruebas manuales
- [ ] N Auditoría final
- [ ] Recalcular puntuación
- [ ] Documentar excepciones

# 18. Resultado esperado

**Línea base:** 52/100 — 🟠 Hardening necesario  
**Actual:** 55/100 — 🟠 Hardening en curso (A1 validado por CI; verificación operativa pendiente)  
**Objetivo:** ≥90/100 — 🟢 Buena postura técnica

Ruta:

`HARDENING TÉCNICO → AUDITORÍA → GESTIÓN DE RIESGOS → ISO 27001 READINESS → SOC 2 READINESS → AUDITORÍA FORMAL`

## Registro de cambios

| Fecha | Cambio | Responsable | Resultado |
|---|---|---|---|
| 2026-11-03 | Auditoría inicial | — | 52/100 |
| 2026-11-03 | A1: credenciales aleatorias, rotación legacy, creación de tenants y cambio obligatorio | Validado operativamente por el usuario; revisar referencias antiguas residuales en Launcher | 55/100 |
| 2026-11-03 | A2: modos LOCAL/LAN/PRODUCTION, bind seguro y mDNS condicionado | Implementación inicial; validación operativa pendiente | 55/100 sin incremento hasta completar validación |
| 2026-11-04 | A4: gestor CORS con comodín global explícito `*` | CI Go, Launcher Desktop y Docker correctos; pruebas manuales pendientes | 55/100; sin incremento hasta validar A2/A4 |
| 2026-11-06 | A2: bind IPv4 explícito y selección LAN | Launcher ahora persiste una IPv4 elegida; backend escucha solo en esa IP más loopback y limita mDNS a la interfaz propietaria. CI y prueba empaquetada pendientes; firewall del equipo de prueba desactivado intencionalmente y no se modifica | 55/100; implementación integrada, validación operativa pendiente |
| 2026-11-06 | B1: política uniforme de contraseñas | Validación central en `internal/auth`, aplicada a bootstrap, altas, ediciones y cambios de contraseña; pruebas de límites, Unicode y passphrases. CI Go correcto | Implementación validada por CI; revisión del coste bcrypt pendiente |
| 2026-11-06 | B2: expiración y revocación de sesiones | Sesiones estándar 12 h y admin/master 4 h; tokens expirados se limpian de memoria/disco; persistencia atómica con permisos 0600; pruebas de expiración, persistencia y revocación añadidas | CI Go correcto; cifrado en reposo y access/refresh diferidos por falta de gestión de clave y sincronización segura |
| 2026-11-06 | B3: protección contra fuerza bruta | Límite IP + usuario, backoff progresivo, respuestas genéricas, registro sin secretos y pruebas automatizadas. La IP se toma del peer TCP; X-Forwarded-For no se confía sin proxy explícitamente confiable | Implementación integrada; CI y validación concurrente pendientes |

## Registro de excepciones

| ID | Excepción | Riesgo aceptado | Responsable | Fecha revisión |
|---|---|---|---|---|
| | | | | |

## Registro de hallazgos

| ID | Hallazgo | Severidad | Estado | Commit |
|---|---|---|---|---|
| H-01 | Credenciales bootstrap | Alta | CI Go/Webapp/Docker y compilación Launcher correctos; validación operativa pendiente | security-hardening |
| H-02 | Bind de red | Alta | Launcher empaquetado arranca LAN; listener efectivo `[::]`; revisar binding, selección de interfaces y completar LOCAL/prueba entre equipos. Firewall desactivado por decisión del usuario y no se modifica | |
| H-03 | Tráfico LAN HTTP sin cifrar | Media | Riesgo aceptado: LAN solo en red privada confiable; validar A2 | |
| H-04 | CORS | Alta | Implementado; CI Go/Launcher/Docker correcto; pruebas manuales pendientes | `770cbf5e` |
| H-05 | Sesiones | Alta | Pendiente | |
| H-06 | Tokens persistidos | Media | Pendiente | |
| H-07 | Rate limiting | Media | Implementación B3 integrada; pendiente CI y validación operativa | |
| H-08 | Headers HTTP | Media | Pendiente | |
| H-09 | Logging | Media | Pendiente | |
| H-10 | Docker | Media | Pendiente | |
| H-11 | Permisos filesystem | Baja | Pendiente | |
| H-12 | Password policy | Baja | Implementada; CI Go correcto; medir coste bcrypt en hardware objetivo | `b557159e` |


### 2026-11-06 — A2: selección explícita de interfaz (backend)

- `internal/discovery/mdns.go`: `AdvertiseOnInterface` permite limitar el anuncio mDNS a la interfaz que posee una IPv4 seleccionada; utiliza `RegisterProxy` con la IP exacta.
- `cmd/abacophy/main.go`: valida `ABACOPHY_LAN_INTERFACE_IP`, exige coincidencia con `ABACOPHY_HOST` y admite bind HTTP a esa IPv4 concreta.
- Tests de validación de IP/interfaz añadidos; CI Go correcto en commit `1a8b857`.
- Pendiente: conectar la selección a la UI y preferencias del Launcher. No declarar A2 cerrado ni incrementar la puntuación hasta validar el flujo empaquetado y las pruebas operativas.


### 2026-11-06 — A2: integración de selección LAN en Launcher

- UI: campo de IPv4 LAN visible solo en modo LAN.
- Persistencia: la IP elegida se guarda en las preferencias del Launcher.
- Proceso Go: LAN pasa la misma IP a `ABACOPHY_HOST` y `ABACOPHY_LAN_INTERFACE_IP`; LOCAL elimina la variable y vuelve a `127.0.0.1`.
- Backend: crea dos listeners en modo LAN explícito: la IP seleccionada y `127.0.0.1`, ambos en el mismo puerto; mDNS queda limitado a la interfaz seleccionada.
- CI Go, Launcher Desktop y Docker Image: correctos en `4988114`. Pendiente: ejecutar el build empaquetado y pruebas operativas LOCAL/LAN. La puntuación permanece en 55/100.
