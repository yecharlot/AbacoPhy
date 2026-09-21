# DESIGN.md — Ethereal-Inspired Dashboard System

## 1. Purpose

This document defines the visual and responsive design language extracted from the provided dashboard reference.

The goal is **not to reproduce the reference screen literally**, but to capture its visual grammar:

- premium dark financial dashboard
- soft futuristic / editorial aesthetic
- rounded modular surfaces
- vivid gradient accents
- strong information hierarchy
- compact desktop density
- deliberate responsive transformation rather than simple shrinking

The design should feel polished, calm, modern and slightly futuristic.

---

# 2. Design Direction

## Visual keywords

**Premium · Dark · Soft-tech · Editorial · Financial · Modular · Luminous · Minimal · Spacious**

Avoid:

- generic SaaS dashboard appearance
- excessive borders
- flat gray cards
- dense tables everywhere
- excessive gradients
- excessive neon
- sharp rectangular components
- mobile layouts that simply compress the desktop layout

The interface should communicate value and sophistication through spacing, typography, contrast and controlled color.

---

# 3. Global Composition

The reference uses a large dark application canvas surrounded by a soft outer frame.

### Desktop structure

```text
┌──────────────────────────────────────────────────────────────┐
│                        App shell                             │
│                                                              │
│  ┌──────────────────────── Main content ────────────────┐   │
│  │ Header                                               │   │
│  │                                                      │   │
│  │ Balance / KPIs                     Cards             │   │
│  │                                                      │   │
│  │ Charts / Analytics                 Subscriptions     │   │
│  │                                                      │   │
│  │ Recent activity                    ...               │   │
│  └──────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────┘
```

The composition is intentionally asymmetrical:

- primary content occupies approximately 2/3 of the width
- secondary utility panel occupies approximately 1/3
- major cards are visually grouped without heavy separators
- whitespace separates conceptual groups

---

# 4. Application Shell

## Desktop

Use a full-height dark application surface.

Recommended:

```css
.app-shell {
  min-height: 100dvh;
  background: #050812;
  color: #f5f7fb;
}
```

The reference includes a soft outer background/frame around the application on large screens.

For an immersive application, this can be implemented as:

```text
body
└── outer-frame
    └── application-shell
```

### Large-screen frame

- outer padding: 8–16px
- shell radius: 28–36px
- overflow: hidden

Do not use the outer frame on narrow mobile screens.

---

# 5. Color System

The palette should be tokenized.

## Core

```text
--color-bg:              #050812
--color-surface:         #171b29
--color-surface-raised:  #202536
--color-surface-soft:    #282d3d
--color-border:          rgba(255,255,255,.08)

--color-text-primary:    #F7F8FC
--color-text-secondary:  #B7BDCC
--color-text-muted:      #858C9D
```

## Accent colors

```text
--accent-cyan:      #61E6E1
--accent-green:     #B7F56A
--accent-yellow:    #FFE35A
--accent-pink:      #F36BA6
--accent-purple:    #9C82FF
--accent-blue:      #76A7FF
--accent-red:       #F17B7B
```

These should be used as accents rather than global UI colors.

---

# 6. Gradient Language

Gradients are a major part of the visual identity.

Use large, low-frequency gradients instead of noisy multicolor effects.

### Primary hero gradient

Concept:

```text
cyan → mint → lime → soft yellow
```

Example:

```css
background:
  linear-gradient(
    135deg,
    #61E6E1 0%,
    #8EF0B0 42%,
    #D6F56E 100%
  );
```

### Secondary gradients

Use gradients sparingly for:

- financial totals
- highlighted metrics
- selected states
- primary CTAs
- visualization accents

Do not apply gradients to every card.

---

# 7. Typography

The reference uses a modern geometric sans-serif.

Recommended families:

1. Inter
2. Geist
3. Manrope
4. Plus Jakarta Sans

Prefer one family throughout the application.

## Hierarchy

```text
Display / page title
32–40px
weight: 400–500

Section title
16–18px
weight: 500–600

Card metric
28–38px
weight: 500–600

Body
13–15px
weight: 400

Caption
11–12px
weight: 400–500
```

Large numbers should have strong visual presence but should not become excessively bold.

---

# 8. Radius System

Rounded geometry is fundamental.

```text
--radius-sm:   10px
--radius-md:   16px
--radius-lg:   22px
--radius-xl:   28px
--radius-pill: 999px
```

Suggested usage:

- buttons: 999px
- badges: 999px
- small controls: 10–14px
- cards: 18–24px
- hero cards: 24–30px
- application shell: 28–36px

Avoid mixing many unrelated radii.

---

# 9. Shadows

The reference relies more on contrast and surface elevation than traditional shadows.

Prefer subtle shadows:

```css
box-shadow:
  0 12px 40px rgba(0, 0, 0, .18);
```

For floating elements:

```css
box-shadow:
  0 20px 60px rgba(0, 0, 0, .28);
```

Avoid heavy black shadows around every component.

---

# 10. Navigation

Desktop navigation is compact and centered.

Concept:

```text
Logo        [ Dashboard | Statistics | Transactions | My wallet ]     Search Notifications Avatar
```

### Behavior

Desktop:

- horizontal navigation
- pill-shaped active state
- compact height
- low visual noise

Active navigation item:

- light/white surface
- dark text
- fully rounded pill

Inactive items:

- transparent
- muted text

Mobile:

Do not squeeze all desktop navigation into the header.

Transform it into one of:

- compact menu button
- bottom navigation
- horizontally scrollable primary navigation
- navigation drawer

For a dashboard-heavy application, a compact top navigation + optional drawer is preferred when there are many destinations.

---

# 11. Header

The header should have:

- brand
- page title
- primary navigation
- utility actions
- user identity

On desktop the header can be one row.

On smaller screens it should become:

```text
┌────────────────────────────┐
│ ☰   Logo        ◯  Avatar │
├────────────────────────────┤
│ Dashboard                  │
└────────────────────────────┘
```

Do not force the page title and full navigation into the same row on mobile.

---

# 12. Card System

Cards should feel like parts of a single visual system rather than isolated boxes.

## Base card

```css
.card {
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border);
}
```

Use internal spacing around:

```text
20–24px desktop
16–20px mobile
```

---

# 13. Hero / Balance Card

The primary card is the visual anchor.

Structure:

```text
Total balance

120,456.50 $

+2,456 revenue from last month

[ Transfer ] [ Top Up ] [ action ]
```

Characteristics:

- large gradient surface
- dark text
- very large number
- rounded geometry
- abstract translucent shape in background
- actions integrated into the card

The abstract background geometry should be implemented as decorative layers, not as content.

Example:

```text
hero-card
├── content
├── actions
└── decorative-gradient-shapes
```

Decorative layers must never affect layout.

---

# 14. KPI Cards

Secondary metrics use smaller dark cards.

Example:

```text
Income
+2,456 $
This week's income              +15.7%
```

and:

```text
Expense
-1,124 $
This week's expense             -10.7%
```

The positive/negative percentage indicator should be a compact pill.

Do not make the entire card green/red.

Only the semantic indicator should carry the strong status color.

---

# 15. Charts

Charts are integrated into cards rather than displayed as standalone analytics pages.

## Revenue chart

Use:

- vertical bars
- rounded bar tops
- subtle gradient/highlight
- one selected/highlighted bar
- compact tooltip
- minimal axes

Avoid heavy gridlines.

The chart should feel like part of the card.

## Donut chart

Use:

- thick ring
- rounded visual language
- segmented colors
- centered total
- legend aligned beside or below depending on width

At narrow widths:

```text
       donut

Food             30%
Entertainment    10%
Health           10%
Transportation   15%
...
```

---

# 16. Right Utility Panel

The desktop reference uses a persistent secondary panel.

It contains:

1. cards
2. subscriptions
3. compact management controls

This panel should be considered a **secondary rail**, not another page.

Desktop:

```text
Main content              Utility rail
───────────────           ─────────────
Dashboard                 My cards
KPIs                      Subscriptions
Charts                    ...
Transactions
```

---

# 17. Responsive Strategy

This is one of the most important rules.

## Do NOT simply scale the desktop layout.

The dashboard should use **structural breakpoints**.

### Large desktop ≥ 1280px

Use:

```text
┌─────────────────────────────────────────────┐
│ Header                                      │
├───────────────────────────┬─────────────────┤
│ Main                      │ Utility rail    │
│                           │                 │
│ Hero + KPI                │ Cards           │
│ Charts                    │ Subscriptions   │
│ Transactions              │                 │
└───────────────────────────┴─────────────────┘
```

Recommended:

```text
main:  minmax(0, 2fr)
rail:  minmax(280px, .95fr)
gap:   12–16px
```

The rail remains visible.

---

# 18. Medium Desktop / Tablet Landscape

### ~900–1279px

The secondary rail should stop behaving like a permanent column.

Transform:

```text
Desktop

Main | Rail
```

into:

```text
Main
────────────────
Hero
KPIs
Charts

Utility modules
────────────────
Cards
Subscriptions
```

Possible implementation:

```css
.dashboard {
  grid-template-columns: 1fr;
}

.utility-rail {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}
```

This preserves the content while reducing horizontal pressure.

---

# 19. Tablet Portrait

### ~600–899px

Prioritize:

1. balance
2. critical KPIs
3. primary analytics
4. recent activity
5. secondary modules

Recommended structure:

```text
Header

Balance
────────────

Income      Expense
──────────── ────────────

Revenue
────────────

Expense split
────────────

Cards / subscriptions
────────────

Transactions
```

The UI should become a single content stream.

---

# 20. Mobile

### < 600px

The design becomes a **mobile dashboard**, not a miniature desktop dashboard.

Remove:

- persistent right rail
- large desktop navigation
- unnecessary decorative whitespace
- nonessential secondary actions

Keep:

- balance
- critical metrics
- important activity
- essential account information

Recommended order:

```text
Header

Dashboard title

Balance

Income / Expense

Revenue

Expense split

Recent transactions

Cards

Subscriptions
```

Secondary modules can become horizontally scrollable sections if they are useful but should not dominate the screen.

---

# 21. Mobile Navigation

Preferred model:

```text
┌──────────────────────────┐
│ ☰  Dashboard       ◯ 👤 │
└──────────────────────────┘
```

For applications with 3–5 critical destinations, a bottom navigation can be used:

```text
Home   Stats   Activity   Wallet
```

Do not combine a large desktop navigation pill with a bottom navigation unless there is a specific information-architecture reason.

---

# 22. Responsive Grid Tokens

Use CSS variables:

```css
:root {
  --page-padding: 24px;
  --dashboard-gap: 12px;
}

@media (max-width: 1279px) {
  :root {
    --page-padding: 20px;
  }
}

@media (max-width: 899px) {
  :root {
    --page-padding: 16px;
    --dashboard-gap: 10px;
  }
}

@media (max-width: 599px) {
  :root {
    --page-padding: 12px;
    --dashboard-gap: 10px;
  }
}
```

The exact values may be adjusted per product.

---

# 23. Container Behavior

Use a centered maximum-width container on very large displays.

Recommended:

```css
.dashboard-container {
  width: min(100%, 1500px);
  margin-inline: auto;
  padding-inline: var(--page-padding);
}
```

Avoid endlessly stretching cards across ultrawide monitors.

---

# 24. Overflow Rules

Never allow the complete dashboard to become horizontally scrollable.

Horizontal scrolling is acceptable only for intentional component collections:

- cards
- subscriptions
- category chips
- compact navigation

Never use horizontal scrolling as a substitute for responsive layout.

---

# 25. Responsive Card Transformation

Components should have explicit responsive states.

Example:

```text
Desktop:
[ Card image ][ Card metadata ][ actions ]

Tablet:
[ Card image ]
[ metadata + actions ]

Mobile:
[ Card image ]
[ metadata ]
[ actions ]
```

This is preferable to allowing flexbox to randomly wrap.

---

# 26. Charts on Mobile

Charts must remain readable.

Do not simply reduce their width.

Instead:

- reduce number of visible labels
- simplify legends
- increase touch targets
- allow horizontal chart scrolling when the data genuinely requires it
- preserve the most important visual comparison

For bar charts, 5–6 visible bars are generally preferable to squeezing 12+ labels into a tiny card.

---

# 27. Touch Targets

Mobile interactive elements should have a comfortable target.

Recommended minimum:

```text
44 × 44px
```

Small visual controls may appear smaller but should retain a larger invisible interaction area.

---

# 28. Animation

Motion should be subtle.

Recommended:

```text
150–220ms
ease-out
```

Use animation for:

- card appearance
- hover
- selected navigation
- chart transitions
- expanding sections
- drawer transitions

Avoid:

- constant pulsing
- excessive floating
- long page transitions
- animations that distract from financial information

Respect:

```css
@media (prefers-reduced-motion: reduce) {
  /* disable non-essential animation */
}
```

---

# 29. Interaction States

Every interactive component should define:

- default
- hover
- focus
- active
- disabled
- loading
- error
- success

Focus should remain visible even in the dark theme.

Do not rely exclusively on color to communicate state.

---

# 30. Accessibility

Maintain:

- WCAG-conscious contrast
- visible keyboard focus
- semantic HTML
- accessible labels for icon buttons
- sufficient touch targets
- reduced-motion support
- no information communicated by color alone

The visual softness of the design must not compromise usability.

---

# 31. Component Architecture

Recommended component families:

```text
Dashboard
├── AppShell
├── Header
│   ├── Brand
│   ├── Navigation
│   └── UserActions
│
├── DashboardGrid
│   ├── BalanceCard
│   ├── MetricCard
│   ├── RevenueCard
│   ├── ExpenseSplitCard
│   └── RecentTransactions
│
└── UtilityRail
    ├── CardStack
    └── SubscriptionList
```

Each component should own its responsive behavior.

Avoid a giant dashboard component containing all layout logic.

---

# 32. Design Tokens

A future implementation should centralize:

```text
colors
spacing
radii
typography
shadows
breakpoints
motion
z-index
```

Example:

```css
:root {
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-10: 40px;

  --radius-sm: 10px;
  --radius-md: 16px;
  --radius-lg: 22px;
  --radius-xl: 28px;
}
```

---

# 33. Visual Priority

The interface should communicate hierarchy in this order:

1. Page identity
2. Primary financial/state metric
3. Important changes
4. Trends
5. Detailed activity
6. Secondary utilities

If every component looks equally important, the design has failed.

---

# 34. Do

- Use large rounded surfaces.
- Use a dark neutral base.
- Use bright gradients selectively.
- Keep typography lightweight and modern.
- Group information into clear visual modules.
- Use whitespace instead of excessive borders.
- Make the desktop layout dense but breathable.
- Transform the layout structurally on smaller screens.
- Keep the primary metric visually dominant.
- Preserve the same design language across breakpoints.

# 35. Don't

- Don't shrink the desktop UI until it fits mobile.
- Don't keep a permanent right rail on narrow screens.
- Don't use gradients everywhere.
- Don't turn every metric into a giant card.
- Don't use thick borders around every section.
- Don't overcrowd mobile with secondary information.
- Don't use tiny controls just because the reference uses compact desktop controls.
- Don't sacrifice accessibility for visual similarity.

---

# 36. Implementation Principle

The reference should be treated as a **design system reference**, not as a pixel-perfect screenshot to copy.

The implementation should preserve:

```text
visual hierarchy
+ spatial rhythm
+ surface language
+ color behavior
+ component relationships
+ responsive intent
```

while allowing the actual product's content, branding and information architecture to remain independent.

## Final design principle

> **Desktop is a composition. Mobile is a prioritization.**

The desktop layout should feel like a carefully composed financial workspace.

The mobile layout should feel like the same product intelligently reorganized around the user's most important actions and information.
