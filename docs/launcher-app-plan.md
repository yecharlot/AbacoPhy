# Plan de implementación — Orquestador Desktop AbacoPhy (launcher-app)

> Rama: `launcher-app`  
> Aplicación **solo Desktop (JVM / Compose)**, independiente de `posapps`.  
> Responsabilidad única: **puerto libre → proceso Go → health → navegador + logs**.

Marca cada ítem al completarlo (`[ ]` → `[x]`).

---

## Objetivo de producto

```text
Usuario abre Orquestador
  → resuelve puerto libre
  → lanza abacophy en localhost:PUERTO
  → espera health OK
  → abre http://127.0.0.1:PUERTO/
  → muestra tareas + consola
  → al cerrar: detiene el proceso hijo (configurable)
```

- Web = **build estático** servido por Go (`ABACOPHY_STATIC`), **no** `vite dev`.
- Sin lógica de POS, login de negocio ni outbox.

---

## Fase 0 — Alcance y convenciones

- [x] Crear módulo/carpeta `desktop-orchestrator/` (o `launcher/`) fuera de features POS
- [x] Decidir stack: Kotlin + Compose Multiplatform **Desktop only**
- [x] Documentar layout de distribución (`runtime/bin`, `runtime/static`)
- [x] Convención de datos: `ABACOPHY_DATA` bajo carpeta de usuario (p.ej. `~/.abacophy/data`)
- [x] Variables opcionales documentadas: `ABACOPHY_BIN`, `ABACOPHY_STATIC`, `ABACOPHY_DATA`, `PORT`
- [x] README corto del launcher (qué hace / qué no hace)
- [x] Confirmar que **no** se comparte código con `posapps` salvo utilidades genéricas inevitables

**Criterio de hecho F0:** estructura de proyecto + README de decisiones sin UI todavía. ✅ (2026-10-27)

---

## Fase 1 — Dominio del orquestador (sin UI)

Estructura objetivo:

```text
desktop-orchestrator/
  src/main/kotlin/.../
    domain/
      PortResolver
      BackendProcess
      BackendHealth
      BrowserLauncher
      OrchestratorUseCase
      models/   # TaskStep, LogLine, OrchestratorState
    data/
      SystemPortResolver
      GoProcessLauncher
      HttpHealthChecker
      DesktopBrowserLauncher
    ui/         # Fase 3
    di/
```

### 1.1 Puerto libre

- [x] `findFreePort()` en loopback (`127.0.0.1` / `ServerSocket(0)`)
- [x] No hardcodear `8090` como puerto de producción del launcher

### 1.2 Proceso Go

- [x] `ProcessBuilder` / API equivalente para arrancar `abacophy` / `abacophy.exe`
- [x] Pasar env: `PORT`, `ABACOPHY_DATA`, `ABACOPHY_STATIC`
- [x] Capturar **stdout** y **stderr** línea a línea → stream de logs
- [x] API `start` / `stop` / `isAlive`

### 1.3 Health

- [x] Poll `GET http://127.0.0.1:$PORT/api/v1/health` (fallback `/api/v1/info`)
- [x] Intervalo ~200–500 ms; timeout total configurable (p.ej. 30–60 s)
- [x] Fallo de health → marcar tarea Failed y detener proceso hijo

### 1.4 Navegador

- [x] Abrir `http://127.0.0.1:$PORT/` con `Desktop.browse` (o equivalente JVM)
- [x] Fallback si el Desktop no está disponible (mensaje en log/UI)

### 1.5 Máquina de estados

- [x] Modelo `TaskStep`: Pending | Running | Success | Failed + mensaje
- [x] `OrchestratorUseCase` ejecuta la secuencia en orden
- [x] Main de consola o test que valide la secuencia sin UI (mock o binario real)

**Criterio de hecho F1:** secuencia completa ejecutable sin ventana gráfica. ✅ (2026-10-27)

---

## Fase 2 — Runtime Go + estáticos

- [x] Script de build que compile Go → `launcher/runtime/bin/abacophy[.exe]` (`scripts/build-runtime.sh`)
- [x] Incluir estáticos (`static/` y/o `web/dist` según convención del backend) en `runtime/static`
- [x] Layout de distribución acordado:

```text
AbacoPhy-Desktop/
  AbacoPhyOrchestrator[.exe | instalador]
  runtime/
    bin/abacophy[.exe]
    static/
```

- [x] Resolución de rutas en **dev** (`user.dir` / relativos)
- [x] Resolución de rutas en **prod** (junto al instalador / empaquetado)
- [x] Probar a mano: Go con `PORT` fijo + static → web responde en navegador (script imprime curl de prueba)

**Criterio de hecho F2:** runtime listo para que el launcher lo invoque sin Node ni Vite. ✅ (2026-10-27)

---

## Fase 3 — UI mínima (tareas + consola)

Layout objetivo:

```text
┌─────────────────────────┬──────────────────────────────┐
│  Tareas                 │  Consola                     │
│  ○ Resolviendo puerto   │  stdout/stderr Go + orq.     │
│  ✅ Puerto: NNNNN       │                              │
│  ○ Lanzando backend     │                              │
│  ✅ Backend listo       │                              │
│  ○ Abriendo navegador   │                              │
│  ✅ URL abierta         │                              │
│  [Iniciar] [Detener]    │  [Limpiar logs]              │
│  [Abrir de nuevo]       │                              │
└─────────────────────────┴──────────────────────────────┘
```

- [x] Ventana Compose Desktop (tema simple claro/oscuro sistema)
- [x] Lista de pasos enlazada a estado del orquestador (callbacks → Compose state)
- [x] Panel derecho: logs con scroll; auto-scroll al final
- [x] Botón **Iniciar** (si no hay proceso activo)
- [x] Botón **Detener** backend
- [x] Botón **Abrir navegador otra vez**
- [x] Una sola pantalla (sin Nav3 / sin shell POS)

**Criterio de hecho F3:** usuario no técnico ve progreso y la web se abre sola. ✅ (2026-10-27)

---

## Fase 4 — Ciclo de vida y robustez

- [x] Cierre de ventana detiene el proceso Go (`destroy` / `destroyForcibly`)
- [x] Shutdown hook JVM como respaldo
- [x] Binario no encontrado → Failed + path esperado visible
- [x] Health timeout → matar hijo + error claro
- [x] Crash de Go a mitad → detectar exit code → Failed + últimos logs
- [x] Puerto inválido / bind fallido → error explícito (+ crash exit code)
- [x] (Opcional) single-instance lock para evitar dos orquestadores peleando
- [x] Probar cierre limpio en al menos un OS objetivo (Windows y/o Linux)

**Criterio de hecho F4:** no quedan procesos zombie al cerrar; errores comprensibles. ✅ (2026-10-27)

---

## Fase 5 — Distribución

- [ ] Empaquetado Compose Desktop / jpackage según OS prioritario
- [ ] Incluir carpeta `runtime/` en el artefacto
- [ ] Icono AbacoPhy si hay recurso disponible
- [ ] README de usuario final: instalar → abrir → esperar navegador
- [ ] (Opcional) modo simple (solo progreso) vs avanzado (consola visible)

**Criterio de hecho F5:** instalable/demoable en máquina limpia con runtime incluido.

---

## Fase 6 — Calidad mínima

- [ ] Unit tests: PortResolver, estados de tareas, mensajes de error de path
- [ ] Checklist manual: cold start, stop, reopen browser, bin missing
- [ ] CI: compilar módulo launcher JVM en push de la rama (runtime Go puede ser artifact aparte)

**Criterio de hecho F6:** build reproducible y checklist documentado.

---

## Orden de ejecución

| Orden | Fase | Resultado |
|------:|------|-----------|
| 1 | F0 + F1 | Orquestación en código, sin UI |
| 2 | F2 | Runtime Go + static |
| 3 | F3 | UI tareas + consola |
| 4 | F4 | Cierre limpio y errores |
| 5 | F5 | Instalable demo |
| 6 | F6 | CI + checklist |

**MVP usable:** F1 + F2 + F3 + cierre básico de F4.

---

## Fuera de alcance

- [x] Login, tenants, POS, outbox, SSE *(explícitamente excluido)*
- [x] Servidor Svelte en caliente (`vite dev`)
- [x] Android / iOS
- [x] Sustituir Electron existente del repo (puede coexistir)
- [x] Migración de persistencia a Turso u otra DB remota

---

## Criterio de aceptación global

- [ ] Ejecutar orquestador en máquina con runtime incluido sin configurar puerto a mano
- [ ] Navegador abre la app web servida por Go
- [ ] Logs visibles si algo falla
- [ ] Cerrar orquestador detiene el backend
- [ ] Cero dependencia del módulo KMP de ventas (`posapps`)

---

## Notas de arranque (siguiente paso concreto)

1. Scaffold `desktop-orchestrator` en esta rama.
2. Implementar F1 (`PortResolver` → `GoProcessLauncher` → `HttpHealthChecker` → `BrowserLauncher`).
3. Enganchar F2 con binario ya compilado del repo (`cmd/abacophy`).
4. Solo después abrir UI (F3).

---

*Documento para la rama `launcher-app`. Actualizar checkboxes conforme avance el trabajo.*
