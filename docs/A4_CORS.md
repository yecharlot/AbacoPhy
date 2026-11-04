# A4 — Política CORS configurable de AbacoPhy

**Rama:** `security-hardening`  
**Estado:** implementación inicial de backend y Launcher integrada; CI y validación manual pendientes.

## 1. Hallazgo

El middleware anterior añadía `Access-Control-Allow-Origin: *` a todas las respuestas y contestaba cualquier solicitud `OPTIONS` con HTTP 204, sin validar el origen.

La arquitectura integrada sirve la PWA y la API desde el mismo origen. Sin embargo, el Launcher no ofrecía una forma de autorizar de manera controlada instalaciones donde una webapp se aloje en otro host, IP o puerto.

## 2. Política y sintaxis de reglas

El Launcher ofrece un gestor visual de reglas: una entrada de una sola línea para introducir IP, subred IPv4 o dominio, un botón **Agregar** y una lista de reglas existentes con acciones **Editar**, **Eliminar** y **Activar/Desactivar**. Cada regla se introduce individualmente. Se admiten:

| Regla | Coincidencia |
|---|---|
| `10.10.10.10` | IP exacta, cualquier puerto |
| `10.10.10.10:8080` | IP exacta, puerto 8080 |
| `10.10.10.0/24` | Todas las IPv4 de la subred, cualquier puerto |
| `10.10.10.0/24:8080` | Todas las IPv4 de la subred, puerto 8080 |
| `panel.empresa.com` | Host DNS exacto, cualquier puerto |
| `panel.empresa.com:8443` | Host DNS exacto, puerto 8443 |

Las reglas no incluyen esquema. Se comparan contra el esquema, host y puerto serializados en la cabecera HTTP `Origin`; la regla de puerto se refiere al puerto del sitio web de origen, no al puerto efímero del cliente.

Los dominios son coincidencias exactas; no se admiten comodines. Las reglas IP/CIDR actuales soportan IPv4. Los puertos deben estar entre 1 y 65535.

## 3. Comportamiento seguro

- Lista vacía: no concede CORS adicional; el flujo same-origin sigue funcionando.
- Origen permitido: se devuelve `Access-Control-Allow-Origin` con el origen exacto recibido, nunca `*`.
- Preflight permitido: se responde 204 y se publican únicamente los métodos y headers API previstos.
- Preflight no permitido: se responde 403 sin cabeceras de autorización CORS.
- Configuración mal formada: falla cerrada; no se carga ninguna regla.
- No se habilitan credenciales CORS mediante cookies.

CORS no es un firewall ni una ACL de red. No bloquea conexiones TCP, clientes nativos ni herramientas como curl. La exposición de red sigue controlada por LOCAL/LAN y el firewall.

## 4. Implementación

- `internal/api/cors.go`: parser y matcher para IP, CIDR, dominio exacto y puerto opcional.
- `internal/api/server.go`: aplica middleware con la configuración `ABACOPHY_CORS_ALLOWED_ORIGINS` (JSON array).
- Launcher Desktop: guarda las reglas y su estado en las preferencias del usuario. El formato persistido versionado conserva cada regla activa o desactivada; las preferencias antiguas en texto multilínea/comas/punto y coma se migran al vuelo como reglas activas.
- UI: campo de una sola línea con validación básica de IP/CIDR/dominio y puerto; lista individual con edición, eliminación y activación/desactivación.
- Al iniciar el backend, Launcher envía únicamente las reglas activas como JSON en `ABACOPHY_CORS_ALLOWED_ORIGINS`. Las modificaciones se guardan de inmediato, pero no alteran el entorno del proceso Go que ya está ejecutándose: toman efecto en el siguiente arranque del backend.
- Desactivar conserva la regla en preferencias, pero la excluye de la lista enviada al backend. Eliminar la retira de las preferencias.
- Lista vacía por defecto, sin wildcard.

## 5. Pruebas

Se añadieron pruebas para:
- IP exacta en cualquier puerto.
- CIDR con y sin puerto.
- dominio DNS exacto y rechazo de subdominios.
- rechazo de reglas inválidas, comodines y formatos con esquema/path.
- preflight permitido y denegado.
- lista vacía sin permisos cross-origin.

**Estado de esta revisión de UI:** cambio implementado en `OrchestratorScreen.kt`; CI Launcher Desktop está ejecutándose para el commit de la interfaz. Aún falta confirmar el resultado del CI y validar en ejecución el guardado/recuperación de estados, arranque del backend y acceso desde un origen permitido y otro denegado.

## 6. Validación operativa pendiente

- [ ] Ejecutar CI Go (vet, build y tests).
- [ ] Ejecutar CI Launcher Desktop.
- [ ] Probar same-origin en LOCAL.
- [ ] Probar origen permitido por IP exacta.
- [ ] Probar origen permitido por CIDR con puerto.
- [ ] Probar dominio exacto y puerto.
- [ ] Confirmar que origen no incluido y puerto incorrecto no reciben CORS.
- [ ] Confirmar que Vite mantiene su proxy `/api`.

**Puntuación de hardening:** mantener 55/100 hasta completar CI y validación operativa de A2/A4.
