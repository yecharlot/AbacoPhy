# ÁbacoPhy — ROADMAP y estado del proyecto

## Qué es
ÁbacoPhy es un sistema contable para negocios (PyME) que corre sobre la infraestructura Alset/PrismaTEC: API REST, PWA offline-first, persistencia por snapshots/CID y roles con tokens.

## Por qué existe
Ofrecer contabilidad operable en Cuba (CUP y otras monedas), con trazabilidad explícita, nomenclador de cuentas alineado a prácticas locales, nómina con provisiones de vacaciones y seguridad social, e informes exportables — sin depender de un LLM ni de software cerrado extranjero.

## Hecho hasta ahora

| Área | Estado | Notas |
|------|--------|--------|
| API REST `/api/v1/*` | Estable | Auth Bearer, roles master/admin/contador/operador/readonly |
| Doble partida y ecuación ampliada | Estable | Activo = Pasivo + Patrimonio + (Ingresos − Gastos) |
| Inventario con promedio ponderado | Estable | Mismo producto+unidad+moneda fusiona costos |
| Facturas + PDF | Estable | |
| Nomenclador de cuentas (Cuba) | Mejorado | Grupos, naturaleza, edición completa |
| Nómina cubana | Mejorado | Vacaciones 9 %, SS entidad/trabajador, certificados, licencias, CRUD |
| Informes (situación, rendimiento, cuenta T, ecuación) | Mejorado | Exportación PDF |
| Salvas CID + export/import ZIP | Mejorado | Copia a disco local y restauración |
| Sync offline-first automática | Mejorado | Sin botón manual; eventos en traza |
| Tema claro / oscuro | Mejorado | Por defecto claro (serenidad) |
| Embed permanente en nodo | Estable | `/w/abacophy.app.ans` en PrismaTec |
| Auto-deploy Render | **Desactivado** | Solo se despliega bajo orden explícita |

## Decisiones de diseño
- **Master** = creador de la plataforma (mantenimiento, apariencia global, errores).
- **Admin** = dueño del negocio (opera el día a día, no cambia la paleta global del producto).
- Textos de traza en **español** y explícitos para diagnóstico.
- Deploy a producción solo cuando se ordene; desarrollo y prueba en local primero.

## Próximas versiones (no implementado aún)
- Multi-idioma (i18n).
- Más reportes oficiales (balance de comprobación detallado, libro mayor formal).
- Integración bancaria / transferencias.
- App móvil nativa del colega consumiendo la misma API.
- Durable Object dedicado con multi-tenant a escala.

## Cómo probar en local
```bash
go run ./cmd/abacophy
# abrir http://localhost:8080
# master / (ver LOGIN.md)
```

## URLs de referencia
- Servicio: `https://abacophy.onrender.com`
- Nodo ANS: `https://prisma-tec.onrender.com/w/abacophy.app.ans`
