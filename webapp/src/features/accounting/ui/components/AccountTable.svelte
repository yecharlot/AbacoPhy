<script lang="ts">
  import { Card, Money } from '../../../../infrastructure/ui/shared';
  import type { Account } from '../../domain/entities/Account';

  export let accounts: Account[] = [];
</script>

<Card>
  <h3 style="margin-top:0">Plan de cuentas</h3>
  {#if accounts.length === 0}
    <p class="muted">Sin cuentas</p>
  {:else}
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Código</th>
            <th>Nombre</th>
            <th>Tipo</th>
            <th class="num">Saldo</th>
          </tr>
        </thead>
        <tbody>
          {#each accounts as a (a.id)}
            <tr>
              <td>{a.code}</td>
              <td>{a.name}</td>
              <td>{a.type}</td>
              <td class="num"><Money amount={a.balance} /></td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</Card>

<style>
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
    padding: 0.45rem 0.35rem;
    border-bottom: 1px solid var(--ap-border);
  }
  th {
    font-size: 0.65rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--ap-text-muted);
  }
  .num {
    text-align: right;
  }
</style>
