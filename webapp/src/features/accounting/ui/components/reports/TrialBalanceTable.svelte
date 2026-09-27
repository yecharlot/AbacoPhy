<script lang="ts">
  import { Card, Money } from '../../../../../infrastructure/ui/shared';
  import {
    ACCOUNT_TYPE_LABEL,
    type TrialBalance,
  } from '../../../domain/reports';

  export let trial: TrialBalance;
</script>

<Card>
  <header class="head">
    <div>
      <h3 class="title">Balance de comprobación</h3>
      <p class="sub">Resumen de saldos de todas las cuentas del plan</p>
    </div>
    {#if trial.rows.length > 0}
      <span
        class="badge"
        class:ok={trial.balanced}
        class:warn={!trial.balanced}
        title={trial.balanced ? 'Debe = Haber' : `Diferencia: ${trial.difference.toFixed(2)}`}
      >
        {trial.balanced ? 'Cuadrado' : 'Descuadrado'}
      </span>
    {/if}
  </header>

  {#if trial.rows.length === 0}
    <p class="muted">Sin cuentas en el plan</p>
  {:else}
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Código</th>
            <th>Cuenta</th>
            <th>Tipo</th>
            <th class="num">Debe</th>
            <th class="num">Haber</th>
          </tr>
        </thead>
        <tbody>
          {#each trial.rows as r (r.id)}
            <tr>
              <td class="code">{r.code}</td>
              <td>{r.name}</td>
              <td class="type">{ACCOUNT_TYPE_LABEL[r.type] ?? r.type}</td>
              <td class="num">
                {#if r.debit > 0}
                  <Money amount={r.debit} />
                {:else}
                  <span class="zero">—</span>
                {/if}
              </td>
              <td class="num">
                {#if r.credit > 0}
                  <Money amount={r.credit} />
                {:else}
                  <span class="zero">—</span>
                {/if}
              </td>
            </tr>
          {/each}
        </tbody>
        <tfoot>
          <tr>
            <td colspan="3" class="tot-label">Totales</td>
            <td class="num tot"><Money amount={trial.totalDebit} /></td>
            <td class="num tot"><Money amount={trial.totalCredit} /></td>
          </tr>
        </tfoot>
      </table>
    </div>
    {#if !trial.balanced}
      <p class="diff" role="status">
        Diferencia Debe − Haber:
        <strong><Money amount={trial.difference} /></strong>
      </p>
    {/if}
  {/if}
</Card>

<style>
  .head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 0.75rem;
    margin-bottom: 0.75rem;
  }
  .title {
    margin: 0;
    font-size: 1.05rem;
  }
  .sub {
    margin: 0.2rem 0 0;
    font-size: 0.82rem;
    color: var(--ap-text-muted, var(--color-text-secondary));
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
  .badge.ok {
    background: color-mix(in srgb, var(--ap-ok, #3ecf8e) 18%, transparent);
    color: var(--ap-ok, #3ecf8e);
  }
  .badge.warn {
    background: color-mix(in srgb, var(--ap-danger, #f17b7b) 18%, transparent);
    color: var(--ap-danger, #f17b7b);
  }
  .muted {
    color: var(--ap-text-muted);
    font-size: 0.9rem;
  }
  .table-wrap {
    overflow-x: auto;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.88rem;
  }
  th,
  td {
    text-align: left;
    padding: 0.45rem 0.4rem;
    border-bottom: 1px solid var(--ap-border, var(--color-border));
  }
  th {
    font-size: 0.65rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--ap-text-muted);
  }
  .num {
    text-align: right;
    font-variant-numeric: tabular-nums;
  }
  .code {
    font-family: ui-monospace, monospace;
    font-size: 0.82rem;
    color: var(--ap-text-muted);
  }
  .type {
    font-size: 0.8rem;
    color: var(--ap-text-secondary, var(--ap-text-muted));
  }
  .zero {
    color: var(--ap-text-muted);
    opacity: 0.5;
  }
  tfoot td {
    border-bottom: none;
    padding-top: 0.65rem;
    font-weight: 600;
  }
  .tot-label {
    text-align: right;
    text-transform: uppercase;
    font-size: 0.72rem;
    letter-spacing: 0.05em;
    color: var(--ap-text-muted);
  }
  .diff {
    margin: 0.75rem 0 0;
    font-size: 0.85rem;
    color: var(--ap-danger, #f17b7b);
  }
</style>
