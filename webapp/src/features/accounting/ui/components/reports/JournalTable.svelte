<script lang="ts">
  import { Card, Money } from '../../../../../infrastructure/ui/shared';
  import { ENTRY_TYPE_LABEL, type JournalBook } from '../../../domain/reports';

  export let journal: JournalBook;
</script>

<Card>
  <header class="head">
    <div>
      <h3 class="title">Libro diario</h3>
      <p class="sub">
        Cronológico de asientos
        {#if journal.count > 0}
          · {journal.count} registro{journal.count === 1 ? '' : 's'}
        {/if}
      </p>
    </div>
  </header>

  {#if journal.rows.length === 0}
    <p class="muted">Sin asientos registrados</p>
  {:else}
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Tipo</th>
            <th>Cuenta</th>
            <th>Descripción</th>
            <th class="num">Importe</th>
          </tr>
        </thead>
        <tbody>
          {#each journal.rows as r (r.id)}
            <tr>
              <td class="date">{r.date || '—'}</td>
              <td>
                <span class="pill" data-type={r.type}>
                  {ENTRY_TYPE_LABEL[r.type] ?? r.type}
                </span>
              </td>
              <td>
                <span class="code">{r.accountCode}</span>
                <span class="acc-name">{r.accountName}</span>
              </td>
              <td class="desc">{r.description}</td>
              <td class="num"><Money amount={r.amount} /></td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>

    <div class="foot">
      <span>Ingresos en diario: <strong><Money amount={journal.totalIncome} /></strong></span>
      <span>Gastos en diario: <strong><Money amount={journal.totalExpense} /></strong></span>
    </div>
  {/if}
</Card>

<style>
  .head {
    margin-bottom: 0.75rem;
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
    font-size: 0.86rem;
  }
  th,
  td {
    text-align: left;
    padding: 0.45rem 0.35rem;
    border-bottom: 1px solid var(--ap-border, var(--color-border));
    vertical-align: top;
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
    white-space: nowrap;
  }
  .date {
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
    color: var(--ap-text-muted);
  }
  .pill {
    display: inline-block;
    font-size: 0.68rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    padding: 0.15rem 0.4rem;
    border-radius: 6px;
    background: color-mix(in srgb, var(--ap-border, #333) 60%, transparent);
  }
  .pill[data-type='income'] {
    background: color-mix(in srgb, var(--ap-ok, #3ecf8e) 18%, transparent);
    color: var(--ap-ok, #3ecf8e);
  }
  .pill[data-type='expense'] {
    background: color-mix(in srgb, var(--ap-danger, #f17b7b) 18%, transparent);
    color: var(--ap-danger, #f17b7b);
  }
  .code {
    display: block;
    font-family: ui-monospace, monospace;
    font-size: 0.75rem;
    color: var(--ap-text-muted);
  }
  .acc-name {
    display: block;
    max-width: 11rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .desc {
    max-width: 16rem;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .foot {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem 1.5rem;
    margin-top: 0.85rem;
    font-size: 0.82rem;
    color: var(--ap-text-secondary, var(--ap-text-muted));
  }
</style>
