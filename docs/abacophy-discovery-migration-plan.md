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
| 3. Host/puerto configurable | ✅ Hecha | `feat(server): configure bind host and port` |
| 4. mDNS/DNS-SD en Go | 🟡 Implementada; pendiente de validación Go/LAN | `feat(discovery): advertise AbacoPhy through mdns` (en preparación) |
| 5. Integración discovery en launcher | 🟡 Implementación añadida; CI/ejecución pendiente | `OrchestratorUseCase.kt`, `OrchestratorScreen.kt` |
| 6. Dominio discovery en POS | 🟡 Base implementada | `feature/server_discovery/PlatformServerDiscovery.kt` |
| 7. Android NSD | 🟡 Implementado; validación Android/LAN pendiente | `PlatformServerDiscovery.android.kt` |
| 8. Auto-conexión | 🟡 Flujo inicial implementado; validación pendiente | `InitialSetupViewModel.kt` |
| 9. Persistencia de instancia confiable | ⬜ Pendiente | — |
| 10. Modos AUTO/QR/MANUAL | ⬜ Pendiente | — |
| 11. Pairing y seguridad | ⬜ Pendiente | — |
| 12. QR fallback | ⬜ Pendiente | — |
| 13. Compatibilidad de API en POS | ⬜ Pendiente | — |
| 14. UI de discovery del launcher | 🟡 Estado mDNS y clientes LAN añadidos; CI pendiente | `OrchestratorScreen.kt` |
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

# Fase 3 — Separar host y puerto ✅

## Implementado

Configuración integrada en `cmd/abacophy/main.go` mediante `resolveBindAddress`.

Variables:

- `ABACOPHY_HOST`: interfaz/dirección de escucha.
- `ABACOPHY_PORT`: puerto preferido.
- `PORT`: fallback legacy para no romper el launcher actual.

Precedencia efectiva:

```text
ABACOPHY_HOST → 0.0.0.0
ABACOPHY_PORT → PORT → 8090
```

El host por defecto es `0.0.0.0` para permitir conexiones LAN. Para restringir el servidor a la propia máquina:

```text
ABACOPHY_HOST=127.0.0.1
```

Se usa `net.JoinHostPort` para formar correctamente la dirección de escucha, incluidos hosts IPv6. La identidad persistente y los endpoints API no cambian en esta fase.

Pruebas añadidas en `cmd/abacophy/main_test.go`:

- valores por defecto;
- compatibilidad con `PORT`;
- prioridad de `ABACOPHY_PORT` sobre `PORT`;
- configuración explícita del host;
- modo solo-localhost;
- formato de dirección IPv6.

## Aceptación

- [x] Se conserva la variable `PORT` que utiliza el launcher existente.
- [x] `ABACOPHY_PORT` tiene prioridad sobre `PORT`.
- [x] `ABACOPHY_HOST` permite elegir la interfaz de escucha.
- [x] `0.0.0.0` permite exposición LAN por defecto.
- [x] `127.0.0.1` permite restringir la escucha a localhost.
- [x] La configuración tiene pruebas unitarias escritas.

**Validación pendiente en entorno Go:** las pruebas están añadidas, pero todavía no se ha confirmado una ejecución exitosa de `go test` en este entorno.

---

# Fase 4 — mDNS / DNS-SD 🟡 Implementación añadida; validación pendiente

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

- [x] Nunca publicar secretos en TXT.
- [x] TXT no es fuente única de verdad.
- [x] El anuncio publica solo metadatos; el cliente debe confirmar mediante `/api/v1/info` (validación del cliente en fases posteriores).
- [x] El listener HTTP se enlaza y comienza a servir antes de registrar mDNS.
- [x] El anuncio se retira durante el cierre ordenado del proceso.

---

# Fase 5 — Integración con launcher 🟡 Implementación añadida; validar CI/runtime

Mantener:

```text
ResolvePort → LaunchGo → Health → Discovery → Browser
```

El orquestador añade un paso explícito de anuncio mDNS. La consola distingue `Discovery: _abacophy._tcp.local`, fallo de registro y `CLIENT_CONNECTED` cuando una IP de la LAN alcanza la API. El contador representa IPs LAN únicas vistas desde el arranque del proceso, no sesiones autenticadas.

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

# Fase 6 — Dominio discovery en `posapps` 🟡

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

Implementado el modelo compartido `DiscoveredServer` y la abstracción `PlatformServerDiscovery`, aislada de identidad/login/business. El target JVM devuelve lista vacía y conserva URL manual; Android implementa NSD. Pendiente compilación multiplataforma.

---

# Fase 7 — Android NSD 🟡 Implementación añadida; validación pendiente

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

Implementación añadida en `posapps/shared/src/androidMain/.../PlatformServerDiscovery.android.kt`: descubre `_abacophy._tcp.`, resuelve host/puerto y entrega candidatos. `ProbeApiConnection.validateDiscovered` valida `product`, `instanceId` y `apiVersion == 1` contra `/api/v1/info`. Falta compilar Android y probar en una LAN real; algunas redes/AP pueden bloquear mDNS.

---

# Fase 8 — Conexión automática 🟡 Implementación inicial

### Cero servidores

```text
No encontrado
 → informar y permitir nueva búsqueda
 → URL manual
```

La pantalla inicial dispara discovery automáticamente. Si no hay servidores compatibles, muestra el fallback manual. QR sigue pendiente de la Fase 12.

### Un servidor compatible

```text
descubierto → /info → compatible → conectar
```

### Varios servidores

Mostrar selector.

Implementado en `InitialSetupScreen`: lista servidores compatibles para selección. Si solo hay uno, lo valida y conecta automáticamente. Si no hay ninguno, conserva la introducción manual de URL.

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

# Fase 14 — UI del launcher 🟡 Implementación añadida; validar CI

Añadido a la UI existente sin sustituir los logs ni los controles: estado `DISCOVERY mDNS ACTIVO/PENDIENTE`, nombre del servicio `_abacophy._tcp.local` y contador `Clientes conectados desde LAN`. El backend registra una sola línea `CLIENT_CONNECTED` por IP remota que accede a `/api/`, excluyendo loopback. QR sigue pendiente.

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
3. `feat(server): configure bind host and port` ✅
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
3. host + port configuration     ✅
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

**El contrato de servidor ya está definido; Android NSD se ha implementado inicialmente, pero no se considera validado hasta que CI compile Android y se pruebe en una LAN real.**

---

# MVP Discovery — aceptación global

- [x] `instanceId` persistente.
- [x] `/api/v1/info` devuelve identidad y `apiVersion`.
- [ ] Go anuncia `_abacophy._tcp.local` (implementación añadida; falta validar en entorno Go/LAN).
- [ ] Launcher continúa sin regresiones.
- [ ] Android descubre automáticamente (código añadido; falta validar build/LAN).
- [ ] Una instancia compatible conecta automáticamente (flujo añadido; falta validar build/LAN).
- [ ] Varias instancias muestran selector (UI añadida; falta validar build).
- [ ] Cero instancias muestra fallback manual (UI añadida; falta validar build).
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
- [x] Fase 3 — Host/port configuration.
- [ ] Fase 4 — mDNS (pendiente de validación Go/LAN).
- [ ] Fase 5 — Launcher integration (implementación añadida; CI pendiente).
- [x] Fase 6 — POS discovery domain (base implementada; compilación pendiente).
- [ ] Fase 7 — Android NSD (implementación añadida; validación pendiente).
- [ ] Fase 8 — Auto-connect (implementación inicial añadida; validación pendiente).
- [ ] Fase 9 — Trusted instance.
- [ ] Fase 10 — Connection modes.
- [ ] Fase 11 — Pairing/security.
- [ ] Fase 12 — QR fallback.
- [ ] Fase 13 — API compatibility.
- [ ] Fase 14 — Launcher UI (estado mDNS/clientes añadido; CI pendiente).
- [ ] Fase 15 — Integration tests.
