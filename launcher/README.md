# ÁbacoPhy Orquestador (Desktop)

Aplicación **solo Desktop (JVM / Compose)** en el directorio `launcher/`.

**No es el POS** (`posapps`). No comparte features de ventas ni sesión offline.

## Qué hace (objetivo de producto)

```text
Resolver puerto libre
  → lanzar proceso Go (abacophy) en localhost:PUERTO
  → esperar health OK
  → abrir http://127.0.0.1:PUERTO/ en el navegador
  → mostrar tareas + logs
  → al cerrar: detener el proceso hijo
```

La **web** es el **build estático** servido por Go (`ABACOPHY_STATIC`). No se usa `vite dev`.

## Arquitectura

**Clean Architecture + Feature-First**

```text
shared/src/commonMain/kotlin/com/elitec/abaco_launcher/
├── feature/orchestrator/
│   ├── domain/          # modelos + contratos + use cases
│   ├── data/            # ProcessBuilder, HTTP health, browser (F1)
│   ├── ui/              # tareas + consola (F3)
│   └── di/              # wiring manual
├── infrastructure/
│   └── config/          # rutas y variables de entorno
└── App.kt               # shell Compose
```

Dependencias apuntan hacia **domain**. La UI no conoce ProcessBuilder.

## Estado actual (Fase 0)

- [x] Módulo Gradle Compose Desktop (`desktopApp` + `shared`)
- [x] Capas domain / data / ui / di del feature `orchestrator`
- [x] Contratos de dominio (sin implementación)
- [x] `LauncherPaths` (convenciones de path/env)
- [x] `runtime/bin` y `runtime/static` (script `scripts/build-runtime.sh`)
- [x] Fase 1: implementaciones data + `OrchestratorUseCase`

## Variables de entorno

| Variable | Uso |
|----------|-----|
| `ABACOPHY_BIN` | Ruta al binario Go (default: `runtime/bin/abacophy[.exe]`) |
| `ABACOPHY_STATIC` | Estáticos web (default: `runtime/static`) |
| `ABACOPHY_DATA` | Datos del negocio (default: `~/.abacophy/data`) |
| `PORT` | Solo para el proceso hijo Go; el launcher elige puerto libre |

## Layout de distribución (F2)

```text
AbacoPhy-Desktop/
  AbacoPhyOrchestrator  (o instalador)
  runtime/
    bin/abacophy[.exe]
    static/             # build web liberado
```

## Cómo ejecutar (dev)

```bash
cd launcher
./gradlew :desktopApp:run
```

Hot reload (si está disponible en el template):

```bash
./gradlew :desktopApp:hotRun --auto
```

## Fuera de alcance

- Login, tenants, POS, outbox, SSE
- Android / iOS
- Sustituir el shell Electron de `desktop/` (pueden coexistir)
- Compilar la web desde este módulo

Plan detallado: `docs/launcher-app-plan.md` (rama `launcher-app`).


## Fase 1 (dominio + data)

- `SystemPortResolver` — puerto libre en 127.0.0.1
- `GoProcessLauncher` — ProcessBuilder + logs stdout/stderr
- `HttpHealthChecker` — poll `/api/v1/health` | `/api/v1/info`
- `DesktopBrowserLauncher` — Desktop.browse / xdg-open
- `OrchestratorUseCase.run()` — secuencia completa con callbacks
- `OrchestratorModule.provideUseCase()` — DI manual JVM

Requiere binario en `runtime/bin/abacophy` (o `ABACOPHY_BIN`) para health OK.


## Fase 2 — Runtime Go + estáticos

Script:

```bash
# Desde launcher/ (host actual)
./scripts/build-runtime.sh

# Cross-compile
./scripts/build-runtime.sh --windows
./scripts/build-runtime.sh --linux

# Incluir build webapp → web/dist si existe
./scripts/build-runtime.sh --web
```

Windows (PowerShell):

```powershell
./scripts/build-runtime.ps1
```

Salida:

```text
launcher/runtime/
  bin/abacophy[.exe]
  static/          # copia de static/ del monorepo (o web/dist)
```

Resolución de rutas (`LauncherPaths.installRoot()`):

1. `ABACOPHY_HOME`
2. `-Dabacophy.home=...`
3. Directorio del JAR (instalación)
4. `user.dir` / `launcher/` en monorepo

Prueba sin UI del orquestador:

```bash
./scripts/build-runtime.sh
PORT=18090 \
  ABACOPHY_STATIC="$PWD/runtime/static" \
  ABACOPHY_DATA="$HOME/.abacophy/data-demo" \
  ./runtime/bin/abacophy
# curl http://127.0.0.1:18090/api/v1/health
# abrir http://127.0.0.1:18090/
```


## Fase 3 — UI tareas + consola

- `feature/orchestrator/ui/OrchestratorScreen` — dos columnas
- `TaskStepRow` — Pending / Running / Success / Failed
- Acciones: **Iniciar**, **Detener**, **Abrir de nuevo**, **Limpiar** logs
- Estado enlazado a `OrchestratorUseCase.run(onState, onLog)`

```bash
./scripts/build-runtime.sh
./gradlew :desktopApp:run
```


## Fase 4 — Ciclo de vida

- Cierre de ventana / **Detener** → `destroy` + `destroyForcibly`
- `ProcessShutdown` — shutdown hook JVM
- `SingleInstanceLock` — un solo orquestador
- Health aborta si el proceso hijo muere (exit code en el error)
- Binario ausente: mensaje con path esperado + `build-runtime.sh`
