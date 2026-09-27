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

  export let equation: Equation;
  export let currency = 'CUP';

  function n(v: unknown): number {
    const x = Number(v);
    return Number.isFinite(x) ? x : 0;
  }

  $: assets = n(equation?.assets);
  $: liabilities = n(equation?.liabilities);
  $: equity = n(equation?.equity);
  $: income = n(equation?.income);
  $: expenses = n(equation?.expenses);
  $: netProfit = n(equation?.netProfit);
  $: rhs = liabilities + equity + (income - expenses);
  $: balanced = Math.abs(assets - rhs) < 0.01;
</script>

<section class="eq-card" aria-label="Ecuación contable ampliada">
  <header class="eq-head">
    <div class="eq-title-row">
      <Scale size={18} strokeWidth={2.2} aria-hidden="true" />
      <h3>Ecuación contable</h3>
    </div>
    <span class="balance-pill" class:ok={balanced} class:warn={!balanced}>
      {balanced ? 'Cuadra' : 'Descuadre'}
    </span>
  </header>

  <p class="eq-formula" title="Activo = Pasivo + Patrimonio + (Ingresos − Gastos)">
    Activo = Pasivo + Patrimonio + (Ingresos − Gastos)
  </p>

  <div class="eq-grid">
    <div class="eq-item" title="Suma de saldos de cuentas de tipo activo (caja, banco, inventario, etc.).">
      <div class="eq-lbl">
        <Landmark size={14} strokeWidth={2.2} aria-hidden="true" />
        <span>Activos</span>
        <span class="tip" role="img" aria-label="Origen del valor">
          <Info size={12} strokeWidth={2} />
          <span class="tip-bubble">
            Origen: saldos de cuentas <strong>asset</strong> del plan de cuentas
            (Caja, bancos, inventarios…).
          </span>
        </span>
      </div>
      <span class="val cyan">{formatAmount(assets)} <small>{currency}</small></span>
    </div>

    <div class="eq-op" aria-hidden="true">=</div>

    <div class="eq-item" title="Suma de saldos de cuentas de pasivo (deudas, proveedores, etc.).">
      <div class="eq-lbl">
        <Scale size={14} strokeWidth={2.2} aria-hidden="true" />
        <span>Pasivos</span>
        <span class="tip" role="img" aria-label="Origen del valor">
          <Info size={12} strokeWidth={2} />
          <span class="tip-bubble">
            Origen: saldos de cuentas <strong>liability</strong>
            (proveedores, préstamos, obligaciones).
          </span>
        </span>
      </div>
      <span class="val pink">{formatAmount(liabilities)} <small>{currency}</small></span>
    </div>

    <div class="eq-op" aria-hidden="true">+</div>

    <div class="eq-item" title="Patrimonio neto / capital del negocio.">
      <div class="eq-lbl">
        <PiggyBank size={14} strokeWidth={2.2} aria-hidden="true" />
        <span>Patrimonio</span>
        <span class="tip" role="img" aria-label="Origen del valor">
          <Info size={12} strokeWidth={2} />
          <span class="tip-bubble">
            Origen: saldos de cuentas <strong>equity</strong>
            (capital, reservas, resultados acumulados).
          </span>
        </span>
      </div>
      <span class="val amber">{formatAmount(equity)} <small>{currency}</small></span>
    </div>
  </div>

  <div class="eq-divider"></div>

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
      <span class="val green">{formatAmount(income)} <small>{currency}</small></span>
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
      <span class="val pink">{formatAmount(expenses)} <small>{currency}</small></span>
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
      <span class="val" class:green={netProfit >= 0} class:pink={netProfit < 0}>
        {formatAmount(netProfit)} <small>{currency}</small>
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
</style>
