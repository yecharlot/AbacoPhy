<script lang="ts">
  import { onMount } from 'svelte';
  import { fade, fly } from 'svelte/transition';
  import type {ReportsStore, ReportType} from '../stores/reportsStore';

  export let store: ReportsStore;

  // Tipar explícitamente el array de entradas
  const reportEntries: [ReportType, string][] = [
    ['trial-balance', 'Balance de Comprobación'],
    ['income-statement', 'Estado de Resultados'],
    ['journal', 'Libro Diario'],
  ];

  onMount(() => {
    store.switchReport('trial-balance');
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-DO', {
      style: 'currency',
      currency: 'DOP',
      minimumFractionDigits: 2,
    }).format(value);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('es-DO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };
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
              <h3>Balance de Comprobación</h3>
              <p class="as-of">Al {formatDate($store.trialBalance.asOf)}</p>
            </div>
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
                  <td class="numeric">{formatCurrency(account.debit)}</td>
                  <td class="numeric">{formatCurrency(account.credit)}</td>
                  <td class="numeric">{formatCurrency(account.balance)}</td>
                </tr>
              {/each}
              </tbody>
              <tfoot>
              <tr>
                <td colspan="2"><strong>Totales</strong></td>
                <td class="numeric"><strong>{formatCurrency($store.trialBalance.totalDebits)}</strong></td>
                <td class="numeric"><strong>{formatCurrency($store.trialBalance.totalCredits)}</strong></td>
                <td></td>
              </tr>
              </tfoot>
            </table>
          </div>

        {:else if $store.activeReport === 'income-statement' && $store.incomeStatement}
          <div class="income-statement">
            <div class="report-header">
              <h3>Estado de Resultados</h3>
            </div>
            <div class="statement-lines">
              <div class="line">
                <span>Ingresos</span>
                <span class="value">{formatCurrency($store.incomeStatement.income)}</span>
              </div>
              <div class="line">
                <span>Gastos</span>
                <span class="value">({formatCurrency($store.incomeStatement.expenses)})</span>
              </div>
              <div class="line total">
                <span>Utilidad Neta</span>
                <span class="value">{formatCurrency($store.incomeStatement.netProfit)}</span>
              </div>
            </div>
          </div>

        {:else if $store.activeReport === 'journal' && $store.journal.length > 0}
          <div class="journal">
            <div class="report-header">
              <h3>Libro Diario</h3>
              <p class="count">{$store.journal.length} asientos</p>
            </div>
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
                  <td class="numeric">{formatCurrency(entry.amount)}</td>
                </tr>
              {/each}
              </tbody>
            </table>
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
    margin-top: 0;
    margin-bottom: 8px;
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--ap-text-primary, #111827);
  }

  .subtitle {
    color: var(--ap-text-secondary, #6b7280);
    margin-bottom: 24px;
  }

  .tabs {
    display: flex;
    gap: 8px;
    margin-bottom: 24px;
    border-bottom: 2px solid var(--ap-border, #e5e7eb);
  }

  .tab {
    padding: 12px 20px;
    background: none;
    border: none;
    border-bottom: 3px solid transparent;
    cursor: pointer;
    font-weight: 600;
    color: var(--ap-text-secondary, #6b7280);
    transition: all 0.2s;
    margin-bottom: -2px;
  }

  .tab:hover {
    color: var(--ap-primary, #3b82f6);
  }

  .tab.active {
    color: var(--ap-primary, #3b82f6);
    border-bottom-color: var(--ap-primary, #3b82f6);
  }

  .loading, .error {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 64px 24px;
    text-align: center;
    color: var(--ap-text-secondary, #6b7280);
  }

  .error {
    color: var(--ap-danger, #ef4444);
  }

  .spinner {
    width: 48px;
    height: 48px;
    border: 4px solid var(--ap-border, #e5e7eb);
    border-top-color: var(--ap-primary, #3b82f6);
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 16px;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .report-content {
    background: var(--ap-surface-soft, #f9fafb);
    border-radius: 12px;
    padding: 24px;
  }

  .report-header {
    margin-bottom: 20px;
  }

  .report-header h3 {
    margin: 0 0 8px 0;
    font-size: 1.25rem;
    color: var(--ap-text-primary, #111827);
  }

  .as-of, .count {
    margin: 0;
    font-size: 0.9rem;
    color: var(--ap-text-secondary, #6b7280);
  }

  table {
    width: 100%;
    border-collapse: collapse;
    background: white;
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }

  thead {
    background: var(--ap-primary, #3b82f6);
    color: white;
  }

  th {
    padding: 12px;
    text-align: left;
    font-weight: 600;
    font-size: 0.9rem;
  }

  th.numeric {
    text-align: right;
  }

  td {
    padding: 12px;
    border-bottom: 1px solid var(--ap-border, #e5e7eb);
    font-size: 0.9rem;
  }

  td.numeric {
    text-align: right;
    font-variant-numeric: tabular-nums;
  }

  tbody tr:hover {
    background: var(--ap-surface-soft, #f9fafb);
  }

  tfoot {
    background: var(--ap-surface-soft, #f9fafb);
    font-weight: 700;
  }

  tfoot td {
    border-bottom: none;
  }

  .statement-lines {
    background: white;
    border-radius: 8px;
    padding: 24px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }

  .line {
    display: flex;
    justify-content: space-between;
    padding: 16px 0;
    border-bottom: 1px solid var(--ap-border, #e5e7eb);
  }

  .line:last-child {
    border-bottom: none;
  }

  .line.total {
    margin-top: 16px;
    padding-top: 16px;
    border-top: 2px solid var(--ap-text-primary, #111827);
    font-weight: 700;
    font-size: 1.1rem;
  }

  .value {
    font-variant-numeric: tabular-nums;
    font-weight: 600;
  }

  @media (max-width: 768px) {
    table {
      font-size: 0.85rem;
    }
    th, td {
      padding: 8px;
    }
  }
</style>
