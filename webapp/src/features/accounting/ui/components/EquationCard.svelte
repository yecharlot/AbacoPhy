<script lang="ts">
  import { Card, Money } from '../../../../infrastructure/ui/shared';
  import type { Equation } from '../../domain/entities/Equation';

  export let equation: Equation;
  export let currency = 'CUP';
</script>

<Card>
  <h3 style="margin-top:0">Ecuación Contable</h3>
  <div class="eq-grid">
    <div class="eq-item">
      <span class="lbl">Activos</span>
      <span class="val assets"><Money amount={equation.assets} {currency} /></span>
    </div>
    <div class="eq-op">=</div>
    <div class="eq-item">
      <span class="lbl">Pasivos</span>
      <span class="val liabilities"><Money amount={equation.liabilities} {currency} /></span>
    </div>
    <div class="eq-op">+</div>
    <div class="eq-item">
      <span class="lbl">Patrimonio</span>
      <span class="val equity"><Money amount={equation.equity} {currency} /></span>
    </div>
  </div>
  <hr class="divider" />
  <div class="summary-row">
    <div class="summ-item">
      <span class="lbl">Ingresos</span>
      <span class="val income"><Money amount={equation.income} {currency} /></span>
    </div>
    <div class="summ-item">
      <span class="lbl">Gastos</span>
      <span class="val expenses"><Money amount={equation.expenses} {currency} /></span>
    </div>
    <div class="summ-item highlight">
      <span class="lbl">Utilidad Neta</span>
      <span class="val profit" class:neg={equation.netProfit < 0}>
        <Money amount={equation.netProfit} {currency} />
      </span>
    </div>
  </div>
</Card>

<style>
  .eq-grid {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    margin: 16px 0;
    text-align: center;
  }
  .eq-item {
    flex: 1;
    display: flex;
    flex-direction: column;
  }
  .eq-op {
    font-size: 1.5rem;
    font-weight: 300;
    color: var(--ap-text-muted);
    padding-bottom: 4px;
  }
  .lbl {
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--ap-text-secondary);
    margin-bottom: 4px;
  }
  .val {
    font-size: 1.1rem;
    font-weight: 700;
  }
  .assets { color: var(--ap-primary); }
  .liabilities { color: var(--ap-danger); }
  .equity { color: var(--ap-warning, #f59e0b); }

  .divider {
    border: 0;
    border-top: 1px solid var(--ap-border);
    margin: 16px 0;
  }

  .summary-row {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 12px;
  }
  .summ-item {
    display: flex;
    flex-direction: column;
  }
  .income { color: var(--ap-ok); }
  .expenses { color: var(--ap-danger); }
  .profit { color: var(--ap-primary); }
  .profit.neg { color: var(--ap-danger); }

  .highlight {
    background: var(--color-surface-soft, var(--ap-bg));
    padding: 8px;
    border-radius: 8px;
    text-align: right;
  }
</style>
