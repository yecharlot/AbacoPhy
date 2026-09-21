# DESIGN.md — ÁbacoPhy · Ethereal-inspired system

## 1. Purpose

Visual and responsive language inspired by a premium dark financial dashboard reference.

**Goal:** capture visual grammar, **not** reproduce the reference screen or its content.

| Reference shows | ÁbacoPhy uses |
|-----------------|---------------|
| Wallet / cards / subscriptions | Contabilidad PyME: ecuación, ingresos, gastos, cuentas, facturas, nómina |
| “Total balance”, PayPal, Spotify | Neto / activos, asientos, plan de cuentas, tenant |
| English wallet IA | Producto en **español**, IA de ÁbacoPhy |

Preserve:

- premium dark surfaces
- soft rounded modular cards
- selective gradients (hero / primary CTA only)
- clear hierarchy (metric → trend → detail)
- **structural** responsive breakpoints (not shrink-to-fit)

---

## 2. Design direction

**Keywords:** Premium · Dark · Soft-tech · Editorial · Financial · Modular · Luminous · Minimal

**Avoid:** generic SaaS chrome, heavy borders, flat gray boxes, neon everywhere, sharp rectangles, mobile = scaled desktop.

---

## 3. Product mapping (non-style)

Information architecture stays Feature-First (identity, tenant, accounting, …).

| Design module (reference) | ÁbacoPhy module |
|---------------------------|-----------------|
| Balance / hero metric | Dashboard: neto / ecuación ampliada |
| Income / Expense KPIs | Ingresos / Gastos del periodo |
| Revenue flow chart | Evolución (fase posterior si hay serie temporal) |
| Expense split donut | Distribución por cuenta de gasto (opcional) |
| Recent transactions | Últimos asientos |
| Utility rail (cards) | Accesos rápidos / estado sync / tenant resumido |
| Top nav destinations | views ACL: dashboard, ingresos, gastos, cuentas, reportes, negocio |

Do **not** invent wallet features to match the screenshot.

---

## 4–35. Visual system

(Color, radius, type, shell, cards, charts, responsive rules — same intent as the ethereal reference.)

### Core tokens (implemented in `tokens.css`)

```text
--color-bg:              #050812
--color-surface:         #171b29
--color-surface-raised:  #202536
--color-border:          rgba(255,255,255,.08)
--color-text-primary:    #F7F8FC
--color-text-secondary:  #B7BDCC
--color-text-muted:      #858C9D

--accent-cyan → lime hero gradient
--accent-green / red for semantic pills only
```

### Radius

```text
sm 10 · md 16 · lg 22 · xl 28 · pill 999
```

### Responsive breakpoints (structural)

| Width | Layout |
|-------|--------|
| ≥ 1280px | main + optional utility rail |
| 900–1279 | single column; secondary modules as grid |
| 600–899 | content stream |
| < 600 | mobile dashboard; drawer nav; no permanent rail |

### Page padding tokens

```text
--page-padding: 24 → 20 → 16 → 12
--dashboard-gap: 12 → 10
```

### Do / Don’t

- Do: large rounded surfaces, selective gradients, hierarchy, transform layout by breakpoint.
- Don’t: permanent right rail on mobile, gradients on every card, horizontal scroll of the whole page.

---

## 36. Implementation principle

Reference = **design system**, not pixel clone.

Implementation preserves hierarchy, rhythm, surfaces, color behavior, and responsive intent while product content remains ÁbacoPhy.

**Default theme:** dark (matches design language). Light theme optional via tokens.

**Stack note:** styles live in `infrastructure/ui/theme` + shared/shell components. Feature screens consume tokens; no business rules in CSS.
