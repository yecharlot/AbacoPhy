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

### C3.6.1 — Inventario de exportaciones y descargas

**Estado:** inventario estático completado; no se modificó código en este paso.

#### Superficies del backend

| Ruta / superficie | Datos y origen | Autorización observada | Controles observados / puntos a revisar |
|---|---|---|---|
| `GET /api/v1/backups` | Metadatos de backups y CID del snapshot actual | Sesión + `gateOp("salvas")`; obtiene `Store.Get(sess.TenantID)` | No establece explícitamente `Cache-Control: no-store, private`. Revisar métodos no permitidos y respuesta sensible. |
| `GET /api/v1/backups/export` | Snapshot completo del tenant serializado en ZIP; respuesta ZIP binaria o JSON+base64 | GET/HEAD explícitos, sesión + permiso `salvas`; snapshot del tenant de sesión | ZIP binario usa `Cache-Control: no-store`, pero la respuesta JSON+base64 no. Auditoría best-effort; el panic handler expone el texto del panic. HEAD ejecuta la generación completa. Revisar límites de exportación, memoria y auditoría. |
| `POST /api/v1/backups/import` | Snapshot ZIP/JSON suministrado por el usuario | Sesión, permiso `salvas` y rol admin/master/contador | Límites multipart/ZIP y validación tenant ya cubiertos por C3.1/C3.2. Revalidar cabeceras y no-store de respuestas. |
| `POST /api/v1/backups/restore` | Snapshot recuperado por CID | Sesión + permiso `salvas`; comprueba TenantID del snapshot | Verificación CID, estructura, referencias y persistencia ya cubiertas por C3.2. Revisar no-store y auditoría del flujo completo. |
| `GET /api/v1/invoices/pdf?id=...` | PDF de factura | Sesión + permiso `facturas`; busca factura únicamente en `Store.Get(sess.TenantID)` | No establece explícitamente no-store; no registra evento de exportación. El nombre de descarga deriva del número de factura. Revisar método HTTP, cabecera de descarga y auditoría. |
| `/api/v1/payroll/pdf?period=...` | PDF de nómina | Sesión + permiso `nomina`; obtiene liquidaciones del snapshot del tenant autenticado | Registra `nomina.exportacion_pdf`, pero ignora el error de persistencia de auditoría. No establece explícitamente no-store. El periodo sin coincidencias puede recurrir a las últimas 50 liquidaciones; revisar comportamiento y métodos HTTP. |
| `/api/v1/reports/pdf?kind=...&period=...&account_id=...` | PDF contable | Sesión + permisos `reportes` y `cuentas_t`; snapshot del tenant autenticado | Registra `informe.exportacion_pdf`, pero ignora el error de persistencia de auditoría. No establece explícitamente no-store. Revisar allowlist de métodos, tipos de informe, parámetros y cabecera de descarga. |

#### Exportaciones generadas en el cliente

- Contabilidad: `webapp/src/features/accounting/ui/export/accountingReportsExport.ts` genera CSV y PDF/impresión desde los datos ya cargados en la aplicación (balance de comprobación, estado de resultados, libro diario, ingresos/gastos y plan de cuentas).
- CSV común: `webapp/src/infrastructure/data/export/csv.ts` construye un Blob y dispara una descarga local; no hay endpoint de exportación asociado en este helper.
- Impresión/PDF: `webapp/src/infrastructure/data/export/printHtml.ts` genera documentos HTML para la ventana de impresión del navegador.
- Informes de recepción y transferencias: `webapp/src/features/warehouse/ui/pdf/buildReceptionReportHtml.ts` y `buildTransferReportHtml.ts` generan contenido local para impresión/PDF; la autorización depende de la carga previa de los datos en las pantallas/servicios, no de un endpoint PDF independiente.
- Nómina: existe el caso de uso `DownloadPayrollPdf`, que documenta que el PDF uniforme no está disponible en esa versión; la ruta backend anterior sí existe y se usa como superficie a revisar.

#### Hallazgos que pasan a C3.6.2–C3.6.4

1. Homogeneizar `Cache-Control: no-store, private` en todas las respuestas autenticadas que contienen datos financieros, personales o snapshots, incluidos JSON+base64 y respuestas de error sensibles.
2. Revisar y restringir métodos HTTP de los handlers PDF de facturas, nómina e informes; confirmar que GET/HEAD tienen semántica coherente y que los demás métodos responden 405.
3. Validar parámetros que intervienen en el contenido y nombre de archivos descargados; no permitir que valores arbitrarios controlen cabeceras.
4. Revisar la política de auditoría: los exports de nómina/informes ignoran errores de persistencia y el export ZIP usa auditoría best-effort. Definir explícitamente qué operaciones requieren auditoría durable antes de entregar el archivo.
5. Revisar el límite de tamaño/coste de generación de ZIP y PDF, el uso de memoria y la transmisión de respuestas. El export ZIP actualmente serializa el snapshot completo y construye el ZIP en memoria.
6. Añadir pruebas de autorización, método, cabeceras, auditoría y aislamiento tenant-scoped para cada endpoint. Mantener pruebas automatizadas tenant-scoped; no exigir una prueba manual con dos empresas para el despliegue actual de una sola empresa.

**Criterio de este paso:** el inventario no demuestra por sí solo una fuga cross-tenant. Las rutas revisadas seleccionan los snapshots por `sess.TenantID`; C3.6.2 debe convertir esa observación en pruebas negativas y de regresión. No se declara cerrada la auditoría de exportaciones/descargas hasta completar los pasos siguientes.

### C3.6.2 — Regresión automatizada de autorización y aislamiento

**Estado:** implementado y CI verificado en el commit de pruebas `85e30f463d8cef0d93cd7d59b59df5fa692db152`.

Se añadió `internal/api/export_isolation_test.go` con un escenario automatizado de dos tenants. El objetivo es comprobar el límite de datos desde la perspectiva de una sesión autenticada, sin convertir una prueba manual multiempresa en requisito operativo.

Cobertura añadida:

- La descarga PDF de una factura ajena al tenant autenticado devuelve 404; una factura propia sigue siendo descargable.
- El listado de backups solo devuelve metadatos/CID del snapshot de la sesión.
- La exportación ZIP contiene el snapshot del tenant autenticado y no incorpora marcadores de datos de la otra empresa.
- Las exportaciones PDF de nómina e informes se ejecutan con la sesión autenticada y no contienen los marcadores sensibles sembrados en el tenant ajeno.
- Los endpoints PDF y ZIP rechazan peticiones sin sesión (401).

**CI del commit de pruebas:**
- [CI Go Linux/Windows — success](https://github.com/yecharlot/AbacoPhy/actions/runs/42397259783)
- [CI Docker Image — success](https://github.com/yecharlot/AbacoPhy/actions/runs/42397259722)
- [CI Launcher Desktop — success](https://github.com/yecharlot/AbacoPhy/actions/runs/42397259731)

**Alcance:** este bloque confirma mediante regresión automatizada que las superficies cubiertas no mezclan snapshots ni permiten consultar una factura ajena. No cierra todavía la revisión de métodos HTTP, cabeceras de caché, persistencia de auditoría, validación de parámetros ni límites de generación/streaming; esos puntos siguen pendientes en C3.6.3 y C3.6.4.



### C3.6.3.1 — Métodos HTTP, cabeceras y validación de descargas

**Estado:** implementado y CI verificado en el commit `99ecb929b869be5a83550c89663566bf3131037f`.

- Aplicar `Cache-Control: no-store, private` y `Pragma: no-cache` a respuestas sensibles y errores de backups, facturas, nómina e informes; añadir `Vary` para Authorization y Cookie preservando Origin cuando CORS lo haya establecido.
- Limitar descargas PDF y exportación de backups a GET/HEAD; responder 405 con Allow: GET, HEAD para otros métodos.
- Implementar HEAD sin cuerpo en PDFs y en las variantes ZIP/JSON de exportación.
- Validar tipo y periodo de informe, identificador de cuenta, periodo de nómina, ID de factura y formato de exportación; mantener el modo `as=base64` usado por la SPA.
- Sanitizar componentes variables de nombres de archivo y construir Content-Disposition con mime.FormatMediaType.
- No exponer valores de panic ni errores internos en las respuestas de exportación.
- Incorporar regresiones HTTP para métodos, cabeceras y semántica HEAD.

**Compatibilidad revisada:** la SPA exporta backups con `as=base64` y ese modo se conserva; la descarga de factura usa `getBlob` sobre la ruta PDF. El caso de PDF de nómina sigue siendo un placeholder en la SPA. La auditoría durable queda para C3.6.4.

**CI del commit de implementación:**
- [CI Go Linux/Windows — success](https://github.com/yecharlot/AbacoPhy/actions/runs/42411522865)
- [CI Docker Image — success](https://github.com/yecharlot/AbacoPhy/actions/runs/42411523028)
- [CI Launcher Desktop — success](https://github.com/yecharlot/AbacoPhy/actions/runs/42411522817)

**Verificación adicional del cierre (2026-11-07):** se consultaron de nuevo los tres workflows y los tres constan como `completed/success`, todos sobre el commit de código `99ecb929b869be5a83550c89663566bf3131037f`. Las pruebas de `export_isolation_test.go` cubren 405/Allow, no-store y Vary, HEAD sin cuerpo, formato inválido, sanitización de nombres y compatibilidad `as=base64`.

**Estado C3.6.3: CERRADO.** El endurecimiento de métodos, cabeceras y parámetros de descarga queda completado. No incluye auditoría durable de exportaciones (C3.6.4) ni límites de generación, memoria y streaming (C3.6.5), que siguen pendientes.
