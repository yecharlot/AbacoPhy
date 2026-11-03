# ABACOPHY — PLAN DE IMPLEMENTACIÓN DE HARDENING TÉCNICO

**Versión:** 1.0  
**Fecha:** 2026-11-03  
**Objetivo:** elevar la seguridad técnica de AbacoPhy/AbacoPOS antes de avanzar hacia ISO/IEC 27001 y SOC 2.

## 0. Línea base

**Puntuación inicial: 52/100 — 🟠 Hardening necesario**

Esta puntuación procede de una primera revisión estática del repositorio. No es una certificación ni un pentest.

### Prioridades
- [ ] Eliminar credenciales administrativas conocidas o impresas.
- [ ] Definir política segura de bind de red.
- [ ] Preparar HTTPS/TLS.
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

- [ ] Crear rama `security-hardening`.
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
- [ ] Localizar credenciales por defecto.
- [ ] Eliminar contraseñas administrativas visibles en logs.
- [ ] Eliminar contraseñas reales del código/documentación de producción.
- [ ] Diseñar bootstrap de primera ejecución.
- [ ] Obligar a cambiar la credencial inicial.
- [ ] Invalidar la credencial temporal después del primer cambio.
- [ ] Verificar que una instalación nueva no conserve credenciales conocidas.
- [ ] Añadir prueba automática.

**Terminado:** ninguna credencial administrativa conocida funciona en producción.

## A2. Bind de red
Definir:
- [ ] `LOCAL`: `127.0.0.1`.
- [ ] `LAN`: interfaz/IP configurada.
- [ ] `PRODUCTION`: exposición controlada detrás de reverse proxy/firewall.
- [ ] Documentar comportamiento por defecto.
- [ ] Mostrar interfaz escuchando en logs.
- [ ] Probar puertos desde otra máquina.

**Terminado:** la exposición de red es una decisión explícita.

## A3. TLS / HTTPS
- [ ] Definir `HTTPS reverse proxy → Abaco`.
- [ ] Elegir Caddy, Nginx o Traefik.
- [ ] Configurar certificado válido.
- [ ] Redirigir HTTP a HTTPS cuando corresponda.
- [ ] No exponer directamente el backend a Internet.
- [ ] Activar HSTS solamente con HTTPS correctamente establecido.
- [ ] Probar que credenciales/tokens nunca viajen por HTTP en producción.

## A4. CORS
- [ ] Eliminar `Access-Control-Allow-Origin: *` en producción.
- [ ] Definir orígenes explícitos.
- [ ] Separar desarrollo/producción.
- [ ] Revisar métodos y headers permitidos.
- [ ] Probar preflight.
- [ ] Verificar rechazo de orígenes no autorizados.

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
- [ ] A3 TLS
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

**Actual:** 52/100 — 🟠 Hardening necesario  
**Objetivo:** ≥90/100 — 🟢 Buena postura técnica

Ruta:

`HARDENING TÉCNICO → AUDITORÍA → GESTIÓN DE RIESGOS → ISO 27001 READINESS → SOC 2 READINESS → AUDITORÍA FORMAL`

## Registro de cambios

| Fecha | Cambio | Responsable | Resultado |
|---|---|---|---|
| 2026-11-03 | Auditoría inicial | — | 52/100 |
| | | | |

## Registro de excepciones

| ID | Excepción | Riesgo aceptado | Responsable | Fecha revisión |
|---|---|---|---|---|
| | | | | |

## Registro de hallazgos

| ID | Hallazgo | Severidad | Estado | Commit |
|---|---|---|---|---|
| H-01 | Credenciales bootstrap | Alta | Pendiente | |
| H-02 | Bind de red | Alta | Pendiente | |
| H-03 | TLS | Alta | Pendiente | |
| H-04 | CORS | Alta | Pendiente | |
| H-05 | Sesiones | Alta | Pendiente | |
| H-06 | Tokens persistidos | Media | Pendiente | |
| H-07 | Rate limiting | Media | Pendiente | |
| H-08 | Headers HTTP | Media | Pendiente | |
| H-09 | Logging | Media | Pendiente | |
| H-10 | Docker | Media | Pendiente | |
| H-11 | Permisos filesystem | Baja | Pendiente | |
| H-12 | Password policy | Baja | Pendiente | |
