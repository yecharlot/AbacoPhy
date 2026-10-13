# Fase 04 — Contabilidad como fuente única

**Prioridad:** alta  
**Capas:** Backend (+ UI reportes web)  
**Por qué:** sin libro único y Debe=Haber, el sistema no es confiable para el negocio ni para fiscal/auditoría interna.

## Entrada

- Asientos desde venta, gastos, recepciones (según fases previas del backend).
- Reportes: balance, resultados, diario, mayor.

## Tareas

### Backend

| ID | Tarea | Detalle |
|----|--------|---------|
| 04.B1 | Matriz de escritura | Tabla: operación → cuentas tocadas → momento (ej. recepción solo al confirmar almacén). |
| 04.B2 | Invariante Debe = Haber | Función de integridad; endpoint o job ya existente (`/ledger/integrity`) debe ser la fuente. |
| 04.B3 | Venta POS online y offline confirmada | Misma ruta contable al persistir venta definitiva. |
| 04.B4 | Recepción abandonada / rechazada | No debe dejar gastos ni stock a medias. |
| 04.B5 | Tests de regresión | Casos: venta, COGS, gasto de personal, transferencia (sin efecto en ecuación de patrimonio por solo movimiento de inventario). |

### Web

| ID | Tarea | Detalle |
|----|--------|---------|
| 04.W1 | Superficie de integridad | Resumen o aviso si integrity falla (rol contador/admin). |
| 04.W2 | Reportes alineados | Balance / PyG / diario leen la misma fuente que el ledger. |

## Criterio de salida

- [ ] Tras batería de operaciones de prueba, integrity OK.
- [ ] Transferencia no distorsiona resultados (solo inventario).
- [ ] Recepción no confirmada no mueve costo promedio ni stock ni gasto indebido.

## Documentación

Actualizar políticas en features afectadas y `.backend_log` por bloque de cambios.
