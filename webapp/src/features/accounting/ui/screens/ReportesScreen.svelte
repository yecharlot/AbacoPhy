<script lang="ts">
  import { onMount } from 'svelte';
  import { fade, fly } from 'svelte/transition';
  import { utils, writeFile } from 'xlsx';
  import { Button } from '../../../../infrastructure/ui/shared';
  import type {ReportsStore, ReportType} from '../stores/reportsStore';

  export let store: ReportsStore;
  /** Moneda del tenant (p.ej. CUP). No hardcodear DOP/RD$. */
  export let currency: string = 'CUP';

  // Tipar explícitamente el array de entradas
  const reportEntries: [ReportType, string][] = [
    ['trial-balance', 'Balance de Comprobación'],
    ['income-statement', 'Estado de Resultados'],
    ['journal', 'Libro Diario'],
  ];

  onMount(() => {
    store.switchReport('trial-balance');
  });

  /**
   * Mismo criterio que Money.svelte: número tabular + código ISO del negocio.
   * Evita style:'currency' + DOP que pinta RD$ incorrecto.
   */
  function formatMoney(value: number): string {
    const n = Number(value);
    const amount = Number.isFinite(n) ? n : 0;
    const num = new Intl.NumberFormat('es-CU', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
    const code = (currency || '').trim();
    return code ? `${num} ${code}` : num;
  }

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '—';
    // ISO YYYY-MM-DD: parse local seguro
    const d = /^\d{4}-\d{2}-\d{2}$/.test(dateStr)
      ? new Date(dateStr + 'T12:00:00')
      : new Date(dateStr);
    if (Number.isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('es-CU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  function exportTrialBalance() {
    if (!$store.trialBalance) return;

    const data = [
      ['Balance de Comprobación'],
      [`Al ${formatDate($store.trialBalance.asOf)}`],
      [],
      ['Código', 'Cuenta', 'Débito', 'Crédito', 'Saldo'],
      ...$store.trialBalance.accounts.map(acc => [
        acc.accountCode,
        acc.accountName,
        acc.debit,
        acc.credit,
        acc.balance,
      ]),
      [],
      ['Totales', '', $store.trialBalance.totalDebits, $store.trialBalance.totalCredits, ''],
    ];

    const ws = utils.aoa_to_sheet(data);
    ws['!cols'] = [
      { wch: 12 },
      { wch: 25 },
      { wch: 15 },
      { wch: 15 },
      { wch: 15 },
    ];

    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, 'Balance');
    writeFile(wb, `balance-comprobacion-${new Date().toISOString().split('T')[0]}.xlsx`);
  }

  function exportIncomeStatement() {
    if (!$store.incomeStatement) return;

    const data = [
      ['Estado de Resultados'],
      [new Date().toLocaleDateString('es-CU')],
      [],
      ['Concepto', 'Monto'],
      ['Ingresos', $store.incomeStatement.income],
      ['Gastos', -$store.incomeStatement.expenses],
      [],
      ['Utilidad Neta', $store.incomeStatement.netProfit],
    ];

    const ws = utils.aoa_to_sheet(data);
    ws['!cols'] = [{ wch: 25 }, { wch: 15 }];

    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, 'Estado Resultados');
    writeFile(wb, `estado-resultados-${new Date().toISOString().split('T')[0]}.xlsx`);
  }

  function exportJournal() {
    if ($store.journal.length === 0) return;

    const data = [
      ['Libro Diario'],
      [new Date().toLocaleDateString('es-CU')],
      [],
      ['Fecha', 'Descripción', 'Cuenta Débito', 'Cuenta Crédito', 'Monto'],
      ...$store.journal.map(entry => [
        formatDate(entry.date),
        entry.description,
        entry.debitAccount,
        entry.creditAccount,
        entry.amount,
      ]),
    ];

    const ws = utils.aoa_to_sheet(data);
    ws['!cols'] = [
      { wch: 12 },
      { wch: 30 },
      { wch: 20 },
      { wch: 20 },
      { wch: 15 },
    ];

    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, 'Diario');
    writeFile(wb, `libro-diario-${new Date().toISOString().split('T')[0]}.xlsx`);
  }
</script>

<div class="reports-container">
  <div in:fade={{ duration: 400 }}>
    <h2 class="title">Reportes Contables</h2>
    <p class="subtitle">Generación de balances, estados de resultados y libros auxiliares.</p>

    <div class="tabs">
      {#each reportEntries as [key, label]}
        <button
                class="tab"
                class:active={$store.activeReport === key}
                on:click={() => store.switchReport(key)}
        >
          {label}
        </button>
      {/each}
    </div>

    {#if $store.loading}
      <div class="loading" in:fade>
        <div class="spinner"></div>
        <p>Cargando reporte...</p>
      </div>
    {:else if $store.error}
      <div class="error" in:fade>
        <p>⚠️ {$store.error}</p>
      </div>
    {:else}
      <div class="report-content" in:fly={{ y: 20, duration: 400 }}>
        {#if $store.activeReport === 'trial-balance' && $store.trialBalance}
          <div class="trial-balance">
            <div class="report-header">
              <div class="header-top">
                <div>
                  <h3>Balance de Comprobación</h3>
                  <p class="as-of">Al {formatDate($store.trialBalance.asOf)}</p>
                </div>
                <Button variant="secondary" size="sm" on:click={exportTrialBalance}>
                  📥 Exportar Excel
                </Button>
              </div>
            </div>
            <div class="table-wrap">
              <table>
                <thead>
                <tr>
                  <th>Código</th>
                  <th>Cuenta</th>
                  <th class="numeric">Débito</th>
                  <th class="numeric">Crédito</th>
                  <th class="numeric">Saldo</th>
                </tr>
                </thead>
                <tbody>
                {#each $store.trialBalance.accounts as account}
                  <tr>
                    <td>{account.accountCode}</td>
                    <td>{account.accountName}</td>
                    <td class="numeric">{formatMoney(account.debit)}</td>
                    <td class="numeric">{formatMoney(account.credit)}</td>
                    <td class="numeric">{formatMoney(account.balance)}</td>
                  </tr>
                {/each}
                </tbody>
                <tfoot>
                <tr>
                  <td colspan="2"><strong>Totales</strong></td>
                  <td class="numeric"><strong>{formatMoney($store.trialBalance.totalDebits)}</strong></td>
                  <td class="numeric"><strong>{formatMoney($store.trialBalance.totalCredits)}</strong></td>
                  <td></td>
                </tr>
                </tfoot>
              </table>
            </div>
          </div>

        {:else if $store.activeReport === 'income-statement' && $store.incomeStatement}
          <div class="income-statement">
            <div class="report-header">
              <div class="header-top">
                <h3>Estado de Resultados</h3>
                <Button variant="secondary" size="sm" on:click={exportIncomeStatement}>
                  📥 Exportar Excel
                </Button>
              </div>
            </div>
            <div class="statement-lines">
              <div class="line">
                <span>Ingresos</span>
                <span class="value">{formatMoney($store.incomeStatement.income)}</span>
              </div>
              <div class="line">
                <span>Gastos</span>
                <span class="value">({formatMoney($store.incomeStatement.expenses)})</span>
              </div>
              <div class="line total">
                <span>Utilidad Neta</span>
                <span class="value">{formatMoney($store.incomeStatement.netProfit)}</span>
              </div>
            </div>
          </div>

        {:else if $store.activeReport === 'journal' && $store.journal.length > 0}
          <div class="journal">
            <div class="report-header">
              <div class="header-top">
                <div>
                  <h3>Libro Diario</h3>
                  <p class="count">{$store.journal.length} asientos</p>
                </div>
                <Button variant="secondary" size="sm" on:click={exportJournal}>
                  📥 Exportar Excel
                </Button>
              </div>
            </div>
            <div class="table-wrap">
              <table>
                <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Descripción</th>
                  <th>Cuenta Débito</th>
                  <th>Cuenta Crédito</th>
                  <th class="numeric">Monto</th>
                </tr>
                </thead>
                <tbody>
                {#each $store.journal as entry}
                  <tr>
                    <td>{formatDate(entry.date)}</td>
                    <td>{entry.description}</td>
                    <td>{entry.debitAccount}</td>
                    <td>{entry.creditAccount}</td>
                    <td class="numeric">{formatMoney(entry.amount)}</td>
                  </tr>
                {/each}
                </tbody>
              </table>
            </div>
          </div>
        {/if}
      </div>
    {/if}
  </div>
</div>

<style>
  .reports-container {
    max-width: 1400px;
    margin: 0 auto;
  }

  .title {
    margin: 0;
    margin-bottom: 8px;
    font-size: 1.25rem;
    font-weight: 600;
  }

  .subtitle {
    color: var(--color-text-muted);
    margin: 4px 0 0;
    font-size: 0.8rem;
    margin-bottom: 24px;
  }

  .tabs {
    display: flex;
    gap: 8px;
    margin-bottom: 24px;
    border-bottom: 1px solid var(--color-border);
  }

  .tab {
    padding: 12px 20px;
    background: none;
    border: none;
    border-bottom: 3px solid transparent;
    cursor: pointer;
    font-weight: 600;
    font-size: 0.85rem;
    color: var(--color-text-secondary);
    transition: all var(--motion-fast);
    margin-bottom: -1px;
    font-family: inherit;
  }

  .tab:hover {
    color: var(--accent-cyan);
  }

  .tab.active {
    color: var(--accent-cyan);
    border-bottom-color: var(--accent-cyan);
  }

  .loading, .error {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 64px 24px;
    text-align: center;
    color: var(--color-text-secondary);
  }

  .error {
    color: var(--accent-red);
  }

  .spinner {
    width: 48px;
    height: 48px;
    border: 4px solid var(--color-border);
    border-top-color: var(--accent-cyan);
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 16px;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .report-content {
    background: var(--color-surface);
    border-radius: var(--radius-md);
    padding: var(--space-6);
    border: 1px solid var(--color-border);
  }

  .report-header {
    margin-bottom: var(--space-5);
  }

  .header-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-4);
    flex-wrap: wrap;
  }

  .report-header h3 {
    margin: 0 0 8px 0;
    font-size: 0.95rem;
    font-weight: 600;
    color: var(--color-text-primary);
  }

  .as-of, .count {
    margin: 0;
    font-size: 0.75rem;
    color: var(--color-text-muted);
  }

  .table-wrap {
    overflow-x: auto;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.84rem;
  }

  thead {
    background: transparent;
  }

  th {
    text-align: left;
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    font-weight: 650;
    color: var(--color-text-muted);
    padding: 0.45rem 0.5rem;
    border-bottom: 1px solid var(--color-border);
  }

  th.numeric {
    text-align: right;
  }

  td {
    padding: 0.5rem;
    border-bottom: 1px solid var(--color-border);
    color: var(--color-text-secondary);
    font-size: 0.84rem;
  }

  td.numeric {
    text-align: right;
    font-variant-numeric: tabular-nums;
  }

  tbody tr:hover {
    background: color-mix(in srgb, var(--accent-cyan) 4%, transparent);
  }

  tfoot {
    background: transparent;
    font-weight: 650;
  }

  tfoot td {
    border-bottom: none;
    color: var(--color-text-primary);
    border-top: 2px solid var(--color-border);
    padding-top: 0.75rem;
  }

  .statement-lines {
    background: var(--color-surface-soft);
    border-radius: var(--radius-md);
    padding: var(--space-6);
    border: 1px solid var(--color-border);
  }

  .line {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--space-4) 0;
    border-bottom: 1px solid var(--color-border);
    color: var(--color-text-secondary);
    font-size: 0.84rem;
  }

  .line:last-child {
    border-bottom: none;
  }

  .line.total {
    margin-top: var(--space-4);
    padding-top: var(--space-4);
    border-top: 2px solid var(--color-border);
    border-bottom: none;
    font-weight: 650;
    font-size: 0.95rem;
    color: var(--color-text-primary);
  }

  .value {
    font-variant-numeric: tabular-nums;
    font-weight: 600;
  }

  @media (max-width: 768px) {
    table {
      font-size: 0.8rem;
    }
    th, td {
      padding: 0.4rem 0.3rem;
    }
  }
</style>
