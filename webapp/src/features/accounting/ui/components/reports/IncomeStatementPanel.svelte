<script lang="ts">
  import { Card, Money } from '../../../../../infrastructure/ui/shared';
  import type { IncomeStatement } from '../../../domain/reports';

  export let statement: IncomeStatement;
</script>

<Card>
  <header class="head">
    <div>
      <h3 class="title">Estado de resultados</h3>
      <p class="sub">
        Pérdidas y ganancias · {statement.periodLabel}
      </p>
    </div>
    <span class="badge" class:profit={statement.netResult >= 0} class:loss={statement.netResult < 0}>
      {statement.netResult >= 0 ? 'Utilidad' : 'Pérdida'}
    </span>
  </header>

  <div class="grid">
    <section class="block">
      <h4 class="block-title">Ingresos</h4>
      {#if statement.incomeLines.length === 0}
        <p class="muted">Sin ingresos en el periodo</p>
      {:else}
        <ul class="lines">
          {#each statement.incomeLines as l (l.id)}
            <li>
              <span class="code">{l.code}</span>
              <span class="name">{l.name}</span>
              <span class="amt"><Money amount={l.amount} /></span>
            </li>
          {/each}
        </ul>
      {/if}
      <div class="subtotal">
        <span>Total ingresos</span>
        <strong><Money amount={statement.totalIncome} /></strong>
      </div>
    </section>

    <section class="block">
      <h4 class="block-title">Gastos</h4>
      {#if statement.expenseLines.length === 0}
        <p class="muted">Sin gastos en el periodo</p>
      {:else}
        <ul class="lines">
          {#each statement.expenseLines as l (l.id)}
            <li>
              <span class="code">{l.code}</span>
              <span class="name">{l.name}</span>
              <span class="amt"><Money amount={l.amount} /></span>
            </li>
          {/each}
        </ul>
      {/if}
      <div class="subtotal">
        <span>Total gastos</span>
        <strong><Money amount={statement.totalExpenses} /></strong>
      </div>
    </section>
  </div>

  <div class="result" class:profit={statement.netResult >= 0} class:loss={statement.netResult < 0}>
    <span class="result-label">
      {statement.netResult >= 0 ? 'Resultado del periodo (utilidad)' : 'Resultado del periodo (pérdida)'}
    </span>
    <span class="result-amt"><Money amount={Math.abs(statement.netResult)} large /></span>
  </div>

  <p class="hint">
    Fuente: {statement.source === 'accounts'
      ? 'saldos del plan de cuentas'
      : statement.source === 'summary'
        ? 'resumen del servidor'
        : 'asientos del periodo'}
  </p>
</Card>

<style>
  .head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 0.75rem;
    margin-bottom: 1rem;
  }
  .title {
    margin: 0;
    font-size: 1.05rem;
  }
  .sub {
    margin: 0.2rem 0 0;
    font-size: 0.82rem;
    color: var(--ap-text-muted);
  }
  .badge {
    flex-shrink: 0;
    font-size: 0.7rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    padding: 0.28rem 0.55rem;
    border-radius: 999px;
  }
  .badge.profit {
    background: color-mix(in srgb, var(--ap-ok, #3ecf8e) 18%, transparent);
    color: var(--ap-ok, #3ecf8e);
  }
  .badge.loss {
    background: color-mix(in srgb, var(--ap-danger, #f17b7b) 18%, transparent);
    color: var(--ap-danger, #f17b7b);
  }
  .grid {
    display: grid;
    gap: 1.25rem;
  }
  @media (min-width: 720px) {
    .grid {
      grid-template-columns: 1fr 1fr;
    }
  }
  .block-title {
    margin: 0 0 0.5rem;
    font-size: 0.72rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--ap-text-muted);
  }
  .muted {
    color: var(--ap-text-muted);
    font-size: 0.88rem;
  }
  .lines {
    list-style: none;
    margin: 0;
    padding: 0;
  }
  .lines li {
    display: grid;
    grid-template-columns: 3.5rem 1fr auto;
    gap: 0.5rem;
    align-items: baseline;
    padding: 0.35rem 0;
    border-bottom: 1px solid var(--ap-border, var(--color-border));
    font-size: 0.88rem;
  }
  .code {
    font-family: ui-monospace, monospace;
    font-size: 0.8rem;
    color: var(--ap-text-muted);
  }
  .name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .amt {
    font-variant-numeric: tabular-nums;
  }
  .subtotal {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 0.65rem;
    padding-top: 0.5rem;
    font-size: 0.88rem;
    border-top: 1px dashed var(--ap-border, var(--color-border));
  }
  .result {
    margin-top: 1.25rem;
    padding: 1rem 1.1rem;
    border-radius: var(--ap-radius, 12px);
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
  }
  .result.profit {
    background: color-mix(in srgb, var(--ap-ok, #3ecf8e) 12%, transparent);
  }
  .result.loss {
    background: color-mix(in srgb, var(--ap-danger, #f17b7b) 12%, transparent);
  }
  .result-label {
    font-size: 0.85rem;
    font-weight: 600;
  }
  .result-amt {
    font-variant-numeric: tabular-nums;
  }
  .hint {
    margin: 0.75rem 0 0;
    font-size: 0.75rem;
    color: var(--ap-text-muted);
  }
</style>
