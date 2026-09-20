# ÁbacoPhy

**Contabilidad para PyME** sobre la idea Alset: roles y tokens por sección, rastro **CID**, API REST y PWA con **offline primero**.

| | |
|--|--|
| App (producción) | https://abacophy.onrender.com |
| Alias ANS | `abacophy.app.ans` |
| En nodo Alset | https://prisma-tec.onrender.com/w/abacophy.app.ans |
| API | https://abacophy.onrender.com/api/v1 |
| Documentación API | [API.md](API.md) |
| Acceso (interno) | [LOGIN.md](LOGIN.md) |

La pantalla de la aplicación **no muestra** usuarios ni contraseñas.

## Qué resuelve

- Registro de **ingresos** y **gastos** con **partida doble**
- **Ecuación ampliada**: Activo = Pasivo + Patrimonio + (Ingresos − Gastos)
- **Inventario**, **nómina** y **facturación**
- Facturas exportables a **PDF** para impresión (datos del negocio + líneas + total)
- Varios **negocios** (tenants) en la misma instancia
- Uso desde el navegador (PWA) o desde una **app de terceros** vía API

## Cómo usar la aplicación (PWA)

1. Abra la URL de producción o `/w/abacophy.app.ans` en el nodo Alset.
2. Inicie sesión con el usuario que le hayan asignado (no aparecen claves en pantalla).
3. El menú superior solo muestra las **secciones permitidas por su rol**.
4. **Inicio**: totales e ecuación contable actualizada.
5. **Ingresos / Gastos**: cada asiento mueve la cuenta de resultado y la **Caja**.
6. **Facturas**: al emitir, se crea el ingreso contable; use el botón **PDF** para descargar e imprimir.
7. **Sincronizar**: si trabajó sin red, la cola offline se envía al recuperar conexión.
8. **Salir**: cierra la sesión del token.

Puede **instalar** la PWA en el móvil cuando el navegador lo ofrezca.

### Personalizar el negocio

Con rol administrador (o superior): pestaña **Negocio** → nombre, moneda, teléfono, dirección. Esos datos aparecen en el **PDF de facturas**.

## Roles (estilo Alset)

| Rol | Para quién | Qué puede hacer |
|-----|------------|-----------------|
| **master** | Operador de la plataforma | Crear negocios, ver tenants |
| **admin** | Dueño / gerente | Configurar negocio y operación completa |
| **contador** | Contabilidad | Cuentas, asientos, nómina, reportes |
| **operador** | Personal de mostrador | Ingresos, gastos, facturas, inventario |
| **readonly** | Consulta | Ver reportes e inventario sin modificar |

El login devuelve `views`. Cada petición comprueba esa lista. Detalle: **[API.md](API.md)**. Credenciales de arranque: **[LOGIN.md](LOGIN.md)**.

## Contabilidad: partida doble

- **Ingreso**: sube Caja (activo) y la cuenta de ingresos.
- **Gasto**: sube la cuenta de gastos y baja Caja.
- **Factura emitida**: asiento de ingreso enlazado; se recalcula la ecuación.

`GET /api/v1/reports/summary` incluye el bloque `ecuacion`.

## API para apps de terceros

Base: `https://abacophy.onrender.com/api/v1`

1. `POST /auth/login` → token  
2. Header `Authorization: Bearer …`  
3. Recursos: `/entries`, `/invoices`, `/reports/summary`, …  
4. PDF: `GET /invoices/pdf?id=…`  

Guía completa: **[API.md](API.md)**.

## Persistencia

| Capa | Descripción |
|------|-------------|
| Disco local | `ABACOPHY_DATA` |
| CID | `root_cid` por revisión |
| Cloudflare KV | Opcional vía `ABACOPHY_DO_URL` |

## Arranque local

```bash
git clone https://github.com/yecharlot/AbacoPhy.git
cd AbacoPhy
go mod tidy
go run ./cmd/abacophy
```

- App: http://localhost:8090/
- API: http://localhost:8090/api/v1/info

| Variable | Uso |
|----------|-----|
| `PORT` | Puerto HTTP |
| `ABACOPHY_DATA` | Datos |
| `ABACOPHY_STATIC` | PWA |
| `ABACOPHY_DO_URL` | Edge KV |
| `ABACOPHY_DO_TOKEN` | Bearer opcional al edge |

## Estructura

```
cmd/abacophy/     binario
internal/api/     REST
internal/auth/    tokens y ACL
internal/domain/  modelo y partida doble
internal/pdf/     PDF de facturas
internal/store/   disco + CID + edge
static/app/       PWA
API.md  LOGIN.md  README.md
```

## Seguridad

No publique claves reales en el repositorio. Use LOGIN.md solo en entornos controlados y rote las claves de demostración en producción.
