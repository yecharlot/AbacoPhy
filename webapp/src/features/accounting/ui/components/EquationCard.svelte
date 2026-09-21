<script lang="ts">
  import { Card, Money } from '../../../../infrastructure/ui/shared';
  import type { Equation } from '../../domain/entities/Equation';

  export let equation: Equation;
  export let title = 'Ecuación ampliada';
</script>

<Card>
  <h3 style="margin-top:0">{title}</h3>
  <p class="formula">Activo = Pasivo + Patrimonio + (Ingresos − Gastos)</p>
  <div class="grid">
    <div><span class="lbl">Activo</span><Money amount={equation.activo} /></div>
    <div><span class="lbl">Pasivo</span><Money amount={equation.pasivo} /></div>
    <div><span class="lbl">Patrimonio</span><Money amount={equation.patrimonio} /></div>
    <div><span class="lbl">Ingresos</span><Money amount={equation.ingresos} /></div>
    <div><span class="lbl">Gastos</span><Money amount={equation.gastos} /></div>
    <div><span class="lbl">Neto</span><Money amount={equation.neto} /></div>
  </div>
  <p class="check">
    Pasivo+Pat+Neto: <Money amount={equation.pasivoPatrimonioNeto} />
  </p>
</Card>

<style>
  .formula {
    font-size: 0.8rem;
    color: var(--ap-text-muted);
    margin: 0 0 0.75rem;
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
    gap: 0.75rem;
  }
  .lbl {
    display: block;
    font-size: 0.65rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--ap-text-muted);
    margin-bottom: 2px;
  }
  .check {
    margin: 0.75rem 0 0;
    font-size: 0.8rem;
    color: var(--ap-text-secondary);
  }
</style>
