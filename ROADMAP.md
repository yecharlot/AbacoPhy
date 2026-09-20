# ÁbacoPhy — ROADMAP y estado del proyecto

## Qué es
ÁbacoPhy es un **sistema contable para negocios** (PyME y TCP) construido sobre la infraestructura **Alset / PrismaTEC**: API REST consumible por apps móviles, PWA responsive offline-first, persistencia por snapshots y CID, roles y tokens.

## Por qué existe
Dar a negocios en Cuba una contabilidad operable (CUP y otras monedas), con:
- trazabilidad explícita en español,
- nomenclador de cuentas alineado a prácticas de Finanzas y Precios,
- nómina con provisiones de vacaciones y seguridad social,
- informes exportables a PDF,
- salvas exportables a disco local (ZIP),
sin depender de software cerrado extranjero ni de un LLM.

## Decisiones de producto
| Rol | Quién es | Qué puede |
|-----|----------|-----------|
| **master** | Creador de la plataforma (tú) | Mantenimiento remoto, apariencia global, errores, todos los tenants |
| **admin** | Dueño del negocio | Opera el día a día; **no** cambia la paleta global del producto |
| contador / operador / readonly | Personal del negocio | Según vistas ACL |

- **Auto-deploy en Render: desactivado.** Solo se despliega cuando se ordene explícitamente tras validar en local.
- Textos de traza en **español** y detallados (para diagnosticar errores de registro).
- Tema por defecto: **claro** (fondo sereno `#F7F4EC`, acento PrismaTEC `#F4B400`).

## Hecho hasta el momento

| Área | Estado | Notas |
|------|--------|--------|
| API REST `/api/v1/*` | Estable | Auth Bearer, roles |
| Doble partida + ecuación ampliada | Estable | Activo = Pasivo + Patrimonio + (Ingresos − Gastos) |
| Inventario + promedio ponderado | Estable | Mismo nombre+unidad+moneda fusiona costos |
| Facturas + PDF | Estable | |
| Nomenclador de cuentas (Cuba) | Estable | CRUD completo (código, tipo, naturaleza, grupo, notas) |
| Nómina cubana | Estable | Vacaciones **9 %**, SS entidad **12,5 %**, SS trabajador **5 %**, certificados, licencias, CRUD + liquidación |
| Informes unificados | Estable | Situación, rendimiento, cuentas T, ecuación ampliada |
| Exportación PDF de informes | Estable | Con nombre del negocio |
| Salvas CID + ZIP local | Estable | Exportar/importar desde disco extraíble |
| Sync offline-first automática | Estable | Sin botón manual; estado en badge; eventos en traza |
| Tema claro / oscuro | Estable | Selector; por defecto claro |
| UI sidebar fija (marca arriba, menú con scroll) | Estable | Iconos SVG |
| PWA + icono Ábaco | Estable | Instalable en móvil |
| Embed permanente en nodo | Estable | `/w/abacophy.app.ans` vía `ensureAbacoPhyApp` |
| Auto-deploy Render | **Off** | Solo bajo orden |

## Estructura del menú (optimizada)
- Inicio, Ingresos, Gastos, Inventario, Facturas, Nómina  
- **Nomenclador de cuentas**, Monedas  
- **Informes** (situación · rendimiento · cuentas T · ecuación)  
- Traza, Salvas CID, Negocio  
- Apariencia / Master (solo master)

## Cómo probar en local (antes de cualquier deploy)
```bash
cd AbacoPhy
go run ./cmd/abacophy
# http://localhost:8080
# Credenciales: ver LOGIN.md (no se muestran en pantalla)
```

## Cómo desplegar (solo cuando se ordene)
1. Validar en local la batería de flujos (login, asientos, inventario promedio, nómina, informes PDF, ZIP, offline).
2. `git push` al repo.
3. Orden explícita: «deploy ahora» → deploy manual en el servicio Render `abacophy` (autoDeploy=no).
4. Si aplica, actualizar embed en PrismaTec y deploy del nodo bajo la misma orden.

## Próximas versiones (no implementado)
- Multi-idioma (i18n).
- Balance de comprobación y libro mayor formal.
- Integración bancaria / transferencias.
- App móvil nativa del colega sobre la misma API.
- Durable Object multi-tenant a escala.
- Más cuentas del nomenclador oficial según resolución vigente.

## URLs de referencia
- Servicio: `https://abacophy.onrender.com`
- Nodo ANS: `https://prisma-tec.onrender.com/w/abacophy.app.ans`
- Repo: `https://github.com/yecharlot/AbacoPhy`
