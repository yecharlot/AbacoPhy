# C3 — Auditoría de seguridad de datos y operaciones entre tenants

**Rama:** `security-hardening`  
**Fase:** C3 — auditoría e implementación incremental  
**Estado:** C3.1, C3.2 y C3.3 comprobados y cerrados. C3.3 cuenta con CI Go Linux/Windows, Docker y Launcher Desktop correctos.

## Objetivo

Comprobar que las operaciones de datos auxiliares y recuperación mantienen el límite del tenant autenticado y no abren vectores de denegación de servicio, exposición de información o restauración cruzada.

C3 cubre:
1. Archivos locales, documentos, exportaciones y descargas.
2. Backups, importaciones y restauraciones CID/locales.
3. Sesiones, tokens, presencia y eventos en tiempo real.
4. Operaciones administrativas globales.
5. Pruebas automatizadas de acceso cruzado y regresión.

## Auditoría inicial — evidencia en el código

| Área | Estado observado | Acción |
|---|---|---|
| Presencia | `/api/v1/presence` lista con `ListOnlineForTenant(sess.TenantID)`; el test de aislamiento existe | Mantener; ampliar cobertura de expiración y datos devueltos |
| SSE | `/api/v1/events` se suscribe con `sess.TenantID`; EventHub mantiene mapas separados por tenant | Mantener; probar publicación cruzada y desconexión |
| Backups CID | Restore compara el tenant raíz, vincula hijos y valida referencias | Añadir verificación de integridad del contenido CID y errores de persistencia |
| Importación ZIP/JSON | El parser aceptaba lectura descomprimida sin límite y el límite de `ParseMultipartForm` solo controlaba memoria en RAM | Corregido en el primer bloque |
| Exportación | Exporta el snapshot de la sesión autenticada; requiere revisar límites, no-store y auditoría | Revisar |
| Archivos de datos | C3.3 usa os.Root (Go 1.24), operaciones relativas a directorios anclados, permisos 0600/0700 y escritura mediante descriptor abierto y verificado | CI Go Linux/Windows, Docker y Launcher Desktop correctos; bloque aceptado como OK |
| Tokens | `tokens.json` ya se persiste con 0600 y escritura temporal | Verificar permisos al crear directorios y comportamiento en Windows |

## C3.1 — Importación de backups

- [x] Aplicar límite real al cuerpo multipart completo mediante `http.MaxBytesReader` (32 MiB).
- [x] Limitar memoria inicial de parseo multipart y eliminar temporales al finalizar.
- [x] Limitar tamaño del archivo recibido y tamaño descomprimido del snapshot.
- [x] Limitar cantidad de entradas ZIP.
- [x] Aceptar únicamente la entrada de snapshot esperada `abacophy-salva.json`; no extraer rutas al filesystem.
- [x] Rechazar ZIP sin snapshot, duplicado o de expansión excesiva.
- [x] Comprobar error de persistencia antes de responder éxito.
- [x] Ejecutar tests Go y CI (confirmado por el usuario).
- [x] Añadir pruebas de payload multipart superior al límite y ZIP expandido superior al límite.

## Próximos bloques

### C3.2 — Integridad y aislamiento de backups
- [x] Verificar que el RootCID embebido coincide con el CID solicitado.
- [x] Recalcular el CID del snapshot canonicalizado antes de devolverlo desde LoadCID.
- [x] La restauración usa VerifyStoredCID y valida estructura antes de mutar el tenant.
- [x] Comprobar y reportar fallos de persistencia en la restauración CID.
- [x] Añadir pruebas de modificación del blob y RootCID manipulado.
- [x] Añadir prueba API: CID corrupto devuelve error y no modifica el tenant activo.
- [x] Añadir prueba API: restauración válida conserva el historial de backups y auditoría y registra el evento de restore.
- [x] Inducir fallo real de escritura del snapshot durante restore; responder HTTP 500 y mantener intacto el snapshot en memoria.
- [x] Publicar el snapshot en memoria solo después de confirmar la escritura principal del tenant en disco.
- [x] Verificar CI Go, Docker y Launcher Desktop (confirmado por el usuario).\n- [x] Validación manual de C3.2 confirmada por el usuario.

### C3.3 — Archivos locales <badge>OK</badge>
- [x] Endurecer permisos de `dataDir`, `tenants/`, `cids/`, snapshots y blobs CID.
- [x] Evitar path traversal y symlink escapes en rutas derivadas de IDs.
- [x] Asegurar operaciones confinadas por descriptor/root y verificar condiciones de carrera.
- [x] CI Go en Linux y Windows, CI Docker y CI Launcher Desktop correctos (commit `3f570610df18087f9019e90a75cba2865e166689`).

**Nota:** las pruebas de creación de symlinks pueden omitirse en Windows si el runner carece de privilegios para ello; el workflow sí valida compilación y tests restantes en Windows.

### C3.4 — Sesiones y eventos
- [x] Revalidar la sesión durante conexiones SSE largas, no solo al abrir el stream.
- [x] Comprobar revocación, expiración, baja y cambios de permisos mediante la validación central de sesiones.
- [x] Verificar aislamiento de publicación/suscripción por tenant.
- [x] Verificar desconexión y limpieza de suscriptores.
- [x] Añadir pruebas de concurrencia del hub y ejecutar CI.

**Resultado automatizado (commit `2cca58249d403966bb204e0107e224817340fb8c`):** stream SSE corta ante revocación; las sesiones se revalidan también ante expiración, baja y cambios de permisos; IDs de cliente repetidos quedan separados por tenant; clientes anónimos no pueden sobrescribir presencia autenticada. CI Go Linux/Windows, Docker y Launcher Desktop: success.

**Cierre C3.4 — <badge>OK</badge>:** el despliegue actual corresponde a una sola empresa/tenant. Por tanto, la validación manual con dos empresas no aplica al alcance operativo y no bloquea el cierre. Se conservan las pruebas automatizadas de separación tenant-scoped como defensa de regresión; la revocación del stream SSE, la revalidación de sesión y la limpieza/concurrencia del hub están cubiertas por pruebas automatizadas. CI Go Linux/Windows, Docker y Launcher Desktop: success (commit de código `0fb9c5d415db088b73f5050a7f81f71b6306640c`).

### C3.5 — Operaciones globales
- [x] Revisar rutas globales: listado de tenants (solo GET), alta de tenant (POST), reset global (POST + confirmación explícita) y cambio global de contraseña (solo master).
- [x] Confirmar que las políticas configurables del tenant y los grants individuales no pueden elevar roles operativos a `master`.
- [x] Hacer atómica bajo el lock del Store la unicidad global de slug y usernames durante la creación de tenants; rechazar duplicados y altas concurrentes.
- [x] Registrar la creación global en la auditoría del tenant creado, identificando al master y el tenant de origen sin mezclar TenantID entre snapshots.
- [x] Registrar el reinicio global en el tenant bootstrap nuevo, ya que el reset elimina la auditoría histórica.
- [x] Mantener pruebas de rechazo para admin→master/reset, usernames globales ambiguos y cambio de contraseña cross-tenant.
- [x] Añadir pruebas de método HTTP y auditoría de alta global.
- [x] Añadir prueba concurrente de unicidad de tenant/identidades.
- [x] CI Go Linux/Windows, Docker y Launcher Desktop: success en el commit de código `6573e21a3ad1a2ae6d4714fb53baeaa3cfe11d39`.

**Límites de alcance:** no existe endpoint de eliminación individual de tenants en la API actual. `/api/v1/master/reset` es un reinicio global destructivo, no una baja individual. El listado de tenants es una operación de solo lectura. El despliegue actual del usuario es de una sola empresa; las defensas globales se conservan para impedir ambigüedad de identidad y proteger futuras ampliaciones.

## Criterio de cierre

El criterio de cada bloque se ajusta al despliegue real: para la instalación actual de una sola empresa, las pruebas manuales entre dos tenants no son requisito de cierre. Se mantienen las pruebas automatizadas de aislamiento como regresión y se exigen pruebas de integridad y evidencia CI para las superficies modificadas. Si el producto pasa a operar con varias empresas, deberá ejecutarse la validación operativa multi-tenant antes de habilitar ese escenario.
