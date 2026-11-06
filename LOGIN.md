# Acceso seguro a ÁbacoPhy

ÁbacoPhy **no incluye usuarios ni contraseñas administrativas reutilizables** en el código, la documentación ni la salida de consola.

## Primer arranque

En una instalación nueva, el servidor crea las cuentas administrativas `master` y `admin` con contraseñas aleatorias criptográficamente seguras.

- Las credenciales generadas se guardan en `ABACOPHY_DATA/bootstrap-credentials.txt`.
- Si no se configura `ABACOPHY_DATA`, la ruta predeterminada es `./abacophy_data/bootstrap-credentials.txt`.
- En sistemas POSIX el archivo se crea con permisos `0600`.
- El servidor registra únicamente la ruta del archivo y nunca imprime las contraseñas.
- El operador debe recuperar el archivo por un canal administrativo seguro y entregar las credenciales individualmente.
- En el primer inicio de sesión, el sistema bloquea el resto de la API hasta que el usuario defina una contraseña privada de al menos 12 caracteres.

Después de que todos los usuarios pendientes completen el cambio inicial, el archivo temporal se elimina automáticamente.

## Credenciales administradas por el despliegue

Para entornos donde el operador no pueda recuperar un archivo del sistema, pueden definirse antes del primer arranque:

- `ABACOPHY_BOOTSTRAP_MASTER_PASSWORD`
- `ABACOPHY_BOOTSTRAP_ADMIN_PASSWORD`

Cada variable debe contener al menos 12 caracteres. Estas variables solo se aplican a las cuentas creadas durante el primer bootstrap de una instalación nueva. Los valores se leen desde el entorno, no se escriben en Git ni se muestran en logs. También se exige el cambio de contraseña en el primer acceso. En migraciones y en la creación posterior de negocios se generan contraseñas aleatorias independientes y se entregan mediante el archivo protegido.

No coloque estos valores en `.env` versionados, Dockerfiles, scripts públicos ni documentación.

## Migración de instalaciones existentes

Antes de actualizar una instalación operativa, realiza una copia de seguridad completa de `ABACOPHY_DATA` y confirma que puedes acceder al directorio de datos del servidor para recuperar el archivo temporal.

En el primer arranque con esta versión, cada tenant existente rota una sola vez las contraseñas de las cuentas con rol `master` y `admin`, invalida sus sesiones anteriores y marca esas cuentas para cambio obligatorio. Las nuevas credenciales aleatorias se entregan mediante el archivo temporal descrito arriba. Las variables de entorno de bootstrap solo se aplican a una instalación nueva, no a esta migración.

La migración se registra en los ajustes del tenant para no repetir la rotación en cada reinicio. La creación posterior de un negocio desde el panel master también genera credenciales independientes para sus cuentas administrativas y las añade al mismo archivo temporal protegido; ya no acepta una contraseña administrativa predefinida.

## API de autenticación

Inicio de sesión:

```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "username": "<usuario>",
  "password": "<contraseña>"
}
```

La respuesta incluye `user.must_change_password`. Mientras sea `true`, las operaciones autenticadas quedan bloqueadas; solo se permiten consultar la sesión, cerrar sesión y cambiar la contraseña.

Cambio obligatorio o voluntario:

```http
POST /api/v1/auth/password
Authorization: Bearer <token>
Content-Type: application/json

{
  "current_password": "<contraseña actual>",
  "new_password": "<nueva contraseña>"
}
```

Al completar el cambio, el servidor elimina la marca de cambio obligatorio y revoca las demás sesiones del usuario, conservando la sesión que acaba de completar el cambio.

## Reinicio de fábrica

`POST /api/v1/master/reset` elimina los datos y sesiones de la instancia y genera credenciales temporales nuevas. No restaura contraseñas conocidas. El archivo temporal vuelve a crearse en el directorio de datos y el primer acceso vuelve a exigir el cambio de contraseña.

## Roles

| Rol | Alcance |
|---|---|
| `master` | Mantenimiento de la instancia y gestión de tenants |
| `admin` | Administración del negocio |
| `contador` / `economico` | Contabilidad y reportes |
| `operador` / `vendedor` | Operación diaria |
| `almacenero` | Almacén y recepción |
| `readonly` | Consulta sin escritura |


## Política de contraseñas (B1)

Todas las contraseñas nuevas o modificadas —incluidos usuarios normales, cambios propios,
cambios administrativos y credenciales de bootstrap configuradas por entorno— pasan por
la misma validación del backend:

- Mínimo de 12 caracteres Unicode.
- Máximo de 72 bytes UTF-8, límite de bcrypt; se rechaza el exceso y nunca se trunca.
- Se permiten frases de contraseña y espacios. No se exige una combinación artificial de
  mayúsculas, minúsculas, números o símbolos.
- La contraseña no se recorta ni normaliza: los espacios forman parte de su valor.
- Las contraseñas existentes no se modifican automáticamente; la política se aplica al
  establecer una contraseña nueva.

El backend valida antes de generar el hash. La interfaz puede anticipar el requisito, pero
no sustituye esta validación.


## Política de sesiones (B2)

Las sesiones son bearer tokens con expiración absoluta desde el inicio de sesión:

- Usuarios estándar: 12 horas.
- Roles privilegiados `admin` y `master`: 4 horas.
- El cierre de sesión revoca el token actual.
- Los cambios de rol, permisos o estado del usuario invalidan sus sesiones; los cambios de permisos del tenant invalidan sesiones mediante el epoch de permisos.
- Al cambiar la contraseña, se revocan las demás sesiones del usuario y se conserva únicamente la sesión desde la que se realizó el cambio.

Los tokens se persisten en `tokens.json` con permisos 0600 en sistemas compatibles. La escritura se realiza mediante archivo temporal y reemplazo, y los tokens expirados se depuran al iniciar el Store y al consultarlos.

No existe renovación automática ni refresh token en esta etapa. El cifrado en reposo queda pendiente hasta definir una clave maestra con ciclo de vida y recuperación seguros; no se presenta el permiso del archivo como sustituto del cifrado.
