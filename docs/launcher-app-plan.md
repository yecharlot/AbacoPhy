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

- [ ] Crear módulo/carpeta `desktop-orchestrator/` (o `launcher/`) fuera de features POS
- [ ] Decidir stack: Kotlin + Compose Multiplatform **Desktop only**
- [ ] Documentar layout de distribución (`runtime/bin`, `runtime/static`)
- [ ] Convención de datos: `ABACOPHY_DATA` bajo carpeta de usuario (p.ej. `~/.abacophy/data`)
- [ ] Variables opcionales documentadas: `ABACOPHY_BIN`, `ABACOPHY_STATIC`, `ABACOPHY_DATA`, `PORT`
- [ ] README corto del launcher (qué hace / qué no hace)
- [ ] Confirmar que **no** se comparte código con `posapps` salvo utilidades genéricas inevitables

**Criterio de hecho F0:** estructura de proyecto + README de decisiones sin UI todavía.

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

- [ ] `findFreePort()` en loopback (`127.0.0.1` / `ServerSocket(0)`)
- [ ] No hardcodear `8090` como puerto de producción del launcher

### 1.2 Proceso Go

- [ ] `ProcessBuilder` / API equivalente para arrancar `abacophy` / `abacophy.exe`
- [ ] Pasar env: `PORT`, `ABACOPHY_DATA`, `ABACOPHY_STATIC`
- [ ] Capturar **stdout** y **stderr** línea a línea → stream de logs
- [ ] API `start` / `stop` / `isAlive`

### 1.3 Health

- [ ] Poll `GET http://127.0.0.1:$PORT/api/v1/health` (fallback `/api/v1/info`)
- [ ] Intervalo ~200–500 ms; timeout total configurable (p.ej. 30–60 s)
- [ ] Fallo de health → marcar tarea Failed y detener proceso hijo

### 1.4 Navegador

- [ ] Abrir `http://127.0.0.1:$PORT/` con `Desktop.browse` (o equivalente JVM)
- [ ] Fallback si el Desktop no está disponible (mensaje en log/UI)

### 1.5 Máquina de estados

- [ ] Modelo `TaskStep`: Pending | Running | Success | Failed + mensaje
- [ ] `OrchestratorUseCase` ejecuta la secuencia en orden
- [ ] Main de consola o test que valide la secuencia sin UI (mock o binario real)

**Criterio de hecho F1:** secuencia completa ejecutable sin ventana gráfica.

---

## Fase 2 — Runtime Go + estáticos

- [ ] Script de build que compile Go → `desktop-orchestrator/runtime/bin/abacophy[.exe]`
- [ ] Incluir estáticos (`static/` y/o `web/dist` según convención del backend) en `runtime/static`
- [ ] Layout de distribución acordado:

```text
AbacoPhy-Desktop/
  AbacoPhyOrchestrator[.exe | instalador]
  runtime/
    bin/abacophy[.exe]
    static/
```

- [ ] Resolución de rutas en **dev** (`user.dir` / relativos)
- [ ] Resolución de rutas en **prod** (junto al instalador / empaquetado)
- [ ] Probar a mano: Go con `PORT` fijo + static → web responde en navegador

**Criterio de hecho F2:** runtime listo para que el launcher lo invoque sin Node ni Vite.

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

- [ ] Ventana Compose Desktop (tema simple claro/oscuro sistema)
- [ ] Lista de pasos enlazada a estado del orquestador (`StateFlow` / equivalente)
- [ ] Panel derecho: logs con scroll; auto-scroll al final
- [ ] Botón **Iniciar** (si no hay proceso activo)
- [ ] Botón **Detener** backend
- [ ] Botón **Abrir navegador otra vez**
- [ ] Una sola pantalla (sin Nav3 / sin shell POS)

**Criterio de hecho F3:** usuario no técnico ve progreso y la web se abre sola.

---

## Fase 4 — Ciclo de vida y robustez

- [ ] Cierre de ventana detiene el proceso Go (`destroy` / `destroyForcibly`)
- [ ] Shutdown hook JVM como respaldo
- [ ] Binario no encontrado → Failed + path esperado visible
- [ ] Health timeout → matar hijo + error claro
- [ ] Crash de Go a mitad → detectar exit code → Failed + últimos logs
- [ ] Puerto inválido / bind fallido → reintento o error explícito
- [ ] (Opcional) single-instance lock para evitar dos orquestadores peleando
- [ ] Probar cierre limpio en al menos un OS objetivo (Windows y/o Linux)

**Criterio de hecho F4:** no quedan procesos zombie al cerrar; errores comprensibles.

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
