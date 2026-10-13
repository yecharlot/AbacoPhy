# Fase 06 — Backup, auditoría operativa y CI de producto

**Prioridad:** media-alta  
**Capas:** Backend + Web + CI (+ KMP compile)  
**Por qué:** sin restore probado y sin red de seguridad en merge, la confiabilidad se rompe en el primer incidente real.

## Backup / restore

| ID | Tarea | Detalle |
|----|--------|---------|
| 06.B1 | Export ZIP íntegro | Contenido verificable (hash / content_sha). |
| 06.B2 | Import en instancia limpia | Comparar: usuarios, unidades, stock, ventas, cuentas, asientos. |
| 06.B3 | Backup corrupto | Error claro; no dejar snapshot a medias. |
| 06.W1 | UI salvas | Export/import con toasts y errores exactos (no solo “sin red”). |

## Auditoría

| ID | Tarea | Detalle |
|----|--------|---------|
| 06.A1 | Consulta filtrable | Acción, usuario, rango fechas, ref. |
| 06.A2 | Operaciones críticas siempre auditadas | Transfer, confirm recepción, restore, cambio permisos, venta anulada si aplica. |

## CI

| ID | Tarea | Detalle |
|----|--------|---------|
| 06.C1 | Pipeline web | `svelte-check` + tests unitarios críticos. |
| 06.C2 | Pipeline Go | `go test` + vet en paquetes domain/api. |
| 06.C3 | Pipeline KMP | Al menos `compileKotlinJvm` / assemble debug. |
| 06.C4 | Gate de merge | Rojo bloquea; no “ignorar CI” en main. |

## Criterio de salida

- [ ] Restore limpio verificado con checklist de datos.
- [ ] CI verde obligatorio en la rama de release.
- [ ] Traza permite responder “quién restauró / quién transfirió / quién cambió permisos”.
