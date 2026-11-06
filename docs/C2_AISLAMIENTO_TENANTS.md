# C2 — Auditoría de aislamiento entre tenants

**Rama:** `security-hardening`  
**Fase:** C2 — implementación incremental  
**Estado:** primera capa integrada; auditoría global pendiente.

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
- `TestPresenceEndpointListsOnlyRequestingTenant`
- `TestRESTReferencesMustBelongToSessionTenant`
- `TestFindUserByUsernameRejectsDuplicatesAcrossTenants`
- `TestMasterCannotCreateTenantWithGloballyDuplicatedAdminUsername`
- `TestMasterPasswordChangeRejectsAmbiguousCrossTenantUsername`
- `TestListOnlineForTenantDoesNotExposeOtherTenantClients`

## Segunda capa integrada

- Sincronización offline: prevalidación del lote completo antes de mutar el snapshot; rechaza `TenantID` explícitos distintos, cuentas inexistentes/ajenas en asientos y productos/unidades de otro tenant en ventas POS. No se aplica parcialmente un lote que falla en la prevalidación.
- Importación local: valida estructura y ejecuta `BindSnapshotToTenant`, que rechaza registros hijos con tenant explícito diferente y normaliza `TenantID` vacío de snapshots legacy.
- Presencia: cada cliente autenticado se asocia al tenant de su sesión y el endpoint de administración solo lista clientes de ese tenant; el identificador de tenant no se expone en la respuesta.
- Endpoints REST: cuentas padre y asientos deben referenciar cuentas locales; ventas POS validan unidad, productos, precios y stock agregado antes de modificar existencias. Esto evita aceptar IDs ajenos/inexistentes y evita mutaciones parciales por líneas inválidas.
- Identidad global: el login no recibe un selector de tenant, por lo que los nombres de usuario deben ser únicos en todo el servidor. `FindUserByUsername` ahora falla cerrado ante duplicados; altas de usuarios y creación de tenants verifican unicidad global. Si no se indica `admin_user`, se deriva uno del slug.
- Eventos SSE: comprobado que `EventHub.Subscribe(sess.TenantID)` separa los canales por tenant.

## Áreas todavía bajo auditoría

1. Importación local de salvas: ampliar validación a integridad referencial completa entre cuentas, empleados, productos, unidades, movimientos, ventas y documentos.
2. Completar revisión de referencias por ID en endpoints REST: empleados, recepciones, fichas de costo/precio, transferencias, ajustes y documentos.
3. Endpoints globales: listado/creación de tenants, reset y cambio de contraseña master; la presencia ahora filtra por tenant. Los eventos SSE ya usan canales separados por tenant. Revisar la migración de usernames duplicados preexistentes.
4. Sincronización offline: tenant del sobre, idempotencia, referencias y eventos deben permanecer dentro del tenant autenticado.
5. Migraciones y snapshots antiguos: validar/reparar datos heredados en un paso controlado de migración, nunca durante el login o una petición ordinaria.

## Criterio de cierre

C2 no se considera terminado hasta demostrar con dos tenants independientes que un usuario de A no puede leer ni modificar datos de B mediante parámetros, IDs, payloads, backups, sync, endpoints globales o canales de eventos. CI y pruebas manuales deben quedar documentadas.
