# Plan de implementación — AbacoPhy Discovery

> Rama: `launcher-app`  
> Objetivo: migrar desde `launcher → puerto local → Go → navegador` hacia una **instancia AbacoPhy descubrible en la LAN**, conservando compatibilidad y fallback manual.

## 1. Objetivo

### Actual

```text
Launcher → puerto libre → Go → health → navegador
```

### Objetivo

```text
Launcher → puerto libre → Go → health → mDNS
                         │
                         └→ navegador local

Android/cliente → mDNS → host+puerto → /api/v1/info → compatibilidad → pairing → API
```

**Regla:** el puerto dinámico sigue existiendo, pero deja de ser responsabilidad del usuario o del cliente.

---

## 2. Principios

- [ ] No reescribir el launcher actual.
- [ ] Mantener `SystemPortResolver`, `GoProcessLauncher`, `HttpHealthChecker` y `DesktopBrowserLauncher`.
- [ ] Mantener `PORT` por compatibilidad.
- [ ] El servidor Go anuncia el servicio; el launcher gestiona su ciclo de vida.
- [ ] Discovery no sustituye autenticación.
- [ ] `/api/v1/info` será el contrato público de identidad/compatibilidad.
- [ ] `instanceId` será estable entre reinicios.
- [ ] IP/puerto no serán la identidad lógica.
- [ ] mDNS será discovery automático.
- [ ] QR será discovery asistido.
- [ ] URL manual será último fallback.
- [ ] No mezclar discovery con lógica de negocio.

---

## 3. Estado actual confirmado

El launcher ya implementa puerto libre → proceso Go → health → navegador → logs → shutdown.

El backend Go ya recibe `PORT`, escucha en `:PORT`, expone `/api/v1/health` y `/api/v1/info`, imprime IP LAN y sirve la web estática.

Por tanto, la migración será incremental y no una reescritura.

---

# 4. Fase 1 — Identidad persistente de instancia

## Objetivo

Cada instalación debe tener una identidad independiente del IP y puerto.

## Implementación

Crear:

```text
internal/identity/
├── identity.go
└── persistence.go
```

Modelo:

```go
type InstanceIdentity struct {
    InstanceID string `json:"instanceId"`
    Name       string `json:"name"`
}
```

Persistir en:

```text
ABACOPHY_DATA/instance.json
```

Primera ejecución: generar UUID y guardar. Siguientes ejecuciones: reutilizarlo.

## Aceptación

- [ ] Dos instalaciones generan IDs distintos.
- [ ] Reinicio conserva el ID.
- [ ] Cambiar puerto no cambia el ID.
- [ ] Cambiar IP no cambia el ID.

---

# 5. Fase 2 — Evolucionar `/api/v1/info`

Mantener compatibilidad con los campos actuales y añadir identidad/compatibilidad.

Contrato objetivo:

```json
{
  "product": "AbacoPhy",
  "name": "AbacoPhy Oficina",
  "instanceId": "8f31a4d2-...",
  "version": "0.1.0",
  "apiVersion": 1,
  "capabilities": ["web", "pos", "offline", "sync"],
  "pairingRequired": true
}
```

No exponer contraseñas, tokens, usuarios, tenants privados ni datos de negocio.

## Aceptación

- [ ] `/api/v1/info` continúa funcionando.
- [ ] Devuelve `instanceId` estable.
- [ ] Devuelve `apiVersion`.
- [ ] Devuelve capacidades.
- [ ] No devuelve información sensible.

---

# 6. Fase 3 — Separar host y puerto

Formalizar:

```text
ABACOPHY_HOST
ABACOPHY_PORT
```

Compatibilidad:

```text
ABACOPHY_PORT → PORT → 8090
```

Host por defecto para discovery LAN:

```text
0.0.0.0
```

Debe existir posibilidad de restringir a localhost cuando se quiera.

## Aceptación

- [ ] Launcher continúa funcionando.
- [ ] `PORT` continúa funcionando.
- [ ] Go puede escuchar LAN.
- [ ] Se puede desactivar exposición LAN.

---

# 7. Fase 4 — mDNS / DNS-SD

Servicio:

```text
_abacophy._tcp.local
```

Ejemplo:

```text
AbacoPhy Oficina._abacophy._tcp.local
```

Anunciar:

```text
host
port
```

y TXT mínimo:

```text
id=8f31a4d2...
name=AbacoPhy Oficina
version=0.1.0
api=1
web=1
pairing=1
```

## Reglas

- [ ] Nunca poner secretos en TXT.
- [ ] No usar TXT como única fuente de verdad.
- [ ] Resolver servicio y confirmar con `/api/v1/info`.
- [ ] Publicar cuando HTTP esté listo.
- [ ] Retirar anuncio al terminar.

## Aceptación

Otro equipo de la misma LAN debe descubrir nombre, host y puerto sin configuración manual.

---

# 8. Fase 5 — Integración con launcher

Mantener:

```text
ResolvePort → LaunchGo → Health → Browser
```

Evolucionar a:

```text
ResolvePort → LaunchGo → Health → Discovery ready → Browser
```

Añadir estado:

```text
✓ Servidor iniciado
✓ Servidor disponible en LAN
✓ Discovery activo
```

El launcher no será el responsable principal de mDNS: Go es el servicio descubrible.

---

# 9. Fase 6 — Dominio de discovery en `posapps`

Crear feature independiente:

```text
posapps/shared/src/commonMain/kotlin/com/elitec/com/feature/server_discovery/
```

Propuesta:

```text
server_discovery/
├── domain/
│   ├── models/AbacoPhyInstance.kt
│   ├── repositories/AbacoPhyDiscoveryRepository.kt
│   └── usecases/DiscoverAbacoPhyServers.kt
├── data/
│   ├── mdns/
│   └── api/
└── ui/
```

Modelo:

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

---

# 10. Fase 7 — Android NSD

Usar `NsdManager`.

```text
POS
 ↓
NsdManager
 ↓
_abacophy._tcp
 ↓
resolve service
 ↓
host + port
 ↓
GET /api/v1/info
 ↓
validar
```

El `baseUrl` no se confiará únicamente en TXT.

## Aceptación

Android descubre una instancia AbacoPhy en la misma LAN sin introducir IP/puerto.

---

# 11. Fase 8 — Conexión automática

### Cero servidores

```text
No encontrado
 → buscar nuevamente
 → QR
 → URL manual
```

### Un servidor compatible

```text
descubierto → validado → conectar automáticamente
```

### Varios

Mostrar selector de instancias.

### Incompatible

Mostrar API requerida/encontrada y rechazar conexión.

---

# 12. Fase 9 — Servidor conocido

Guardar por `instanceId`, no por IP.

```kotlin
data class TrustedAbacoPhy(
    val instanceId: String,
    val name: String,
    val host: String?,
    val lastSeen: Instant,
    val paired: Boolean,
)
```

Si el IP cambia, el cliente debe reconocer la misma instalación.

---

# 13. Fase 10 — Modos de conexión

No eliminar inmediatamente la URL manual.

```text
AUTO_DISCOVERY
QR
MANUAL
```

Por defecto:

```text
AUTO_DISCOVERY
```

Configuración:

```text
Servidor AbacoPhy

● Detectar automáticamente
○ Escanear QR
○ Dirección manual
```

---

# 14. Fase 11 — Pairing y seguridad

Discovery solo significa: **existe un servidor**.

Flujo:

```text
Discovery → /api/v1/info → Pairing → dispositivo confiable → Auth → API
```

## Requisitos

- [ ] Pairing explícito para dispositivos nuevos.
- [ ] Nunca enviar credenciales por mDNS.
- [ ] TXT no concede autorización.
- [ ] Mantener login existente.
- [ ] Permitir revocación futura de dispositivos.

---

# 15. Fase 12 — QR fallback

El desktop podrá mostrar un QR de conexión.

Payload conceptual:

```json
{
  "scheme": "abacophy",
  "instance": "8f31a4d2-...",
  "host": "192.168.1.50",
  "port": 18473,
  "api": 1
}
```

No incluir credenciales ni tokens permanentes.

Jerarquía:

```text
mDNS → automático
QR → asistido
URL → manual
```

---

# 16. Fase 13 — Compatibilidad de API

Definir en el POS:

```text
SUPPORTED_API_VERSION = 1
```

Validación:

```text
server.apiVersion == supported
```

Si no coincide: rechazar con mensaje de actualización.

---

# 17. Fase 14 — UI del launcher

Mantener la pantalla actual de tareas/consola.

Añadir:

```text
AbacoPhy Oficina

Estado
  ● Servidor activo
  ● Discovery activo

Red
  192.168.x.x

[ Abrir aplicación ]
[ Mostrar QR ]
```

Más adelante puede mostrarse cantidad de clientes conectados.

---

# 18. Fase 15 — Pruebas

| Escenario | Resultado |
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

# 19. Orden de commits

1. `feat(server): add persistent AbacoPhy instance identity`
2. `feat(api): expose discovery metadata`
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

# 20. Orden técnico

```text
1. Go identity
   ↓
2. /api/v1/info
   ↓
3. host + port configuration
   ↓
4. mDNS advertisement
   ↓
5. launcher integration
   ↓
6. Android NSD
   ↓
7. automatic connection
   ↓
8. persistent instance recognition
   ↓
9. pairing
   ↓
10. QR fallback
```

**No comenzar por Android antes de estabilizar el contrato de servidor.**

---

# 21. MVP Discovery — aceptación

- [ ] `instanceId` persistente.
- [ ] `/api/v1/info` devuelve identidad y `apiVersion`.
- [ ] Go anuncia `_abacophy._tcp.local`.
- [ ] Launcher continúa sin regresiones.
- [ ] Android descubre automáticamente.
- [ ] Una instancia compatible conecta automáticamente.
- [ ] Varias instancias muestran selector.
- [ ] Cero instancias muestra fallback.
- [ ] Cambio de IP no cambia identidad.
- [ ] URL manual continúa disponible.

---

# 22. Migración completa — aceptación

```text
ABACOPHY DESKTOP
      ↓
arranca servidor
      ↓
publica identidad
      ↓
mDNS
      ↓
Android / otros clientes
      ↓
/api/v1/info
      ↓
pairing
      ↓
auth
      ↓
Business API
```

El usuario final no necesita conocer puerto, IP actual, ubicación del binario ni URL manual.

---

# 23. Fuera de esta migración

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

# 24. Arquitectura final

```text
                 ABACOPHY ECOSYSTEM

        ┌──────────────────────────────┐
        │ Desktop Launcher             │
        │ lifecycle / runtime          │
        └──────────────┬───────────────┘
                       ↓
        ┌──────────────────────────────┐
        │ Go AbacoPhy Server           │
        │ HTTP API                     │
        │ /api/v1/info                 │
        │ /api/v1/health               │
        │ mDNS _abacophy._tcp          │
        └──────────────┬───────────────┘
                       │
                  LAN Discovery
                       │
             ┌─────────┴─────────┐
             ↓                   ↓
        Android POS        Otro cliente
          NSD              Discovery
             │                   │
             └─────────┬─────────┘
                       ↓
                  /api/v1/info
                       ↓
                    pairing
                       ↓
                     auth
                       ↓
                  Business API
```

---

# 25. Decisión central

> **El puerto es una propiedad técnica del servidor; `instanceId` es la identidad lógica de la instalación.**

El launcher actual no se desecha: se convierte en el **host/lifecycle manager**. Go se convierte en el **servicio descubrible**. POS se convierte en un **cliente que descubre y negocia conexión**.

---

## Estado del documento

- [x] Arquitectura propuesta.
- [x] Estado actual contrastado con `launcher-app`.
- [ ] Fase 1 — Instance identity.
- [ ] Fase 2 — Discovery metadata.
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

**Documento de planificación. Las fases `[ ]` no implican implementación realizada.**
