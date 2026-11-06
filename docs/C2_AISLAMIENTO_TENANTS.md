# C2 — Auditoría de aislamiento entre tenants

**Rama:** `security-hardening`  
**Fase:** C2 — implementación incremental  
**Estado:** implementación C2 integrada; auditoría REST/global y pruebas de integridad de snapshots incorporadas. El cierre operativo final requiere prueba manual integral con dos tenants y ejecutar la remediación documentada para usernames legacy duplicados.

## Objetivo y regla de seguridad

La sesión autenticada determina el tenant. Ni el usuario, ni un parámetro HTTP, ni la existencia de un único tenant en el almacenamiento pueden cambiar o inferir ese ámbito.

Para una sesión válida deben coincidir exactamente:

- `TokenSession.TenantID`
- `StoreSnapshot.Tenant.ID`
- `User.TenantID`
- `TokenSession.UserID` con la clave/ID del usuario recuperado en ese snapshot.

Si la relación no coincide, se rechaza la autenticación/autorización. No se corrige silenciosamente durante una petición.

## Hallazgos de la primera pasada

| ID | Hallazgo | Riesgo | Tratamiento |
|---|---|---|---|
| C2-01 | `Store.ResolveTenant` buscaba por `UserID` si fallaba `TenantID` y, al final, devolvía el único tenant | Una sesión con tenant ausente o inválido podía terminar asociada a otro snapshot | Ahora resuelve únicamente por el ID exacto; el argumento userID se conserva por compatibilidad, pero no participa en la resolución |
| C2-02 | `auth.Login` reparaba `User.TenantID` usando el tenant del snapshot | Una inconsistencia de pertenencia se convertía en sesión válida | Login rechaza si tenant del snapshot y del usuario no coinciden |
| C2-03 | `SessionFromRequest` comprobaba usuario activo/rol/epoch, pero no la pertenencia explícita del usuario al tenant de la sesión | Un registro de usuario inconsistente podía validar una sesión | Ahora exige tenant exacto, user ID exacto y revoca tokens inconsistentes |
| C2-04 | Restore CID permitía a master cargar un snapshot de otro tenant y sobrescribir el ID con el tenant de su sesión | Riesgo de contaminación/sobrescritura entre negocios | Se rechaza siempre la restauración CID cuyo tenant no coincida con la sesión |
| C2-05 | `/api/v1/master/reset` aceptaba admin de negocio aunque `ResetAll` borra todos los tenants y tokens | Un administrador de una empresa podía destruir datos de todas las empresas | Endpoint reservado a RoleMaster |

## Pruebas añadidas

- `TestLoginRejectsUserAssignedToDifferentTenant`
- `TestSessionFromRequestRejectsCrossTenantUserBinding`
- `TestResolveTenantNeverFallsBackToUserOrSingleTenant`
- `TestMasterSessionCannotRestoreAnotherTenantSnapshot`
- `TestTenantAdminCannotResetAllTenants`
- `TestSyncPushRejectsForeignReferencesBeforeApplyingBatch`
- `TestBackupImportRejectsForeignTenantChild`
- `TestCIDRestoreRejectsForeignTenantChild`
- `TestLoadCIDRejectsPathTraversal`
- `TestValidateSnapshotReferencesRejectsForeignIDs`
- `TestValidateSnapshotReferencesAcceptsLocalReferences`
- `TestCIDRestoreRejectsForeignEntityReference`
- `TestBindSnapshotToTenantChecksAllTenantScopedModules`
- `TestPresenceEndpointListsOnlyRequestingTenant`
- `TestRESTReferencesMustBelongToSessionTenant`
- `TestFindUserByUsernameRejectsDuplicatesAcrossTenants`
- `TestLoginDisambiguatesLegacyDuplicateUsernamesByPassword`
- `TestMasterCannotCreateTenantWithGloballyDuplicatedAdminUsername`
- `TestMasterPasswordChangeRejectsAmbiguousCrossTenantUsername`
- `TestListOnlineForTenantDoesNotExposeOtherTenantClients`

## Segunda capa integrada

- Sincronización offline: prevalidación del lote completo antes de mutar el snapshot; rechaza `TenantID` explícitos distintos, cuentas inexistentes/ajenas en asientos y productos/unidades de otro tenant en ventas POS. No se aplica parcialmente un lote que falla en la prevalidación.
- Importación local y restauración CID: ambas validan estructura, ejecutan `BindSnapshotToTenant` y `ValidateSnapshotReferences`; rechazan registros hijos con tenant explícito diferente, normalizan `TenantID` vacío de snapshots legacy y verifican que las referencias internas resuelvan dentro del snapshot.
- Carga CID: se rechazan identificadores con separadores/ruta u otros caracteres no permitidos para impedir path traversal hacia archivos locales.
- Presencia: cada cliente autenticado se asocia al tenant de su sesión y el endpoint de administración solo lista clientes de ese tenant; el identificador de tenant no se expone en la respuesta.
- Endpoints REST: cuentas padre y asientos deben referenciar cuentas locales; ventas POS validan unidad, productos, precios y stock agregado antes de modificar existencias. Esto evita aceptar IDs ajenos/inexistentes y evita mutaciones parciales por líneas inválidas.
- Identidad global: el login no recibe un selector de tenant, por lo que las nuevas altas exigen nombres únicos en todo el servidor. El login compara todas las coincidencias legacy y acepta solo una cuenta activa cuya contraseña coincida; si las mismas credenciales identifican más de un tenant, rechaza el acceso. `FindUserByUsername` falla cerrado ante duplicados para operaciones administrativas por nombre. Si no se indica `admin_user`, se deriva uno del slug.
- Eventos SSE: comprobado que `EventHub.Subscribe(sess.TenantID)` separa los canales por tenant.

## Segunda iteración — sincronización y sesión

- `/me`: eliminada la reparación de `TenantID` y la búsqueda alternativa de usuario por ID. La respuesta exige que la clave del mapa, el ID, el tenant y el rol coincidan con la sesión ya autenticada.
- Sync push: valida los `TenantID` explícitos de entradas, facturas, inventario y ventas POS antes de aplicar operaciones.
- Sync push: las referencias de asientos deben existir en el snapshot y no declarar otro tenant; las unidades y productos de ventas POS deben existir en el snapshot y no declarar otro tenant.
- La prevalidación se ejecuta sobre el lote completo antes de aplicar entradas, facturas, inventario o ventas. Las pruebas verifican que un lote rechazado no persiste operaciones anteriores del mismo lote.
- Se conserva compatibilidad con registros locales legacy cuyo `TenantID` esté vacío, siempre que la referencia se resuelva dentro del snapshot de la sesión. Un `TenantID` explícito de otro negocio se rechaza.

### Pruebas añadidas en esta iteración

- `TestSyncPushRejectsForeignTenantAndReferencesAtomically`

## Tercera iteración — frontera de persistencia

- `Store.Put()` aplica `BindSnapshotToTenant()` antes de incrementar revisión, calcular CID o escribir archivos.
- Un registro hijo con `TenantID` explícito distinto al del snapshot hace fallar la persistencia, con independencia del endpoint que originó la mutación.
- Los `TenantID` vacíos de registros legacy se vinculan al tenant raíz antes de persistir; esta normalización ocurre en el límite de escritura y no durante la autenticación.
- Prueba: `TestStorePutRejectsForeignTenantChildAndBindsLegacyRecords`.

## Cuarta iteración — relaciones operativas en snapshots

- Se amplía `ValidateSnapshotReferences()` para comprobar las asignaciones de empleados almacenadas en metadata.
- `Employee.metadata.userId` debe resolver a un usuario del mismo snapshot mediante su ID canónico.
- Cada elemento de `Employee.metadata.unitIds` debe resolver a una unidad de venta del mismo snapshot. Se admiten las representaciones `[]string` y `[]any` producidas por código Go y JSON.
- Se rechazan tipos de metadata incorrectos, referencias ausentes y asignaciones a IDs externos.
- Pruebas: `TestValidateSnapshotReferencesRejectsForeignEmployeeAssignments` y `TestValidateSnapshotReferencesAcceptsLocalEmployeeAssignments`.

## Áreas todavía bajo auditoría

1. Backups: ampliar integridad referencial a las relaciones restantes y validar hashes/CID del contenido restaurado. Las asignaciones de empleado a usuario/PDV ya se validan.
2. Completar revisión de referencias por ID en endpoints REST: empleados, recepciones, fichas de costo/precio, transferencias, ajustes y documentos.
3. Endpoints globales: listado/creación de tenants, reset y cambio de contraseña master; la presencia ahora filtra por tenant. Los eventos SSE ya usan canales separados por tenant. Revisar manualmente los usernames duplicados con contraseña repetida.
4. Sincronización offline: revisar referencias de cada entidad adicional y la semántica de IDs/idempotencia; verificar con dos tenants y lotes mixtos.
5. Migraciones y snapshots antiguos: validar/reparar datos heredados en un paso controlado de migración, nunca durante el login o una petición ordinaria.

## Quinta iteración — integridad referencial completa del snapshot

- `ValidateSnapshotReferences` valida claves canónicas de mapas para usuarios, cuentas, inventario, empleados, productos, unidades de venta, fichas de costo, cargos y unidades de medida.
- Se valida `Entry.Counterpart` además de `AccountID`.
- `WarehouseStock` debe apuntar a un producto local y su clave debe coincidir con `ProductID`.
- Se mantienen las comprobaciones para nóminas, movimientos, asignaciones de empleados, recepciones, transferencias, POS, fichas, stocks de PDV, Kardex y pedidos online.
- Prueba: `TestValidateSnapshotReferencesRejectsNonCanonicalIDsAndMissingOperationalRefs`.

## Remediación de usernames legacy duplicados

1. Mantener el login bloqueado para identidades ambiguas; nunca elegir tenant por orden de búsqueda.
2. Crear y verificar una salva por cada tenant afectado.
3. Generar un inventario de usernames normalizados duplicados sin exponer hashes ni contraseñas.
4. El propietario de cada empresa identifica qué cuenta conserva el username original; las demás reciben usernames nuevos confirmados por sus administradores.
5. Aplicar cambios dentro del tenant correspondiente, revocar sesiones de las cuentas modificadas y registrar cada cambio.
6. Verificar unicidad global y probar login individual por tenant.

No se renombrarán identidades automáticamente: podría romper usuarios y referencias externas. Mientras no se confirme la remediación, las cuentas duplicadas permanecen bloqueadas de forma segura.

## Criterio de cierre

C2 no se considera terminado hasta demostrar con dos tenants independientes que un usuario de A no puede leer ni modificar datos de B mediante parámetros, IDs, payloads, backups, sync, endpoints globales o canales de eventos. CI y pruebas manuales deben quedar documentadas.
