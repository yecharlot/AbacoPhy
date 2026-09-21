<script lang="ts">
  import { Money } from '../../../../infrastructure/ui/shared';
  import type { Account } from '../../domain/entities/Account';

  export let accounts: Account[] = [];

  function getTypeName(type: string): string {
    const map: Record<string, string> = {
      asset: 'Activo',
      liability: 'Pasivo',
      equity: 'Patrimonio',
      income: 'Ingreso',
      expense: 'Egreso'
    };
    return map[type] || type;
  }
</script>

<div class="table-container">
  <table class="data-table">
    <thead>
      <tr>
        <th>Código</th>
        <th>Nombre</th>
        <th>Tipo</th>
        <th style="text-align:right">Saldo</th>
      </tr>
    </thead>
    <tbody>
      {#if accounts.length === 0}
        <tr>
          <td colspan="4" style="text-align:center; color:var(--ap-text-muted); padding:20px;">
            No hay cuentas registradas
          </td>
        </tr>
      {:else}
        {#each accounts as acc}
          <tr>
            <td><code>{acc.code}</code></td>
            <td>{acc.name}</td>
            <td><span class="badge type-{acc.type}">{getTypeName(acc.type)}</span></td>
            <td style="text-align:right" class:neg={acc.balance < 0}>
              <Money amount={acc.balance} currency={acc.currency} />
            </td>
          </tr>
        {/each}
      {/if}
    </tbody>
  </table>
</div>

<style>
  .table-container { overflow-x: auto; }
  .data-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.9rem;
  }
  .data-table th {
    text-align: left;
    padding: 12px;
    border-bottom: 2px solid var(--ap-border);
    color: var(--ap-text-secondary);
  }
  .data-table td {
    padding: 12px;
    border-bottom: 1px solid var(--ap-border);
  }
  .neg { color: var(--ap-danger); }
  .badge {
    font-size: 0.75rem;
    padding: 2px 8px;
    border-radius: 4px;
    font-weight: 600;
  }
  .type-asset { background: rgba(97, 230, 225, 0.1); color: #0d9488; }
  .type-liability { background: rgba(239, 68, 68, 0.1); color: #dc2626; }
  .type-equity { background: rgba(245, 158, 11, 0.1); color: #d97706; }
</style>
