# Acceso a ÁbacoPhy (uso interno)

> **Este archivo no se muestra en la aplicación.**  
> Las pantallas de la PWA no listan usuarios ni contraseñas.

Las claves por defecto existen solo para el **primer arranque** del negocio demo.  
**Cámbielas de inmediato** en cualquier entorno que no sea de prueba local.

---

## Instancia de demostración (bootstrap)

| Usuario | Contraseña | Rol | Alcance |
|---------|------------|-----|---------|
| `master` | `AbacoPhy#Master1` | master | Mantenimiento de la instancia: listar y crear negocios (tenants). Transparente al usuario final del negocio. |
| `admin` | `admin123` | admin | Administrador del negocio demo (`slug: demo`). |

---

## Cómo iniciar sesión (API)

```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "username": "<usuario>",
  "password": "<contraseña>"
}
```

Respuesta (extracto):

```json
{
  "token": "<token opaco>",
  "expires_at": "...",
  "user": {
    "id": "...",
    "username": "...",
    "display_name": "...",
    "role": "admin",
    "tenant_id": "..."
  },
  "views": ["dashboard", "ingresos", "gastos", ...]
}
```

En las peticiones siguientes:

```http
Authorization: Bearer <token>
```

Cierre de sesión: `POST /api/v1/auth/logout` con el mismo encabezado.

---

## Roles (modelo Alset / vistas)

| Rol | Código API | Secciones típicas |
|-----|------------|-------------------|
| Master | `master` | Todas + panel master (tenants) |
| Administrador | `admin` | Negocio, usuarios, cuentas, reportes, operación |
| Contador | `contador` | Asientos, cuentas, nómina, reportes |
| Operador | `operador` | Ingresos, gastos, facturas, inventario diario |
| Solo lectura | `readonly` | Consulta de reportes e inventario |

La lista exacta de vistas permitidas se devuelve en `views` al hacer login y en `GET /api/v1/auth/me`.  
El servidor rechaza con **403** cualquier ruta fuera del ACL del rol (equivalente a “órgano” de permiso en la filosofía Alset: solo entra quien el token autoriza).

---

## Tokens

- Tipo: token opaco aleatorio (no JWT).
- Vigencia por defecto: **72 horas**.
- Almacenamiento en el servidor en memoria de sesiones (+ persistencia de negocio en disco/CID/KV).
- En la PWA se guarda en `localStorage` solo el token, nunca la contraseña.

---

## Crear otro negocio (solo master)

```http
POST /api/v1/master/tenants/create
Authorization: Bearer <token-master>
Content-Type: application/json

{
  "name": "Mi PyME",
  "slug": "mi-pyme",
  "currency": "CUP",
  "admin_user": "admin",
  "admin_pass": "<clave-segura>"
}
```

Ese administrador nuevo es el acceso del negocio; el master no debe usarse en el día a día del cliente final.

---

## Producción

URLs de referencia:

- App: https://abacophy.onrender.com  
- En nodo Alset: https://prisma-tec.onrender.com/w/abacophy.app.ans  

Tras el despliegue, documente aquí (o en un gestor de secretos) las claves **reales** del entorno y elimine o rote las de demostración.


## Reinicio de fábrica (solo master)

Desde el panel Master → **Restaurar a estado inicial**, o:

```http
POST /api/v1/master/reset
Authorization: Bearer <token-master>
Content-Type: application/json

{ "confirm": "REINICIAR" }
```

Tras el reinicio use de nuevo `master` / `AbacoPhy#Master1` y `admin` / `admin123`.


## Cambiar contraseñas desde la aplicación

1. Inicie sesión con el usuario cuya clave desea cambiar (o con `admin` / `master`).
2. Menú **Negocio** → sección **Seguridad · cambiar contraseña**.
3. Indique la contraseña actual del usuario en sesión y la nueva (mínimo 6 caracteres).
4. Si es admin/master, el campo **Usuario objetivo** permite restablecer la clave de otro usuario del negocio sin conocer la anterior del objetivo (sí debe conocer la suya propia).

Endpoint: `POST /api/v1/auth/password`


## Roles operativos

| Rol | Acceso típico |
|-----|----------------|
| vendedor | Vendedor (POS), inicio |
| almacenero | Almacén, recepción, inventario, nomenclador productos |
| economico | Contabilidad, informes, nómina, fichas, traza |
| admin | Todo el negocio + usuarios |

Créelos en **Usuarios** (solo admin/master).
