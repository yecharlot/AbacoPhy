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

Cada variable debe contener al menos 12 caracteres. Los valores se leen desde el entorno, no se escriben en Git ni se muestran en logs. También se exige el cambio de contraseña en el primer acceso.

No coloque estos valores en `.env` versionados, Dockerfiles, scripts públicos ni documentación.

## Migración de instalaciones existentes

En el primer arranque con esta versión, cada tenant existente rota una sola vez las contraseñas de las cuentas con rol `master` y `admin`, invalida sus sesiones anteriores y marca esas cuentas para cambio obligatorio. Las nuevas credenciales aleatorias se entregan mediante el archivo temporal descrito arriba, salvo que se hayan configurado variables de entorno.

La migración se registra en los ajustes del tenant para no repetir la rotación en cada reinicio.

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
