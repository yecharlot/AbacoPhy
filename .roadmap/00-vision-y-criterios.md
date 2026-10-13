# 00 — Visión y criterios de aceptación global

## Visión

ÁbacoPhy debe permitir operar un negocio PyME de punta a punta:

```
Compra declarada → Entrada física almacén → Transferencia a PDV
 → Venta (online u offline) → Contabilidad → Auditoría / salva
```

con la garantía de que, tras un corte de red de hasta **6 horas**, el sistema:

1. Sigue permitiendo vender en el PDV.
2. No inventa ni borra operaciones válidas.
3. Al recuperar red, converge a un estado coherente (o marca explícitamente lo que requiere revisión humana).

## Definición de “software confiable” (Definition of Done global)

Se considera alcanzado cuando **todos** estos criterios son verdaderos:

| # | Criterio | Verificación |
|---|----------|--------------|
| G1 | Toda venta offline con `client_op_id` es idempotente en servidor | E2E + test de doble envío |
| G2 | No quedan ventas “fantasma” (201 en servidor + REJECTED en outbox sin reconciliar) | Checklist de reconciliación |
| G3 | Stock PDV tras transferencia web se actualiza en POS sin acción del vendedor | SSE `stock.transfer` E2E |
| G4 | Debe = Haber en libro tras venta, recepción confirmada y gasto | Job o test de integridad |
| G5 | Mutaciones críticas devuelven 403 sin permiso real (no solo UI oculta) | Suite de gate por rol |
| G6 | Backup → restore en instancia limpia reproduce inventario, ventas, usuarios y contabilidad | Runbook ejecutado y firmado |
| G7 | CI bloquea merge si fallan tests críticos (Go + web + compile KMP) | Pipeline verde obligatorio |
| G8 | Runbook operativo existe para: backend caído, descuadre kardex, cola rechazada, restaurar salva | Documento en repo |

## Fuera de alcance de este roadmap (post-confiable)

- Pedidos online maduros, promociones complejas, multi-impuesto avanzado por PDV.
- Multi-instancia backend con bus de eventos distribuido (el hub SSE actual es in-process).
- App cliente final / e-commerce.

## Métricas mínimas a observar

- % operaciones outbox confirmadas vs rechazadas (objetivo: rechazos solo por negocio, no por parse/red mal clasificada).
- Tiempo medio desde “backend up” hasta “cola drenada”.
- Número de descuadres kardex abiertos > 24 h.
- Fallos de CI en `main` / rama de release.
