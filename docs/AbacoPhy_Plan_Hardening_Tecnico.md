# ABACOPHY — PLAN DE IMPLEMENTACIÓN DE HARDENING TÉCNICO

**Versión:** 1.0  
**Fecha:** 2026-11-03  
**Objetivo:** elevar la seguridad técnica de AbacoPhy/AbacoPOS antes de avanzar hacia ISO/IEC 27001 y SOC 2.

## 0. Línea base

**Puntuación inicial: 52/100 — 🟠 Hardening necesario**

**Puntuación actual: 55/100 — 🟠 Hardening en curso.** A1 fue validado operativamente. A2 tiene implementación inicial en backend y documentación, pero sigue pendiente la validación de Launcher/red y CI. A1 pasó CI Go (vet, build y pruebas), CI Webapp (typecheck, Vitest y build de producción) y CI Docker (imagen de producción construida). CI Launcher Desktop también compiló correctamente. Sigue pendiente ejecutar los scripts de empaquetado runtime del Launcher y validar la migración sobre datos operativos.

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
- [ ] Sustituir CORS `*` por política explícita.
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

**Evidencia y validación operativa:** consultar [A2 — Validación operativa del alcance de red](A2_VALIDACION_RED.md). La revisión estática confirma que el Launcher sobrescribe explícitamente el modo y host del proceso Go y persiste LOCAL/LAN. La prueba entre dos equipos y la comprobación del firewall siguen pendientes.

**Advertencia:** el Launcher configura LAN con `0.0.0.0`, que escucha en todas las interfaces IPv4. Antes de usar LAN debe limitarse el puerto mediante el firewall a una subred privada confiable; no publicar el puerto en Internet.

- [x] `LOCAL` como modo predeterminado y escucha en `127.0.0.1`.
- [x] `LAN` requiere selección explícita y admite IP de interfaz o wildcard configurado.
- [x] `PRODUCTION` requiere modo y `ABACOPHY_HOST` explícitos; wildcard permitido solo por configuración explícita para contenedores protegidos por la plataforma.
- [x] mDNS solo se anuncia en modo `LAN`.
- [x] Validar/rechazar combinaciones inseguras y modos desconocidos.
- [x] Documentar variables, precedencia de puertos y ejemplos de despliegue. El Launcher configura el scope desde su interfaz; PRODUCTION queda reservado al despliegue/servicio administrado.
- [x] Registrar modo, host y dirección real de escucha.
- [x] Integrar selector LOCAL/LAN en la interfaz del Launcher; el scope se pasa directamente al proceso hijo y no depende de variables heredadas.
- [ ] Ejecutar pruebas de conectividad desde otro equipo y verificar firewall/VPN.
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

**Decisión:** la webapp y la API se sirven desde el mismo origen en el despliegue integrado. Vite usa proxy `/api` durante desarrollo y Electron carga la URL local del backend. No existe una necesidad confirmada de cliente web cross-origin. Por ello se elimina CORS permisivo en vez de mantener una lista artificial de orígenes.

- [x] Eliminar `Access-Control-Allow-Origin: *`.
- [x] Eliminar la respuesta global que autorizaba cualquier preflight OPTIONS.
- [x] Mantener el flujo same-origin de webapp/API y el proxy de desarrollo.
- [x] Añadir pruebas para comprobar que no se conceden permisos CORS a orígenes externos.
- [x] Ejecutar CI Go (vet, build y tests: success en el commit de A4).
- [ ] Verificar manualmente login, API y PWA en Launcher LOCAL y en modo LAN.

**Importante:** CORS es una política aplicada por navegadores; no sustituye autenticación ni autorización y no bloquea clientes no navegador como curl o aplicaciones nativas. Si en el futuro se separa el frontend en otro origen, se deberá introducir una allowlist exacta y documentada, no un wildcard.

**Estado:** cambio de código y pruebas automatizadas validadas por CI Go; validación manual pendiente.

# 3. FASE B — Autenticación y sesiones

## B1. Contraseñas
- [ ] Mantener bcrypt.
- [ ] Mínimo recomendado: 12 caracteres.
- [ ] Permitir passphrases.
- [ ] Evitar reglas artificiales predecibles.
- [ ] Nunca registrar contraseñas.
- [ ] Revisar coste de bcrypt según hardware.
- [ ] Añadir pruebas.

## B2. Sesiones
- [ ] Reducir la duración actual de 30 días.
- [ ] Definir duración normal.
- [ ] Definir política especial para administración.
- [ ] Mantener revocación por cambio de rol.
- [ ] Mantener revocación por cambio de permisos.
- [ ] Revocar al desactivar usuario.
- [ ] Revisar persistencia de `tokens.json`.
- [ ] Evaluar access token corto + refresh token protegido.
- [ ] Evaluar cifrado de tokens persistidos.
- [ ] Añadir pruebas de expiración y revocación.

## B3. Brute force
- [ ] Rate limiting de login.
- [ ] Límite por IP.
- [ ] Backoff progresivo.
- [ ] Evitar bloqueo permanente de cuentas.
- [ ] Registrar intentos de forma segura.
- [ ] No revelar si un usuario existe.
- [ ] Probar ataques repetidos.

# 4. FASE C — Autorización

## C1. RBAC
- [ ] Mantener separación de roles.
- [ ] Verificar `readonly` en todos los endpoints mutables.
- [ ] Verificar que el frontend no sea la única barrera.
- [ ] Auditar endpoints sensibles.
- [ ] Crear matriz endpoint → rol → operación.
- [ ] Probar permitido y denegado.
- [ ] Probar escalada de privilegios.

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
- [ ] B1 Passwords
- [ ] B2 Sesiones
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
| 2026-11-03 | A2: modos LOCAL/LAN/PRODUCTION, bind seguro y mDNS condicionado | Implementación inicial backend/documentación; CI y validación operativa pendientes | 55/100 sin incremento hasta completar validación |

## Registro de excepciones

| ID | Excepción | Riesgo aceptado | Responsable | Fecha revisión |
|---|---|---|---|---|
| | | | | |

## Registro de hallazgos

| ID | Hallazgo | Severidad | Estado | Commit |
|---|---|---|---|---|
| H-01 | Credenciales bootstrap | Alta | CI Go/Webapp/Docker y compilación Launcher correctos; validación operativa pendiente | security-hardening |
| H-02 | Bind de red | Alta | Implementación inicial en backend; pendiente Launcher, CI y prueba LAN/LOCAL/PRODUCTION | |
| H-03 | Tráfico LAN HTTP sin cifrar | Media | Riesgo aceptado: LAN solo en red privada confiable; validar A2 | |
| H-04 | CORS | Alta | Pendiente | |
| H-05 | Sesiones | Alta | Pendiente | |
| H-06 | Tokens persistidos | Media | Pendiente | |
| H-07 | Rate limiting | Media | Pendiente | |
| H-08 | Headers HTTP | Media | Pendiente | |
| H-09 | Logging | Media | Pendiente | |
| H-10 | Docker | Media | Pendiente | |
| H-11 | Permisos filesystem | Baja | Pendiente | |
| H-12 | Password policy | Baja | Pendiente | |
