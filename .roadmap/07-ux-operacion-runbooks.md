# Fase 07 — UX de confianza, operación y cierre

**Prioridad:** media (después de integridad)  
**Capas:** Web + KMP + docs  
**Por qué:** un sistema correcto que el usuario no entiende en el fallo se percibe como no confiable.

## UX

| ID | Tarea | Detalle |
|----|--------|---------|
| 07.U1 | Errores accionables | Cada error de red/negocio: qué pasó + qué hacer (reintentar, ver cola, config URL, contactar admin). |
| 07.U2 | Cola visible | Badge + listado mínimo de pendientes/rechazadas en POS. |
| 07.U3 | Descuadre kardex | Texto de negocio: impacto + pasos de corrección (sin improvisar asientos a mano sin traza). |
| 07.U4 | Paridad web/KMP | Precios, PDV asignado, estados de venta alineados en lenguaje y datos. |

## Runbooks (repo)

Crear bajo `.roadmap/runbooks/`:

| ID | Runbook |
|----|---------|
| 07.R1 | Backend caído / POS offline |
| 07.R2 | Venta en cola rechazada |
| 07.R3 | Descuadre de kardex |
| 07.R4 | Restaurar salva |
| 07.R5 | Recuperar URL base en KMP |

## Cierre del roadmap

| ID | Tarea |
|----|--------|
| 07.C1 | Ejecutar checklist global G1–G8 de `00-vision-y-criterios.md` |
| 07.C2 | Tag de versión “reliability-baseline” o release notes equivalentes |
| 07.C3 | Lista explícita de riesgos residuales aceptados |

## Criterio de salida

- [ ] G1–G8 en verde.
- [ ] Runbooks revisados por alguien que no implementó la feature.
- [ ] Riesgos residuales escritos (no implícitos).
