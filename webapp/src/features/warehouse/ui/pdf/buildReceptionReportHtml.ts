import type { Reception } from '../../domain/entities/Reception';
import {
  getReceptionVisualStatus,
  isReceptionAbandoned,
  receptionStatusLabel,
  type ReceptionVisualStatus,
} from '../../domain/entities/Reception';

export type ReceptionReportKind =
  | 'general'
  | 'confirmed'
  | 'rejected'
  | 'abandoned'
  | 'problems';

export type ReceptionReportOptions = {
  kind: ReceptionReportKind;
  businessName?: string;
  currency?: string;
  periodFrom?: string;
  periodTo?: string;
};

function esc(s: string): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function num(n: number): string {
  const v = Number(n);
  if (!Number.isFinite(v)) return '—';
  return v.toLocaleString('es', { maximumFractionDigits: 4 });
}

export function receptionReportTitle(kind: ReceptionReportKind): string {
  switch (kind) {
    case 'confirmed':
      return 'Informe de recepciones confirmadas';
    case 'rejected':
      return 'Informe de recepciones rechazadas';
    case 'abandoned':
      return 'Informe de recepciones descartadas / abandonadas';
    case 'problems':
      return 'Informe de recepciones con problemas';
    default:
      return 'Informe general del historial de recepciones';
  }
}

export function filterReceptionsForReport(
  receptions: Reception[],
  opts: ReceptionReportOptions,
): Reception[] {
  let list = [...receptions];
  if (opts.periodFrom) list = list.filter((r) => (r.date || '') >= opts.periodFrom!);
  if (opts.periodTo) list = list.filter((r) => (r.date || '') <= opts.periodTo!);

  switch (opts.kind) {
    case 'confirmed':
      return list.filter((r) => getReceptionVisualStatus(r) === 'entry_confirmed');
    case 'problems':
      return list.filter(
        (r) => getReceptionVisualStatus(r) === 'entry_problem' && !isReceptionAbandoned(r),
      );
    case 'abandoned':
      return list.filter((r) => isReceptionAbandoned(r));
    case 'rejected':
      // Rechazo / problema sin abandono definitivo
      return list.filter(
        (r) => getReceptionVisualStatus(r) === 'entry_problem' && !isReceptionAbandoned(r),
      );
    default:
      return list;
  }
}

export function buildReceptionReportHtml(
  receptions: Reception[],
  opts: ReceptionReportOptions,
): string {
  const biz = opts.businessName || 'Negocio';
  const currency = opts.currency || 'CUP';
  const title = receptionReportTitle(opts.kind);
  const period =
    opts.periodFrom || opts.periodTo
      ? `${opts.periodFrom || '—'} — ${opts.periodTo || '—'}`
      : 'Todos los registros';

  let totalDoc = 0;
  const body = receptions
    .map((r) => {
      totalDoc += Number(r.totalCost) || 0;
      const visual = getReceptionVisualStatus(r);
      const lines = (r.lines || [])
        .map(
          (l) =>
            `<tr class="sub">
              <td></td>
              <td colspan="2">${esc(l.productCode || '—')} · ${esc(l.productName || '—')}</td>
              <td class="num">${num(l.qty)}</td>
              <td class="num">${num(l.unitCost)}</td>
              <td class="num">${num(l.amount)}</td>
              <td></td>
            </tr>`,
        )
        .join('');
      return `<tr>
          <td>${esc(r.number || '—')}</td>
          <td>${esc(r.date || '—')}</td>
          <td>${esc(r.supplier || '—')}</td>
          <td class="num">${(r.lines || []).length}</td>
          <td class="num">${num(r.totalCost)}</td>
          <td>${esc(currency)}</td>
          <td>${esc(receptionStatusLabel(visual))}</td>
        </tr>${lines}`;
    })
    .join('');

  const generated = new Date().toLocaleString('es');

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8"/>
<title>${esc(title)}</title>
<style>
  @page { size: A4; margin: 14mm; }
  * { box-sizing: border-box; }
  body {
    font-family: "Segoe UI", system-ui, -apple-system, sans-serif;
    color: #0f172a; margin: 0; padding: 20px; font-size: 11px; line-height: 1.45; background: #fff;
  }
  .top {
    display: flex; justify-content: space-between; gap: 20px;
    border-bottom: 3px solid #0d9488; padding-bottom: 14px; margin-bottom: 14px;
  }
  .brand { display: flex; gap: 12px; align-items: center; }
  .brand img { width: 40px; height: 40px; object-fit: contain; }
  .brand strong { font-size: 16px; display: block; }
  .brand small { color: #64748b; font-size: 11px; }
  .meta { text-align: right; color: #334155; font-size: 11px; }
  .meta h1 { margin: 0 0 4px; font-size: 14px; color: #0f172a; }
  .filters {
    margin: 0 0 12px; padding: 8px 10px; background: #f1f5f9; border-radius: 6px;
  }
  .filters span { margin-right: 14px; }
  table { width: 100%; border-collapse: collapse; }
  th {
    text-align: left; font-size: 9px; text-transform: uppercase; letter-spacing: 0.04em;
    color: #64748b; border-bottom: 1px solid #cbd5e1; padding: 6px 4px;
  }
  td { padding: 5px 4px; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
  tr.sub td { border-bottom: 1px dashed #e2e8f0; color: #475569; font-size: 10px; }
  .num { text-align: right; font-variant-numeric: tabular-nums; }
  .muted { color: #94a3b8; }
  .foot {
    margin-top: 16px; display: flex; justify-content: space-between;
    border-top: 1px solid #cbd5e1; padding-top: 10px; font-size: 11px;
  }
  .no-print { margin-top: 18px; }
  @media print { .no-print { display: none !important; } }
</style>
</head>
<body>
  <div class="top">
    <div class="brand">
      <img src="/abacus_color_icon.svg" alt="" onerror="this.style.display='none'" />
      <div>
        <strong>ÁbacoPhy</strong>
        <small>${esc(biz)}</small>
      </div>
    </div>
    <div class="meta">
      <h1>${esc(title)}</h1>
      <div>Generado: ${esc(generated)}</div>
      <div>Moneda: ${esc(currency)}</div>
    </div>
  </div>
  <div class="filters">
    <span><strong>Período:</strong> ${esc(period)}</span>
    <span><strong>Recepciones:</strong> ${receptions.length}</span>
  </div>
  <table>
    <thead>
      <tr>
        <th>Nº</th>
        <th>Fecha</th>
        <th>Proveedor</th>
        <th class="num">Líneas</th>
        <th class="num">Total</th>
        <th>Moneda</th>
        <th>Estado</th>
      </tr>
    </thead>
    <tbody>
      ${body || '<tr><td colspan="7" class="muted">Sin recepciones en el criterio seleccionado.</td></tr>'}
    </tbody>
  </table>
  <div class="foot">
    <span>Informe documental · la entrada física la confirma Almacén</span>
    <span><strong>Total documental:</strong> ${num(totalDoc)} ${esc(currency)}</span>
  </div>
  <p class="no-print">
    <button type="button" onclick="window.print()">Imprimir / Guardar como PDF</button>
  </p>
</body>
</html>`;
}

/** Misma estrategia que facturas/transferencias: Blob URL. */
export function openReceptionReportWindow(
  receptions: Reception[],
  opts: ReceptionReportOptions,
): void {
  const html = buildReceptionReportHtml(receptions, opts);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const w = window.open(url, '_blank', 'noopener,noreferrer,width=920,height=1000');
  if (!w) {
    const a = document.createElement('a');
    a.href = url;
    a.download = `informe-recepciones-${opts.kind}-${Date.now()}.html`;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
    throw new Error(
      'Ventana bloqueada. Se descargó el HTML del informe: ábralo e imprima como PDF.',
    );
  }
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
