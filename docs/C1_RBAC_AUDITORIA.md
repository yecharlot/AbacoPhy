# C1 — Auditoría de autorización RBAC

**Ámbito:** API Go de AbacoPhy. Los controles se ejecutan en backend; ocultar vistas en el frontend no concede ni sustituye autorización.

## Modelo efectivo

1. La sesión debe ser válida y el usuario debe estar activo.
2. El permiso se resuelve con el rol, la política de permisos del tenant y los grants/revocaciones explícitos del usuario.
3. El módulo del negocio debe estar habilitado.
4. Las operaciones mutables pasan por `gateWrite` / `gateOp` y `auth.CanMutate`.
5. `readonly` no puede mutar bajo ninguna combinación de permisos.
6. `master` es un espacio reservado a `RoleMaster`; una política de tenant no puede elevar otro rol a master.
7. El endpoint de usuarios solo admite los roles de `auth.ValidRoles()`; no admite crear/promover usuarios a master ni roles desconocidos.

## Matriz endpoint → permiso → operación

| Endpoint / grupo | Permiso o control | Lectura | Escritura |
|---|---|---|---|
| `/tenant` | `tenant` | gate | gateWrite |
| `/accounts` | `cuentas` (+ `reportes` en consultas de balance) | gate | gateWrite |
| `/entries` | `reportes` para lectura; `ingresos` o `gastos` según tipo para alta | gate | gateWrite |
| `/inventory`, `/inventory/out` | `inventario` | gate | gateWrite |
| `/payroll/employees`, `/payroll/payslips`, `/payroll/pdf` | `nomina` | gate | gateWrite |
| `/invoices`, `/invoices/pdf` | `facturas` | gate | gateWrite |
| `/sync`, `/sync/push`, `/sync/notify` | `sync` | gate | gateWrite; notify solo POST |
| `/reports/summary`, `/reports/financial`, `/reports/trial-balance`, `/reports/pdf`, `/reports/balance-sheet` | `dashboard` / `reportes` | gate | solo métodos permitidos por endpoint |
| `/products` | `productos` | gate | gateWrite + restricciones específicas de vendedor |
| `/units` | `unidades` | gate | gateWrite |
| `/warehouse`, `/transfers`, `/kardex`, `/inventory/adjust`, `/inventory/reconcile` | `almacen` | gate | gateWrite; ajuste exige almacenero/admin/master |
| `/receptions` | `recepcion` o `almacen` según lectura; alta documental `recepcion`; entrada física `almacen` | gate alternativo | gateWrite + rol económico/admin/master para crear; almacenero/admin/master para entrada |
| `/pos/sales` | `vendedor` | gate | gateWrite |
| `/cost-sheets` | `fichas_costo` | gate | gateWrite |
| `/price-sheets` | `fichas_precio` | gate | gateWrite |
| `/job-positions` | `cargos` | gate | gateWrite |
| `/measure-units` | `measure_units` o `nomencladores` | gate alternativo | gateWrite alternativo |
| `/currencies` | `monedas` | gate | gateWrite |
| `/accounts/t`, `/accounts/t/all` | `cuentas_t` | gate | no mutación |
| `/ledger` | `cuentas_t` | gate | no mutación |
| `/ledger/integrity`, `/audit` | `traza` | gate | solo métodos permitidos |
| `/backups`, `/backups/export`, `/backups/restore`, `/backups/import` | `salvas` + restricciones de rol en importación | gate | gateWrite |
| `/users`, `/role-permissions` | `usuarios`; master/admin explícitos | gate | gateWrite / master-admin explícito |
| `/modules` | master explícito | autenticado | solo master |
| `/master/tenants`, `/master/tenants/create`, `/master/reset` | master | master | master; reset elimina todos los tenants |
| `/presence` | admin/master explícito | admin/master | no mutación |
| `/theme` | sesión autenticada para lectura; master para escritura | autenticado | master |
| `/errors` | master explícito | master | master |
| `/auth/me`, `/auth/logout`, `/auth/password` | sesión; cambio propio; admin/master para cambio forzado | autenticado | autenticado según operación |

Los endpoints de salud, información, assets y login son públicos por diseño. Los demás endpoints con datos de negocio requieren sesión.

## Hallazgos corregidos

- `POST /entries` utilizaba `gate` (lectura) en vez de `gateWrite`; ahora readonly no puede registrar asientos aunque tenga grant explícito.
- `CanInTenant` y `CanAccessUser` impedían parcialmente la elevación a `master`, pero un grant explícito por usuario podía saltarse esa restricción. Ahora `master` es exclusivo de `RoleMaster`, y `usuarios`/`tenant` de admin/master; el endpoint de permisos también sanea esos grants.
- La edición de usuarios aceptaba roles arbitrarios; ahora se valida contra `auth.ValidRoles()`, que excluye master.
- Endpoints de monedas, importación de salvas, notificación de sincronización, Kardex, reconciliación, mayor, balance e integridad contable ahora aplican gates.
- Lecturas de recepción y entradas físicas ya no omiten las restricciones de módulo/grants por ser admin o por pertenecer a una lista fija de roles.
- Ajustes de inventario ya no permiten a admin saltarse un módulo almacén deshabilitado.

## Pruebas

- `TestReadonlyCannotPostEntriesWithExplicitGrant`: la API responde 403 y no persiste asiento.
- `TestTenantRolePolicyCannotPromoteAdminToMasterEndpoint`: admin no accede al endpoint master aunque el tenant intente conceder el permiso.
- `TestTenantPolicyCannotGrantMasterToAnotherRole`.
- `TestReadonlyCannotMutateWithExplicitUserGrantOrRolePolicy`.
- Se conservan las pruebas existentes de permisos y epochs.

## Excepciones conocidas / revisión manual

- `/theme` GET conserva lectura para cualquier sesión autenticada porque sirve la personalización visual del negocio; escritura es master-only.
- `/modules` GET conserva lectura autenticada; cambios son master-only.
- `/master/reset` queda reservado a `RoleMaster` porque `Store.ResetAll` elimina todos los tenants y tokens; un admin de negocio no puede ejecutarlo.
- La matriz no sustituye pruebas manuales con cada rol ni la auditoría de aislamiento multi-tenant C2.
