# A4 — Política CORS configurable de AbacoPhy

**Rama:** `security-hardening`  
**Estado:** implementación inicial de backend y Launcher integrada; CI y validación manual pendientes.

## 1. Hallazgo

El middleware anterior añadía `Access-Control-Allow-Origin: *` a todas las respuestas y contestaba cualquier solicitud `OPTIONS` con HTTP 204, sin validar el origen.

La arquitectura integrada sirve la PWA y la API desde el mismo origen. Sin embargo, el Launcher no ofrecía una forma de autorizar de manera controlada instalaciones donde una webapp se aloje en otro host, IP o puerto.

## 2. Política y sintaxis de reglas

El Launcher permite configurar una lista persistida de reglas. Cada línea representa una regla independiente. Se admiten:

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
- Launcher Desktop: guarda el texto de reglas en preferencias del usuario y lo transforma en una lista JSON para el proceso Go.
- UI: editor multilínea, una regla por línea; admite también separadores coma y punto y coma al iniciar.
- Lista vacía por defecto, sin wildcard.

## 5. Pruebas

Se añadieron pruebas para:
- IP exacta en cualquier puerto.
- CIDR con y sin puerto.
- dominio DNS exacto y rechazo de subdominios.
- rechazo de reglas inválidas, comodines y formatos con esquema/path.
- preflight permitido y denegado.
- lista vacía sin permisos cross-origin.

**Pendiente:** CI Go y CI Launcher Desktop deben confirmar compilación y pruebas. También falta validar en ejecución el guardado de preferencias, arranque del backend y acceso desde un origen permitido y otro denegado.

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
