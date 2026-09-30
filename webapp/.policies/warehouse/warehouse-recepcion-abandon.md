# Abandono definitivo de IR (solo frontend + metadata existente)

## Sin cambio de esquema backend
Se reutiliza `POST /receptions/enter` con:
```json
{ "id": "...", "accept": false, "reason": "[ABANDONADO] motivo del cierre" }
```

El backend ya persiste el motivo en:
- `metadata["int.reception_problem_reason"]`
- `note` (concatenado)
- traza `recepcion.problema_entrada` (evento existente)

## Convención FE
- Prefijo **`[ABANDONADO]`** en el motivo.
- La UI clasifica esos IR como **Abandonada** (terminal), no como incidencia recuperable.
- No se ofrece “Resolver / Dar entrada” sobre abandonadas.
- El económico debe **crear un IR nuevo** si la compra sigue vigente.

## Estados visuales
| UI            | Detección FE                                      |
|---------------|---------------------------------------------------|
| Incidencia    | problemas_entrada sin marcador de abandono        |
| Abandonada    | motivo contiene `[ABANDONADO]` o status `anulado`  |

## Limitación conocida
El status API sigue siendo `problemas_entrada` hasta que el backend exponga
`anulado` de forma nativa. La regla de negocio se aplica en UI y en trazas
(texto del motivo). No se mueve stock ni contabilidad (accept:false).
