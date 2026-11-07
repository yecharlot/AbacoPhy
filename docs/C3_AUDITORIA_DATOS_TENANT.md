# C3 — Auditoría de seguridad de datos y operaciones entre tenants

**Rama:** `security-hardening`  
**Fase:** C3 — auditoría e implementación incremental  
**Estado:** C3.1 cerrado por confirmación del usuario; C3.2 en implementación.

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
| Archivos de datos | `Store.Put` usa permisos 0644 y directorios 0755 para snapshots/CID | Revisar compatibilidad multiplataforma y endurecer permisos |
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
- [ ] Añadir pruebas de restauración CID corrupta a nivel API y fallos de persistencia inducidos.
- [ ] Revisar la semántica de historial de backups/auditoría al restaurar.

### C3.3 — Archivos locales
- Endurecer permisos de `dataDir`, `tenants/`, `cids/`, snapshots y blobs CID.
- Evitar path traversal y symlink escapes en rutas derivadas de IDs.
- Asegurar escritura atómica de snapshots y verificar comportamiento Windows/POSIX.

### C3.4 — Sesiones y eventos
- Verificar revocación de sesiones por tenant, expiración y aislamiento de eventos.
- Añadir pruebas SSE que demuestren que una publicación de A nunca llega a suscriptores de B.

### C3.5 — Operaciones globales
- Auditar listado/creación/eliminación de tenants, reset y operaciones master.
- Documentar explícitamente qué acciones son globales y cuáles están limitadas por tenant.

## Criterio de cierre

No se cierra C3 hasta que cada superficie tenga pruebas negativas entre dos tenants, pruebas de integridad y evidencia CI. La validación manual del usuario se registrará separada de los resultados automatizados.
