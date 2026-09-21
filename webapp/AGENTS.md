# AGENTS.md — ÁbacoPhy Webapp

Documento de gobierno del **frontend** (`webapp/`).
Aplica solo a este módulo. El backend Go y la PWA legada (`static/app`) quedan fuera de alcance salvo contratos de API.

Cualquier agente (humano o IA) que contribuya aquí debe leer y respetar este archivo antes de escribir código.

---

## 1. Arquitectura

### Principios

1. **Clean Architecture** como estructura de capas.
2. **Feature-First** como criterio de organización del código.
3. Separación estricta: UI · lógica de negocio · acceso a datos · DI.
4. Dependencias hacia **abstracciones**, nunca hacia implementaciones concretas.
5. El **dominio no depende** de Svelte, del DOM, de `fetch`, de IndexedDB ni de detalles de infra.
6. Cero lógica de negocio dentro de componentes `.svelte`.
7. Sin duplicación de reglas: una regla vive en un use case.
8. Composición sobre monolitos.
9. Features lo más independientes posible entre sí.
10. Lo compartido va a `infrastructure/` solo si es realmente transversal.

### Capas por feature

```text
feature/
├── domain/          # entidades, use cases, contratos de repositorio
├── data/            # DTOs, mappers, implementaciones, sources
├── ui/              # stores visuales, components, screens
└── di/              # wiring manual de dependencias
```

Flujo de dependencias:

```text
ui  →  domain (use cases + contracts)
         ↑
data (impl)  ←  solo instanciado desde di/
```

### Stack base (plantilla actual)

| Pieza | Valor |
|-------|--------|
| Runtime UI | Svelte 5 |
| Bundler | Vite 8 |
| Lenguaje | TypeScript |
| Entrada | `src/main.ts` → `App.svelte` |
| API backend | REST `/api/v1` (Go) |

La plantilla Svelte+Vite es el punto de partida. No se copia la PWA monolítica de `static/app`; se reimplementa la **idea de producto** (contabilidad PyME offline-first, roles, módulos) con esta arquitectura.

---

## 2. Convenciones de código

### Naming

| Tipo | Convención | Ejemplo |
|------|------------|---------|
| Features | kebab-case (carpeta) | `accounting`, `invoicing` |
| Entidades / use cases | PascalCase | `Entry`, `CreateIncomeEntry` |
| Contratos de repositorio | PascalCase + `Repository` | `EntryRepository` |
| Implementaciones | `…RepositoryImpl` | `EntryRepositoryImpl` |
| DTOs | PascalCase + `Dto` | `EntryDto` |
| Mappers | `toEntity` / `toDto` | `entryMapper.ts` |
| Stores UI | camelCase + `Store` | `sessionStore` |
| Screens | PascalCase + `Screen` | `DashboardScreen.svelte` |
| Components de feature | PascalCase | `EntryForm.svelte` |
| Shared UI | PascalCase | `Money.svelte`, `Badge.svelte` |

### TypeScript

- Strict mode.
- Preferir `type` / `interface` explícitos en domain y contratos.
- No usar `any`. Si el API es desconocido, tipar lo mínimo y estrechar después.
- Los use cases exponen métodos con nombres de negocio (`execute`, o verbo de dominio).

### Svelte 5

- Usar runes (`$state`, `$derived`, `$effect`) de forma consistente.
- Stores de feature: estado visual (`idle | loading | success | error | empty`), no bolsas de lógica.
- Eventos de usuario en screens → invocar use case vía API inyectada / facade del store.

### Estilo de archivos

- Un use case = un archivo (o carpeta si crece).
- Un contrato de repositorio = un archivo en `domain/repositories/`.
- No mezclar DTOs en domain.

### Idioma

- Código (identificadores, archivos): **inglés**.
- Textos de UI orientados a usuario: **español** (producto ÁbacoPhy).
- Comentarios: español o inglés; preferir inglés en domain, español en notas de producto si hace falta.

---

## 3. Estructura de carpetas

Objetivo a alcanzar (no todo debe existir el día 1; se crea al necesitarse):

```text
webapp/
├── AGENTS.md
├── .ai/
│   └── LOG.md
├── .roadmap/
│   └── mvp/
│       └── IMPLEMENTATION_CHECKLIST.md
├── public/
├── src/
│   ├── app/                      # bootstrap, rutas, layout raíz
│   │   ├── App.svelte
│   │   ├── main.ts
│   │   └── routes/               # cuando se añada router
│   │
│   ├── features/
│   │   ├── identity/
│   │   │   ├── domain/
│   │   │   │   ├── entities/
│   │   │   │   ├── repositories/
│   │   │   │   └── usecases/
│   │   │   ├── data/
│   │   │   │   ├── dto/
│   │   │   │   ├── mappers/
│   │   │   │   ├── sources/
│   │   │   │   └── repositories/
│   │   │   ├── ui/
│   │   │   │   ├── stores/
│   │   │   │   ├── components/
│   │   │   │   └── screens/
│   │   │   └── di/
│   │   ├── tenant/
│   │   ├── accounting/
│   │   ├── invoicing/
│   │   ├── payroll/
│   │   ├── catalog/
│   │   ├── warehouse/
│   │   ├── pos/
│   │   ├── costing/
│   │   ├── commerce/
│   │   ├── sync/
│   │   ├── audit/
│   │   └── master/
│   │
│   ├── infrastructure/
│   │   ├── data/
│   │   │   ├── http/             # cliente HTTP, auth header, offline detect
│   │   │   └── storage/          # cola offline, preferencias locales
│   │   ├── domain/               # contratos transversales mínimos
│   │   ├── ui/
│   │   │   ├── shell/            # AppShell, Sidebar, Topbar
│   │   │   ├── theme/            # tokens claro/oscuro
│   │   │   └── shared/           # Button, Card, Table, Toast, Money, Badge
│   │   └── di/                   # composición raíz
│   │
│   ├── app.css                   # tokens globales (migrar hacia theme/)
│   └── assets/
│
├── tests/                        # espejo de src/ cuando haya tests
├── package.json
├── vite.config.ts
├── svelte.config.js
└── tsconfig*.json
```

Hasta que exista routing formal, `App.svelte` puede actuar como shell temporal sin romper la regla de “sin lógica de negocio en UI”.

---

## 4. Reglas de dependencias

| Desde | Puede importar | No puede importar |
|-------|----------------|-------------------|
| `domain/` | solo otros tipos de domain de la misma feature (o contratos compartidos de infrastructure/domain) | Svelte, data, ui, fetch, localStorage |
| `data/` | domain (contratos + entidades), infrastructure/data | ui, otros features’ ui |
| `ui/` | domain use cases / facades expuestos por di, infrastructure/ui shared | data implementations, otros features’ data |
| `di/` | domain + data + ui de **su** feature; infrastructure | — |
| `infrastructure/` | lo mínimo transversal | features concretas (salvo tipos de domain compartidos) |
| Feature A | Feature B solo vía **contratos de domain** o eventos acordados | implementación interna de B |

Inyección **manual** en `di/`. No introducir framework de DI salvo decisión explícita documentada en LOG.

El cliente HTTP y el token viven en `infrastructure/data/http`. Las features no construyen URLs ni headers a mano en components.

---

## 5. Testing

### Prioridad

1. **Domain / use cases** — reglas de negocio y orquestación (unit).
2. **Mappers** — DTO ↔ Entity (unit).
3. **Stores UI** — transiciones de estado visual con use cases mockeados (unit).
4. **Screens / flows críticos** — smoke o integration cuando el MVP lo exija.

### Organización

```text
tests/
└── features/
    └── <feature>/
        ├── domain/
        ├── data/
        └── ui/
```

Espejo de `src/`. Nombrar archivos `*.test.ts` / `*.spec.ts` según el runner que se elija (Vitest recomendado al añadir testing).

### Reglas

- Un use case nuevo o modificado debe poder probarse sin montar Svelte.
- No testear implementación de repositorio remoto como unit puro: mock del source o contrato.
- La checklist de MVP marca qué casos de uso son obligatorios en pruebas antes de considerar la feature “lista para prueba manual”.

---

## 6. UI/UX

### Producto (idea, no copia visual de la PWA legada)

- Contabilidad para PyME / TCP: ingresos, gastos, ecuación ampliada, inventario, nómina, facturación.
- Offline-first: la UI refleja estado de red y cola de sync; no bloquea captura local razonable.
- Roles y módulos: el menú solo muestra lo autorizado (`views` + módulos del tenant).
- Textos de error y traza orientados a usuario en **español**.

### Diseño

- Tema claro por defecto; soporte oscuro.
- Tokens CSS centralizados (`infrastructure/ui/theme`), no valores mágicos repartidos.
- Paleta de producto alineada a marca ÁbacoPhy / PrismaTEC (acento cálido, fondos serenos) **sin** clonar pixel a pixel la PWA antigua.
- Responsive: móvil primero en flujos de mostrador (POS, ingresos rápidos).
- Componentes compartidos en `infrastructure/ui/shared`; componentes de negocio en la feature.

### Estado visual

Cada store de feature que cargue datos debe modelar al menos:

`idle | loading | success | error | empty`

No exponer DTOs crudos ni errores de red sin mapear a mensaje usable.

### Accesibilidad mínima

- Controles con label visible o `aria-label`.
- Foco usable en formularios de login y asientos.
- Contraste legible en ambos temas.

---

## 7. Git

### Ámbito de commits

- Commits de frontend bajo `webapp/`.
- No mezclar cambios de backend Go y webapp en el mismo commit salvo wiring inevitable (documentar en LOG).

### Mensajes (conventional commits)

```text
feat(webapp): …
fix(webapp): …
docs(webapp): …
refactor(webapp): …
test(webapp): …
chore(webapp): …
```

Cuerpo breve en español o inglés; el *scope* `webapp` es obligatorio en este módulo.

### Ramas

- Trabajo de features en ramas `webapp/<feature>-…` o convención del equipo del repo.
- No pushear secretos, tokens ni credenciales de LOGIN.md.

### Antes de PR / merge

- `npm run check` (svelte-check + tsc) en verde.
- Actualizar `.ai/LOG.md` con lo implementado.
- Marcar ítems hechos en `.roadmap/mvp/IMPLEMENTATION_CHECKLIST.md`.

---

## 8. Comportamiento esperado del agente

### Obligatorio

1. Leer este `AGENTS.md` y el checklist MVP activos antes de implementar.
2. Registrar en `.ai/LOG.md` **cada** implementación relevante (qué, por qué, archivos tocados, decisiones).
3. Actualizar el checklist cuando se complete un ítem o se descubra un bloqueo.
4. Respetar Feature-First + Clean Architecture; no “atajos” que pongan `fetch` o reglas contables en `.svelte`.
5. Preferir el contrato de API documentado (`API.md` del repo) frente a inventar endpoints.
6. No copiar la estructura monolítica de `static/app/index.html`; reutilizar solo la **idea de producto**.
7. No añadir dependencias npm sin anotar justificación en LOG.
8. No introducir framework de DI, state manager global ajeno a Svelte, ni librería UI pesada sin decisión explícita.
9. Ante duda de capa (¿domain o data?), elegir la que preserve dominio libre de detalles de red.
10. Si una feature no está en el MVP checklist, no implementarla “de paso”.

### Prohibido

- Lógica de partida doble, tasas de nómina o cálculo de ecuación dentro de components.
- Importar `data/` desde `ui/` saltándose `di/`.
- Commits con `node_modules`, `.env` con secretos, o binarios generados innecesarios.
- Reescribir el backend Go desde este módulo salvo consumo de API.

### Al cerrar una tarea

1. Código alineado a convenciones.
2. Entrada en `.ai/LOG.md`.
3. Checklist actualizado.
4. `npm run check` OK si hay código TypeScript/Svelte nuevo.

---

## Referencias de producto (contexto, no código a clonar)

- Idea: contabilidad PyME sobre Alset — ingresos, gastos, inventario, nómina, facturación, CID/offline.
- API: `/api/v1` (auth Bearer, views por rol, módulos por tenant).
- Persistencia conceptual: `rev` + `root_cid`; sync push/pull.
- Roles orientativos: master, admin, contador, operador, readonly (+ operativos).

Este archivo es la fuente de verdad del **comportamiento del agente** en `webapp/`.
Si entra en conflicto con hábitos de la plantilla Vite por defecto, **gana este documento**.
