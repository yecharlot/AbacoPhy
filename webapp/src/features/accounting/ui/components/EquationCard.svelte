<script lang="ts">
  import {
    Landmark,
    Scale,
    PiggyBank,
    TrendingUp,
    TrendingDown,
    BadgeDollarSign,
    Info,
  } from '@lucide/svelte';
  import { formatAmount } from '../../../../infrastructure/ui/charts';
  import type { Equation } from '../../domain/entities/Equation';

  /** Datos de EquationSnapshot (vía summary). Props numéricas opcionales refuerzan el render. */
  export let equation: Equation | null | undefined = undefined;
  export let currency = 'CUP';
  export let assets: number | undefined = undefined;
  export let liabilities: number | undefined = undefined;
  export let equity: number | undefined = undefined;
  export let income: number | undefined = undefined;
  export let expenses: number | undefined = undefined;
  export let netProfit: number | undefined = undefined;

  function n(v: unknown): number {
    const x = Number(v);
    return Number.isFinite(x) ? x : 0;
  }

  function pick(explicit: number | undefined, fromEq: unknown): number {
    if (explicit != null && Number.isFinite(Number(explicit))) return n(explicit);
    return n(fromEq);
  }

  // ACTIVO = PASIVO + PATRIMONIO + (INGRESOS − GASTOS)
  $: a = pick(assets, equation?.assets);
  $: l = pick(liabilities, equation?.liabilities);
  $: e = pick(equity, equation?.equity);
  $: inc = pick(income, equation?.income);
  $: exp = pick(expenses, equation?.expenses);
  $: net = pick(netProfit, equation?.netProfit);
  $: netResolved = Math.abs(net) > 0.0001 || (inc === 0 && exp === 0) ? net : inc - exp;
  $: rhs = l + e + (inc - exp);
  $: balanced = Math.abs(a - rhs) < 0.01;
</script>
<section class="eq-card" aria-label="Ecuación contable ampliada">
  <header class="eq-head">
    <div class="eq-title-row">
      <Scale size={18} strokeWidth={2.2} aria-hidden="true" />
      <h3>Ecuación contable</h3>
    </div>
    <span
      class="balance-pill tip-pill"
      class:ok={balanced}
      class:warn={!balanced}
      tabindex="0"
    >
      {balanced ? 'Cuadra' : 'Descuadre'}
      <span class="tip-bubble tip-bubble-lg tip-bubble-pill">
        <strong>{balanced ? 'La ecuación cuadra' : 'Hay descuadre'}</strong>
        <br />
        Activos {formatAmount(a)} {currency}
        =
        Pasivos {formatAmount(l)}
        + Patrimonio {formatAmount(e)}
        + (Ingresos − Gastos) {formatAmount(netResolved)}
        <br />
        Lado derecho: {formatAmount(rhs)} {currency}
        {#if !balanced}
          <br />Diferencia: {formatAmount(Math.abs(a - rhs))} {currency}
        {/if}
      </span>
    </span>
  </header>

  <p class="eq-lead">
    Lo que el negocio <strong>tiene</strong> (activos) debe igualar a lo que
    <strong>debe</strong>, el <strong>capital aportado</strong> y el
    <strong>resultado</strong> del período.
  </p>
  <p class="eq-formula" title="Activo = Pasivo + Patrimonio + (Ingresos − Gastos)">
    Activo = Pasivo + Patrimonio + (Ingresos − Gastos)
  </p>

  <div class="eq-grid" role="group" aria-label="Ecuación ampliada">
    <div class="eq-item" title="Lo que el negocio tiene: caja, banco, inventarios…">
      <div class="eq-lbl">
        <Landmark size={14} strokeWidth={2.2} aria-hidden="true" />
        <span>Activos</span>
        <span class="tip" role="img" aria-label="Qué es">
          <Info size={12} strokeWidth={2} />
          <span class="tip-bubble">
            <strong>Lo que tiene</strong> el negocio: caja, bancos, inventarios y otros bienes.
          </span>
        </span>
      </div>
      <span class="val cyan">{formatAmount(a)} <small>{currency}</small></span>
    </div>

    <div class="eq-op" aria-hidden="true">=</div>

    <div class="eq-item" title="Deudas y obligaciones pendientes de pago.">
      <div class="eq-lbl">
        <Scale size={14} strokeWidth={2.2} aria-hidden="true" />
        <span>Pasivos</span>
        <span class="tip" role="img" aria-label="Qué es">
          <Info size={12} strokeWidth={2} />
          <span class="tip-bubble">
            <strong>Lo que debe</strong>: proveedores, préstamos y otras deudas.
          </span>
        </span>
      </div>
      <span class="val pink">{formatAmount(l)} <small>{currency}</small></span>
    </div>

    <div class="eq-op" aria-hidden="true">+</div>

    <div class="eq-item" title="Capital aportado al negocio (cuentas de patrimonio).">
      <div class="eq-lbl">
        <PiggyBank size={14} strokeWidth={2.2} aria-hidden="true" />
        <span>Patrimonio</span>
        <span class="tip" role="img" aria-label="Qué es">
          <Info size={12} strokeWidth={2} />
          <span class="tip-bubble">
            <strong>Capital aportado</strong> (cuentas equity). No incluye el resultado
            del período; ese va en el término siguiente.
          </span>
        </span>
      </div>
      <span class="val amber">{formatAmount(e)} <small>{currency}</small></span>
    </div>

    <div class="eq-op" aria-hidden="true">+</div>

    <div
      class="eq-item eq-item-result"
      title="Resultado del período = Ingresos − Gastos"
    >
      <div class="eq-lbl">
        <BadgeDollarSign size={14} strokeWidth={2.2} aria-hidden="true" />
        <span>Ingresos − Gastos</span>
        <span class="tip tip-wide" role="img" aria-label="Comprobación de la ecuación">
          <Info size={12} strokeWidth={2} />
          <span class="tip-bubble tip-bubble-lg">
            <strong>Resultado del período</strong>
            <br />
            {formatAmount(inc)} ingresos − {formatAmount(exp)} gastos =
            <strong>{formatAmount(netResolved)} {currency}</strong>
            <br /><br />
            <strong>Comprobación</strong>
            <br />
            Activos {formatAmount(a)}
            = Pasivos {formatAmount(l)}
            + Patrimonio {formatAmount(e)}
            + Resultado {formatAmount(netResolved)}
            <br />
            Lado derecho: <strong>{formatAmount(rhs)} {currency}</strong>
            ·
            {balanced ? 'Cuadra' : 'Descuadre ' + formatAmount(Math.abs(a - rhs))}
          </span>
        </span>
      </div>
      <span class="val" class:green={netResolved >= 0} class:pink={netResolved < 0}>
        {formatAmount(netResolved)} <small>{currency}</small>
      </span>
      <span class="eq-sub">
        {formatAmount(inc)} − {formatAmount(exp)}
      </span>
    </div>
  </div>

  <p class="eq-visual-hint" class:ok={balanced} class:warn={!balanced}>
    {#if balanced}
      <span class="hint-eq">{formatAmount(a)}</span>
      <span class="hint-op">=</span>
      <span class="hint-term">{formatAmount(l)} <small>pasivos</small></span>
      <span class="hint-op">+</span>
      <span class="hint-term">{formatAmount(e)} <small>patrimonio</small></span>
      <span class="hint-op">+</span>
      <span class="hint-term hint-result">{formatAmount(netResolved)} <small>resultado</small></span>
    {:else}
      Los activos ({formatAmount(a)}) no coinciden con el lado derecho ({formatAmount(rhs)}).
      Diferencia: {formatAmount(Math.abs(a - rhs))} {currency}.
    {/if}
  </p>

<div class="summary-row">
    <div class="summ-item" title="Total de asientos tipo income del período.">
      <div class="eq-lbl">
        <TrendingUp size={14} strokeWidth={2.2} aria-hidden="true" />
        <span>Ingresos</span>
        <span class="tip" role="img" aria-label="Origen del valor">
          <Info size={12} strokeWidth={2} />
          <span class="tip-bubble">
            Origen: suma de asientos <strong>income</strong>
            (y/o saldos de cuentas de ingreso según el backend).
          </span>
        </span>
      </div>
      <span class="val green">{formatAmount(inc)} <small>{currency}</small></span>
    </div>

    <div class="summ-item" title="Total de asientos tipo expense del período.">
      <div class="eq-lbl">
        <TrendingDown size={14} strokeWidth={2.2} aria-hidden="true" />
        <span>Gastos</span>
        <span class="tip" role="img" aria-label="Origen del valor">
          <Info size={12} strokeWidth={2} />
          <span class="tip-bubble">
            Origen: suma de asientos <strong>expense</strong>
            del libro diario / cuentas de gasto.
          </span>
        </span>
      </div>
      <span class="val pink">{formatAmount(exp)} <small>{currency}</small></span>
    </div>

    <div class="summ-item highlight" title="Utilidad neta = Ingresos − Gastos.">
      <div class="eq-lbl">
        <BadgeDollarSign size={14} strokeWidth={2.2} aria-hidden="true" />
        <span>Utilidad neta</span>
        <span class="tip" role="img" aria-label="Origen del valor">
          <Info size={12} strokeWidth={2} />
          <span class="tip-bubble">
            Cálculo: <strong>Ingresos − Gastos</strong>
            (resultado del período).
          </span>
        </span>
      </div>
      <span class="val" class:green={netResolved >= 0} class:pink={netResolved < 0}>
        {formatAmount(netResolved)} <small>{currency}</small>
      </span>
    </div>
  </div>
</section>

<style>
  .eq-card {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg, 20px);
    padding: 18px 20px 16px;
    box-shadow: var(--shadow-soft);
  }
  .eq-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 6px;
  }
  .eq-title-row {
    display: flex;
    align-items: center;
    gap: 8px;
    color: var(--color-text-primary);
  }
  .eq-title-row h3 {
    margin: 0;
    font-size: 1rem;
    font-weight: 650;
    letter-spacing: -0.02em;
  }
  .balance-pill {
    font-size: 0.68rem;
    font-weight: 700;
    padding: 4px 10px;
    border-radius: 999px;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }
  .balance-pill.ok {
    background: color-mix(in srgb, var(--accent-green) 18%, transparent);
    color: var(--accent-green);
  }
  .balance-pill.warn {
    background: color-mix(in srgb, var(--accent-yellow, #ffe35a) 18%, transparent);
    color: var(--accent-yellow, #ffe35a);
  }
  .eq-formula {
    margin: 0 0 14px;
    font-size: 0.72rem;
    color: var(--color-text-muted);
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  }

  .eq-grid {
    display: flex;
    align-items: stretch;
    justify-content: space-between;
    gap: 8px;
    flex-wrap: wrap;
  }
  .eq-item,
  .summ-item {
    flex: 1 1 120px;
    min-width: 100px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .eq-op {
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.25rem;
    font-weight: 300;
    color: var(--color-text-muted);
    padding: 0 4px;
    align-self: center;
  }

  .eq-lbl {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-size: 0.68rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--color-text-secondary);
    font-weight: 600;
  }

  .tip {
    position: relative;
    display: inline-flex;
    color: var(--color-text-muted);
    cursor: help;
  }
  .tip-bubble {
    display: none;
    position: absolute;
    left: 50%;
    bottom: calc(100% + 8px);
    transform: translateX(-50%);
    width: min(240px, 70vw);
    padding: 8px 10px;
    border-radius: 10px;
    background: var(--color-surface-raised, #151b2e);
    border: 1px solid var(--color-border);
    box-shadow: var(--shadow-soft, 0 12px 32px rgba(0, 0, 0, 0.35));
    color: var(--color-text-secondary);
    font-size: 0.7rem;
    font-weight: 500;
    text-transform: none;
    letter-spacing: 0;
    line-height: 1.35;
    z-index: 20;
    pointer-events: none;
  }
  .tip:hover .tip-bubble,
  .tip:focus-within .tip-bubble {
    display: block;
  }

  .val {
    font-size: 1.05rem;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    letter-spacing: -0.02em;
  }
  .val small {
    font-size: 0.65em;
    font-weight: 600;
    opacity: 0.75;
  }
  .cyan {
    color: var(--accent-cyan);
  }
  .pink {
    color: var(--accent-pink, var(--accent-red));
  }
  .amber {
    color: var(--accent-yellow, #f5c542);
  }
  .green {
    color: var(--accent-green);
  }

  .eq-divider {
    height: 1px;
    background: var(--color-border);
    margin: 16px 0 14px;
  }

  .summary-row {
    display: grid;
    grid-template-columns: 1fr 1fr 1.15fr;
    gap: 12px;
  }
  .highlight {
    background: color-mix(in srgb, var(--color-surface-raised, #151b2e) 80%, transparent);
    border: 1px solid var(--color-border);
    border-radius: 12px;
    padding: 10px 12px;
  }

  @media (max-width: 720px) {
    .eq-grid {
      flex-direction: column;
      align-items: stretch;
    }
    .eq-op {
      padding: 4px 0;
    }
    .summary-row {
      grid-template-columns: 1fr;
    }
  }

  .eq-check {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 8px 14px;
    margin: 4px 0 12px;
    padding: 10px 12px;
    border-radius: 12px;
    border: 1px solid var(--color-border);
    background: color-mix(in srgb, var(--color-surface-raised, #151b2e) 70%, transparent);
    font-size: 0.8rem;
    font-variant-numeric: tabular-nums;
  }
  .eq-check.ok {
    border-color: color-mix(in srgb, var(--accent-green, #4ade80) 35%, var(--color-border));
  }
  .eq-check.warn {
    border-color: color-mix(in srgb, var(--accent-red, #f17b7b) 40%, var(--color-border));
  }
  .eq-check-label {
    font-size: 0.65rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    font-weight: 700;
    color: var(--color-text-secondary);
  }
  .eq-check-math {
    color: var(--color-text-primary);
    font-weight: 600;
  }
  .eq-check-rhs {
    color: var(--color-text-secondary);
    font-weight: 500;
  }
  @media (max-width: 720px) {
    .eq-check-math {
      font-size: 0.75rem;
      line-height: 1.4;
    }
  }

  .eq-lead {
    margin: 0 0 8px;
    font-size: 0.82rem;
    line-height: 1.45;
    color: var(--color-text-secondary);
    max-width: 52rem;
  }
  .eq-lead strong {
    color: var(--color-text-primary);
    font-weight: 600;
  }

  .eq-check {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin: 4px 0 14px;
    padding: 14px 14px 12px;
    border-radius: 14px;
    border: 1px solid var(--color-border);
    background: color-mix(in srgb, var(--color-surface-raised, #151b2e) 75%, transparent);
  }
  .eq-check.ok {
    border-color: color-mix(in srgb, var(--accent-green, #4ade80) 32%, var(--color-border));
  }
  .eq-check.warn {
    border-color: color-mix(in srgb, var(--accent-red, #f17b7b) 38%, var(--color-border));
  }
  .eq-check-head {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px 12px;
  }
  .eq-check-label {
    font-size: 0.65rem;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    font-weight: 700;
    color: var(--color-text-secondary);
  }
  .eq-check-verdict {
    font-size: 0.85rem;
    font-weight: 650;
    color: var(--color-text-primary);
  }
  .eq-check.ok .eq-check-verdict {
    color: var(--accent-green, #4ade80);
  }
  .eq-check.warn .eq-check-verdict {
    color: var(--accent-red, #f17b7b);
  }

  .eq-balance {
    display: flex;
    flex-wrap: wrap;
    align-items: stretch;
    gap: 12px 14px;
  }
  .eq-side {
    display: flex;
    flex-direction: column;
    gap: 8px;
    min-width: min(100%, 140px);
  }
  .eq-side-right {
    flex: 1 1 220px;
  }
  .eq-side-left {
    flex: 0 1 160px;
  }
  .eq-side-tag {
    font-size: 0.65rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    font-weight: 700;
    color: var(--color-text-muted, var(--color-text-secondary));
  }
  .eq-eq {
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.35rem;
    font-weight: 300;
    color: var(--color-text-muted);
    padding: 0 2px;
    align-self: center;
  }
  .eq-chips {
    display: flex;
    flex-wrap: wrap;
    align-items: stretch;
    gap: 8px;
  }
  .eq-plus {
    display: flex;
    align-items: center;
    font-size: 1.1rem;
    font-weight: 300;
    color: var(--color-text-muted);
    padding: 0 2px;
  }
  .eq-chip {
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 112px;
    padding: 8px 10px;
    border-radius: 12px;
    border: 1px solid var(--color-border);
    background: color-mix(in srgb, var(--color-surface, #0f1412) 55%, transparent);
  }
  .eq-chip-k {
    font-size: 0.68rem;
    font-weight: 650;
    color: var(--color-text-secondary);
    line-height: 1.25;
  }
  .eq-chip-k em {
    font-style: normal;
    font-weight: 500;
    opacity: 0.75;
  }
  .eq-chip-v {
    font-size: 1rem;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    letter-spacing: -0.02em;
  }
  .eq-chip-v small {
    font-size: 0.65em;
    font-weight: 600;
    opacity: 0.75;
  }
  .eq-chip-sub {
    font-size: 0.68rem;
    color: var(--color-text-muted, var(--color-text-secondary));
    font-variant-numeric: tabular-nums;
  }
  .eq-chip.cyan .eq-chip-v { color: var(--accent-cyan); }
  .eq-chip.pink .eq-chip-v { color: var(--accent-pink, var(--accent-red)); }
  .eq-chip.amber .eq-chip-v { color: var(--accent-yellow, #f5c542); }
  .eq-chip.result {
    flex: 1 1 140px;
    border-color: color-mix(in srgb, var(--accent-green, #4ade80) 25%, var(--color-border));
  }
  .eq-plain {
    margin: 0;
    font-size: 0.8rem;
    line-height: 1.45;
    color: var(--color-text-secondary);
  }

  @media (max-width: 720px) {
    .eq-balance {
      flex-direction: column;
    }
    .eq-eq {
      padding: 2px 0;
      font-size: 1.1rem;
    }
    .eq-side-left,
    .eq-side-right {
      flex: 1 1 auto;
      min-width: 0;
    }
    .eq-chips {
      flex-direction: column;
    }
    .eq-plus {
      justify-content: center;
      padding: 2px 0;
    }
  }


  .eq-item-result {
    flex: 1.2 1 140px;
    min-width: 130px;
  }
  .eq-sub {
    font-size: 0.68rem;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    color: var(--color-text-muted, var(--color-text-secondary));
    margin-top: 2px;
  }

  .eq-visual-hint {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 6px 8px;
    margin: 12px 0 4px;
    padding: 10px 12px;
    border-radius: 12px;
    border: 1px solid var(--color-border);
    background: color-mix(in srgb, var(--color-surface-raised, #151b2e) 70%, transparent);
    font-size: 0.88rem;
    font-weight: 650;
    font-variant-numeric: tabular-nums;
    color: var(--color-text-primary);
    line-height: 1.4;
  }
  .eq-visual-hint.ok {
    border-color: color-mix(in srgb, var(--accent-green, #4ade80) 28%, var(--color-border));
  }
  .eq-visual-hint.warn {
    border-color: color-mix(in srgb, var(--accent-red, #f17b7b) 35%, var(--color-border));
  }
  .hint-eq {
    color: var(--accent-cyan);
    font-weight: 700;
  }
  .hint-op {
    color: var(--color-text-muted);
    font-weight: 400;
  }
  .hint-term {
    color: var(--color-text-primary);
  }
  .hint-term small {
    font-size: 0.65em;
    font-weight: 600;
    opacity: 0.65;
    margin-left: 2px;
  }
  .hint-result {
    color: var(--accent-green, #4ade80);
  }

  .tip-wide .tip-bubble,
  .tip-bubble-lg {
    width: min(300px, 78vw);
    text-align: left;
  }
  .tip-pill {
    position: relative;
    cursor: help;
  }
  .tip-bubble-pill {
    left: auto;
    right: 0;
    transform: none;
    bottom: calc(100% + 10px);
  }
  .tip-pill:hover .tip-bubble,
  .tip-pill:focus-visible .tip-bubble {
    display: block;
  }

  @media (max-width: 720px) {
    .eq-item-result {
      min-width: 0;
    }
    .eq-visual-hint {
      font-size: 0.8rem;
    }
  }

</style>

