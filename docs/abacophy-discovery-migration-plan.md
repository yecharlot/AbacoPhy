# Plan de implementación — AbacoPhy Discovery

> Rama: `launcher-app`
> Objetivo: migrar desde `launcher → puerto local → Go → navegador` hacia una instancia AbacoPhy descubrible en la LAN, conservando compatibilidad y fallback manual.

## Arquitectura objetivo

```text
Launcher
  ↓ lifecycle
Go AbacoPhy Server
  ├─ HTTP /api/v1/info
  ├─ HTTP /api/v1/health
  └─ mDNS _abacophy._tcp.local
          ↓
Android POS / otros clientes
          ↓
   /api/v1/info
          ↓
      pairing
          ↓
        auth
          ↓
      Business API
```

### Decisiones centrales

- El puerto dinámico sigue existiendo y es un detalle técnico.
- `instanceId` es la identidad lógica persistente de la instalación.
- IP y puerto no identifican una instalación.
- Discovery no sustituye autenticación.
- mDNS será el mecanismo automático de descubrimiento.
- QR será fallback asistido.
- URL manual seguirá disponible como último fallback.
- No mezclar discovery con lógica de negocio.
- El servidor Go será quien publique mDNS; el launcher controla el ciclo de vida.

---

# Estado de implementación

| Fase | Estado | Commit / referencia |
|---|---|---|
| 1. Identidad persistente | ✅ Hecha | `feat(server): add persistent AbacoPhy instance identity` + inicialización del servidor |
| 2. `/api/v1/info` discovery metadata | ✅ Hecha | `feat(api): expose discovery metadata` |
| 3. Host/puerto configurable | ⬜ Pendiente | — |
| 4. mDNS/DNS-SD en Go | ⬜ Pendiente | — |
| 5. Integración discovery en launcher | ⬜ Pendiente | — |
| 6. Dominio discovery en POS | ⬜ Pendiente | — |
| 7. Android NSD | ⬜ Pendiente | — |
| 8. Auto-conexión | ⬜ Pendiente | — |
| 9. Persistencia de instancia confiable | ⬜ Pendiente | — |
| 10. Modos AUTO/QR/MANUAL | ⬜ Pendiente | — |
| 11. Pairing y seguridad | ⬜ Pendiente | — |
| 12. QR fallback | ⬜ Pendiente | — |
| 13. Compatibilidad de API en POS | ⬜ Pendiente | — |
| 14. UI de discovery del launcher | ⬜ Pendiente | — |
| 15. Pruebas de integración | ⬜ Pendiente | — |

**Regla:** una fase solo se marca como hecha cuando su implementación real está en la rama. Diseño aprobado no equivale a implementación.

---

# Fase 1 — Identidad persistente de instancia ✅

## Objetivo

Cada instalación tiene una identidad independiente del IP y del puerto.

## Implementado

```text
internal/identity/
├── identity.go
└── identity_test.go
```

Persistencia:

```text
ABACOPHY_DATA/instance.json
```

Modelo actual:

```go
type Instance struct {
    InstanceID string `json:"instanceId"`
}
```

Características:

- Generación criptográficamente aleatoria de 128 bits.
- Persistencia entre reinicios.
- No depende del puerto.
- No depende de la IP.
- Una identidad existente inválida produce error en vez de generar otra silenciosamente.
- Escritura mediante archivo temporal para evitar identidades parcialmente escritas.
- El servidor Go carga la identidad antes del bootstrap.

## Pruebas implementadas

- Generación inicial.
- Persistencia entre llamadas/reinicios.
- Existencia de `instance.json`.
- Rechazo de identidad existente inválida.

## Aceptación

- [x] Dos instalaciones pueden tener IDs independientes.
- [x] Reinicio conserva el ID.
- [x] Cambiar puerto no cambia el ID.
- [x] Cambiar IP no cambia el ID.

---

# Fase 2 — Evolucionar `/api/v1/info` ✅

## Objetivo

Convertir `/api/v1/info` en el contrato público de identidad y compatibilidad de AbacoPhy sin romper los clientes existentes.

## Implementado

Se añadió una capa de enriquecimiento sobre el endpoint existente:

```text
internal/api/discovery.go
internal/api/discovery_test.go
```

El endpoint mantiene sus campos legacy y añade:

```json
{
  "product": "AbacoPhy",
  "name": "ÁbacoPhy",
  "instanceId": "...",
  "version": "0.1.0",
  "apiVersion": 1,
  "capabilities": ["web", "pos", "offline", "sync"],
  "pairingRequired": false
}
```

### Compatibilidad

Los campos existentes de `/api/v1/info` no se eliminan.

El cliente puede empezar a utilizar únicamente:

```text
product
instanceId
version
apiVersion
capabilities
pairingRequired
```

sin depender de módulos, roles o detalles internos del negocio.

### Pairing

`pairingRequired` permanece actualmente en `false` porque el mecanismo de pairing todavía no existe. Se cambiará durante la Fase 11, no antes.

### Seguridad

No se exponen:

- contraseñas;
- tokens;
- usuarios;
- credenciales;
- tenants privados;
- información contable;
- inventario;
- datos de negocio.

## Pruebas implementadas

- `/api/v1/info` conserva metadata legacy.
- `product` presente.
- `instanceId` presente.
- `apiVersion` presente.
- `pairingRequired` presente.
- Las demás rutas no son interceptadas por la capa discovery.

## Aceptación

- [x] `/api/v1/info` continúa funcionando.
- [x] Devuelve `instanceId` estable.
- [x] Devuelve `apiVersion`.
- [x] Devuelve capacidades.
- [x] No devuelve información sensible nueva.

---

# Fase 3 — Separar host y puerto ⬜

Formalizar:

```text
ABACOPHY_HOST
ABACOPHY_PORT
```

Compatibilidad:

```text
ABACOPHY_PORT → PORT → 8090
```

Default LAN previsto:

```text
0.0.0.0
```

Debe existir una opción para restringir el servidor a localhost.

## Aceptación

- [ ] Launcher continúa funcionando.
- [ ] `PORT` continúa funcionando.
- [ ] `ABACOPHY_PORT` funciona.
- [ ] `ABACOPHY_HOST` funciona.
- [ ] Puede desactivarse la exposición LAN.

---

# Fase 4 — mDNS / DNS-SD ⬜

Servicio:

```text
_abacophy._tcp.local
```

Nombre de ejemplo:

```text
AbacoPhy Oficina._abacophy._tcp.local
```

Metadatos TXT previstos:

```text
id=<instanceId>
name=AbacoPhy Oficina
version=0.1.0
api=1
web=1
pairing=0|1
```

Reglas:

- [ ] Nunca publicar secretos en TXT.
- [ ] TXT no es fuente única de verdad.
- [ ] Resolver servicio y confirmar mediante `/api/v1/info`.
- [ ] Publicar solo después de que HTTP esté listo.
- [ ] Retirar anuncio al cerrar el servidor.

---

# Fase 5 — Integración con launcher ⬜

Mantener:

```text
ResolvePort → LaunchGo → Health → Browser
```

Evolucionar a:

```text
ResolvePort → LaunchGo → Health → Discovery ready → Browser
```

El launcher será lifecycle manager, no propietario de la lógica mDNS.

Estados futuros:

```text
✓ Servidor iniciado
✓ Servidor disponible en LAN
✓ Discovery activo
```

---

# Fase 6 — Dominio discovery en `posapps` ⬜

Crear:

```text
posapps/shared/src/commonMain/kotlin/com/elitec/com/feature/server_discovery/
```

Modelo previsto:

```kotlin
data class AbacoPhyInstance(
    val instanceId: String,
    val name: String,
    val host: String,
    val port: Int,
    val version: String,
    val apiVersion: Int,
    val capabilities: Set<String>,
    val pairingRequired: Boolean,
) {
    val baseUrl: String get() = "http://$host:$port"
}
```

Discovery debe permanecer independiente de identidad/login/business modules.

---

# Fase 7 — Android NSD ⬜

Usar `NsdManager`:

```text
NsdManager
 ↓
_abacophy._tcp
 ↓
resolve
 ↓
host + port
 ↓
GET /api/v1/info
 ↓
validar
```

El POS no confiará únicamente en TXT.

---

# Fase 8 — Conexión automática ⬜

### Cero servidores

```text
No encontrado
 → reintentar
 → QR
 → URL manual
```

### Un servidor compatible

```text
descubierto → /info → compatible → conectar
```

### Varios servidores

Mostrar selector.

### Incompatible

Mostrar versión/API requerida y rechazar conexión.

---

# Fase 9 — Instancia confiable ⬜

Persistir por `instanceId`, no por IP.

```kotlin
data class TrustedAbacoPhy(
    val instanceId: String,
    val name: String,
    val host: String?,
    val lastSeen: Instant,
    val paired: Boolean,
)
```

Cambio de IP no debe convertir una instalación conocida en una instalación nueva.

---

# Fase 10 — Modos de conexión ⬜

```text
AUTO_DISCOVERY
QR
MANUAL
```

Default:

```text
AUTO_DISCOVERY
```

La URL manual no se elimina durante la migración.

---

# Fase 11 — Pairing y seguridad ⬜

Discovery significa únicamente:

> Existe un servidor AbacoPhy en esta red.

Flujo:

```text
Discovery
 ↓
/info
 ↓
Pairing
 ↓
dispositivo confiable
 ↓
Auth
 ↓
Business API
```

Requisitos:

- [ ] Pairing explícito para dispositivos nuevos.
- [ ] No enviar credenciales por mDNS.
- [ ] TXT nunca concede autorización.
- [ ] Mantener login existente.
- [ ] Revocación futura de dispositivos.

Al completarse esta fase, `pairingRequired` podrá pasar a `true` cuando corresponda.

---

# Fase 12 — QR fallback ⬜

Payload conceptual:

```json
{
  "scheme": "abacophy",
  "instance": "...",
  "host": "192.168.1.50",
  "port": 18473,
  "api": 1
}
```

Nunca incluir credenciales ni tokens permanentes.

Jerarquía:

```text
mDNS → automático
QR → asistido
URL → manual
```

---

# Fase 13 — Compatibilidad de API ⬜

POS:

```text
SUPPORTED_API_VERSION = 1
```

Validación inicial:

```text
server.apiVersion == supported
```

Después podrá evolucionarse a rangos de compatibilidad.

---

# Fase 14 — UI del launcher ⬜

Añadir a la pantalla existente:

```text
AbacoPhy Oficina

● Servidor activo
● Discovery activo

Red
192.168.x.x

[ Abrir aplicación ]
[ Mostrar QR ]
```

No sustituir inicialmente la UI de tareas/logs existente.

---

# Fase 15 — Pruebas de integración ⬜

| Escenario | Resultado esperado |
|---|---|
| Launcher inicia Go | Web disponible |
| Go inicia | mDNS aparece |
| Android + 1 servidor | Auto-connect |
| Android + 2 | Selector |
| Android + 0 | Fallback |
| Reinicio Go | Vuelve a anunciarse |
| Reinicio POS | Reconecta |
| IP cambia | Mismo `instanceId` |
| Puerto cambia | Mismo `instanceId` |
| API incompatible | Rechazo claro |
| mDNS bloqueado | QR/manual |
| AP isolation | QR/manual |
| No autorizado | Pairing |
| Launcher cerrado | Servicio deja de anunciarse |

---

# Orden de commits

1. `feat(server): add persistent AbacoPhy instance identity` ✅
2. `feat(api): expose discovery metadata` ✅
3. `feat(server): add configurable bind host`
4. `feat(discovery): advertise AbacoPhy through mdns`
5. `feat(launcher): expose discovery status`
6. `feat(pos): add AbacoPhy discovery domain`
7. `feat(android): discover AbacoPhy through NSD`
8. `feat(pos): auto-connect discovered server`
9. `feat(pos): persist trusted AbacoPhy instance`
10. `feat(discovery): add qr pairing fallback`
11. `feat(security): require pairing for trusted clients`
12. `docs: document AbacoPhy discovery protocol`

---

# Orden técnico

```text
1. Go identity                    ✅
   ↓
2. /api/v1/info                  ✅
   ↓
3. host + port configuration     ⬜
   ↓
4. mDNS advertisement            ⬜
   ↓
5. launcher integration          ⬜
   ↓
6. Android NSD                   ⬜
   ↓
7. automatic connection          ⬜
   ↓
8. persistent instance trust     ⬜
   ↓
9. pairing                       ⬜
   ↓
10. QR fallback                  ⬜
```

**No comenzar Android NSD antes de estabilizar el contrato de servidor.**

---

# MVP Discovery — aceptación global

- [x] `instanceId` persistente.
- [x] `/api/v1/info` devuelve identidad y `apiVersion`.
- [ ] Go anuncia `_abacophy._tcp.local`.
- [ ] Launcher continúa sin regresiones.
- [ ] Android descubre automáticamente.
- [ ] Una instancia compatible conecta automáticamente.
- [ ] Varias instancias muestran selector.
- [ ] Cero instancias muestra fallback.
- [ ] Cambio de IP no cambia identidad.
- [ ] URL manual continúa disponible.

---

# Fuera de esta migración

No modificar como parte de Discovery:

- autenticación existente;
- tenants;
- contabilidad;
- inventario;
- nómina;
- facturación;
- sincronización offline;
- outbox;
- SSE;
- modelo de empleados;
- asignación de PDV;
- persistencia de negocio.

Discovery será una capa de conectividad previa a la API.

---

# Decisión central

> **El puerto es una propiedad técnica del servidor; `instanceId` es la identidad lógica de la instalación.**

El launcher actual no se desecha: será el **host/lifecycle manager**. Go será el **servicio descubrible**. POS será el **cliente que descubre y negocia la conexión**.

---

## Estado del documento

- [x] Arquitectura propuesta.
- [x] Estado actual contrastado con `launcher-app`.
- [x] Fase 1 — Instance identity.
- [x] Fase 2 — Discovery metadata.
- [ ] Fase 3 — Host/port configuration.
- [ ] Fase 4 — mDNS.
- [ ] Fase 5 — Launcher integration.
- [ ] Fase 6 — POS discovery domain.
- [ ] Fase 7 — Android NSD.
- [ ] Fase 8 — Auto-connect.
- [ ] Fase 9 — Trusted instance.
- [ ] Fase 10 — Connection modes.
- [ ] Fase 11 — Pairing/security.
- [ ] Fase 12 — QR fallback.
- [ ] Fase 13 — API compatibility.
- [ ] Fase 14 — Launcher UI.
- [ ] Fase 15 — Integration tests.
