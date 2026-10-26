# Runbook 02.T1 — Backend caído / POS offline (6 h)

## Objetivo
Verificar que el PDV sigue vendiendo sin servidor y que, al recuperar red, la cola se drena y los listados cuadran.

## Preparación
1. POS KMP con sesión de vendedor y PDV asignado.
2. Catálogo y stock del PDV ya cargados (haber entrado online al menos una vez).
3. Backend en `http://…:8090` accesible inicialmente.

## Pasos
1. **Baseline online**  
   - Registrar 1 venta online (debe confirmarse, no `PENDIENTE`).  
   - Anotar `client_op_id` si se ve en logs.

2. **Tirar el backend**  
   - Detener el proceso Go / cortar red al host del API.

3. **Operar offline (simular corte)**  
   - Registrar N ≥ 3 ventas.  
   - Comprobar:  
     - Listado muestra ventas `pending_local` / PENDIENTE.  
     - Stock del PDV **baja** en UI (provisional).  
     - **No** aparece modal bloqueante de “sin servidor” (solo chip/rail).  
     - Botón registrar sigue habilitado si hay PDV + catálogo.

4. **(Opcional) Transferencia web**  
   - Con backend up en otra máquina o tras reinicio: transfer desde web al PDV.  
   - POS offline no la ve hasta reconectar; al reconectar debe refrescar stock (SSE).

5. **Levantar backend**  
   - Esperar SSE Connected / health OK.  
   - Sin tocar “sincronizar” manual: la cola debe drenar sola.  
   - Ventas pasan de pendiente a número VT-…  
   - Stock se reconcilia con servidor (puede corregir sobreventa).

6. **Idempotencia**  
   - Si una venta se reintenta, no debe duplicarse en `/pos/sales` (fase 01).

## Resultado
| Check | OK |
|-------|----|
| Ventas offline en listado local | ☐ |
| Stock provisional baja | ☐ |
| Sin modal bloqueante en sesión | ☐ |
| Drain automático al volver | ☐ |
| Sin duplicados por reintento | ☐ |

**Fecha / entorno / responsable:** _______________
