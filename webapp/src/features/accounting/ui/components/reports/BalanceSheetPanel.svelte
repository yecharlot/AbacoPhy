<script lang="ts">
  import { Money } from '../../../../../infrastructure/ui/shared';
  import type { BalanceSheet } from '../../../domain/entities/BalanceSheet';

  export let sheet: BalanceSheet;
</script>

<div class="bs">
  <div class="cols">
    <section class="col">
      <h3>Activo</h3>
      <table>
        <tbody>
          {#each sheet.assets as row (row.id)}
            <tr>
              <td class="code">{row.code}</td>
              <td>{row.name}</td>
              <td class="num"><Money amount={row.balance} /></td>
            </tr>
          {/each}
        </tbody>
        <tfoot>
          <tr>
            <td colspan="2">Total activo</td>
            <td class="num"><Money amount={sheet.totalAssets} /></td>
          </tr>
        </tfoot>
      </table>
    </section>
    <section class="col">
      <h3>Pasivo</h3>
      <table>
        <tbody>
          {#each sheet.liabilities as row (row.id)}
            <tr>
              <td class="code">{row.code}</td>
              <td>{row.name}</td>
              <td class="num"><Money amount={row.balance} /></td>
            </tr>
          {/each}
        </tbody>
        <tfoot>
          <tr>
            <td colspan="2">Total pasivo</td>
            <td class="num"><Money amount={sheet.totalLiabilities} /></td>
          </tr>
        </tfoot>
      </table>
      <h3 class="mt">Patrimonio</h3>
      <table>
        <tbody>
          {#each sheet.equity as row (row.id)}
            <tr>
              <td class="code">{row.code}</td>
              <td>{row.name}</td>
              <td class="num"><Money amount={row.balance} /></td>
            </tr>
          {/each}
          <tr>
            <td class="code">—</td>
            <td>Resultado del ejercicio</td>
            <td class="num"><Money amount={sheet.netIncome} /></td>
          </tr>
        </tbody>
        <tfoot>
          <tr>
            <td colspan="2">Total patrimonio + resultado</td>
            <td class="num"
              ><Money amount={sheet.totalEquity + sheet.netIncome} /></td
            >
          </tr>
          <tr class="strong">
            <td colspan="2">Pasivo + Patrimonio + Neto</td>
            <td class="num"
              ><Money
                amount={sheet.totalLiabilities + sheet.totalEquity + sheet.netIncome}
              /></td
            >
          </tr>
        </tfoot>
      </table>
    </section>
  </div>
</div>

<style>
  .bs {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }
  .cols {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
  }
  @media (max-width: 900px) {
    .cols {
      grid-template-columns: 1fr;
    }
  }
  h3 {
    margin: 0 0 0.4rem;
    font-size: 0.85rem;
    font-weight: 700;
    color: var(--ap-text, inherit);
  }
  h3.mt {
    margin-top: 1rem;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.8rem;
  }
  td {
    padding: 0.35rem 0.4rem;
    border-bottom: 1px solid var(--ap-border, #2a3142);
    color: var(--ap-text-secondary, #a0a8b8);
  }
  td.code {
    width: 4.5rem;
    font-variant-numeric: tabular-nums;
    color: var(--ap-text-muted, #7a8499);
  }
  td.num {
    text-align: right;
    font-variant-numeric: tabular-nums;
  }
  tfoot td {
    font-weight: 700;
    color: var(--ap-text, inherit);
    border-bottom: none;
    padding-top: 0.5rem;
  }
  tr.strong td {
    border-top: 1px solid var(--ap-border, #2a3142);
  }
</style>
