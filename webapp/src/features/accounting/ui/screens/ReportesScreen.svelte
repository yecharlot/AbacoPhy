<script lang="ts">
  import { Card } from '../../../../infrastructure/ui/shared';
</script>

<Card>
  <h2 style="margin-top:0">Reportes Contables</h2>
  <p style="color:var(--ap-text-secondary)">
    Generación de balances, estados de resultados y libros auxiliares.
  </p>

  <div class="reports-grid">
    <div class="report-card">
      <h4>Balance de Comprobación</h4>
      <p>Resumen de saldos de todas las cuentas.</p>
    </div>
    <div class="report-card">
      <h4>Estado de Resultados</h4>
      <p>Pérdidas y ganancias en un periodo.</p>
    </div>
    <div class="report-card">
      <h4>Libro Diario</h4>
      <p>Cronológico de todos los asientos.</p>
    </div>
  </div>
</Card>

<style>
  .reports-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 16px;
    margin-top: 20px;
  }
  .report-card {
    padding: 16px;
    border: 1px solid var(--ap-border);
    border-radius: 12px;
    cursor: pointer;
    transition: background 0.2s;
  }
  .report-card:hover {
    background: var(--color-surface-soft, var(--ap-bg));
  }
  .report-card h4 { margin: 0 0 8px 0; color: var(--ap-primary); }
  .report-card p { margin: 0; font-size: 0.85rem; color: var(--ap-text-secondary); }
</style>
