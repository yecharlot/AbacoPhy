import type { Transfer } from '../../domain/entities/Transfer';

export type TransferReportKind = 'general' | 'period' | 'unit' | 'unit_period';

export type TransferReportOptions = {
  kind: TransferReportKind;
  businessName?: string;
  currency?: string;
  periodFrom?: string;
  periodTo?: string;
  unitId?: string;
  unitLabel?: string;
  unitNameLookup?: (id: string) => string;
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

export function reportTitle(kind: TransferReportKind): string {
  switch (kind) {
    case 'period':
      return 'Informe de transferencias por período';
    case 'unit':
      return 'Informe general por punto de venta';
    case 'unit_period':
      return 'Informe por punto de venta y período';
    default:
      return 'Informe general de transferencias';
  }
}

export function filterTransfersForReport(
  transfers: Transfer[],
  opts: TransferReportOptions,
): Transfer[] {
  let list = [...transfers];
  if (opts.kind === 'period' || opts.kind === 'unit_period') {
    if (opts.periodFrom) list = list.filter((t) => (t.date || '') >= opts.periodFrom!);
    if (opts.periodTo) list = list.filter((t) => (t.date || '') <= opts.periodTo!);
  }
  if (opts.kind === 'unit' || opts.kind === 'unit_period') {
    if (opts.unitId) list = list.filter((t) => t.unitId === opts.unitId);
  }
  return list;
}

export function buildTransferReportHtml(
  transfers: Transfer[],
  opts: TransferReportOptions,
): string {
  const biz = opts.businessName || 'Negocio';
  const currency = opts.currency || 'CUP';
  const title = reportTitle(opts.kind);
  const period =
    opts.kind === 'period' || opts.kind === 'unit_period'
      ? `${opts.periodFrom || '—'} — ${opts.periodTo || '—'}`
      : 'Todos los registros';
  const unitTxt =
    opts.kind === 'unit' || opts.kind === 'unit_period'
      ? opts.unitLabel || opts.unitId || '—'
      : 'Todos';

  const lookup = opts.unitNameLookup || ((id: string) => id);
  let totalQty = 0;

  const bodyRows = transfers
    .map((t) => {
      const lines = t.lines || [];
      if (!lines.length) {
        return `<tr>
          <td>${esc(t.number || '—')}</td>
          <td>${esc(t.date || '—')}</td>
          <td>${esc(t.unitName || lookup(t.unitId))}</td>
          <td colspan="5" class="muted">Sin líneas</td>
        </tr>`;
      }
      return lines
        .map((l) => {
          totalQty += Number(l.qty) || 0;
          return `<tr>
            <td>${esc(t.number || '—')}</td>
            <td>${esc(t.date || '—')}</td>
            <td>${esc(t.unitName || lookup(t.unitId))}</td>
            <td>${esc(l.productCode || '—')}</td>
            <td>${esc(l.productName || '—')}</td>
            <td class="num">${num(l.qty)}</td>
            <td class="num">${num(l.unitCost)}</td>
            <td class="num">${num(l.amount)}</td>
          </tr>`;
        })
        .join('');
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
    margin: 0 0 12px; padding: 8px 10px; background: #f1f5f9; border-radius: 6px; font-size: 11px;
  }
  .filters span { margin-right: 14px; }
  table { width: 100%; border-collapse: collapse; }
  th {
    text-align: left; font-size: 9px; text-transform: uppercase; letter-spacing: 0.04em;
    color: #64748b; border-bottom: 1px solid #cbd5e1; padding: 6px 4px;
  }
  td { padding: 5px 4px; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
  .num { text-align: right; font-variant-numeric: tabular-nums; }
  .muted { color: #94a3b8; }
  .foot {
    margin-top: 16px; display: flex; justify-content: space-between; gap: 12px;
    font-size: 11px; border-top: 1px solid #cbd5e1; padding-top: 10px;
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
    <span><strong>Punto de venta:</strong> ${esc(unitTxt)}</span>
    <span><strong>Transferencias:</strong> ${transfers.length}</span>
  </div>
  <table>
    <thead>
      <tr>
        <th>Nº</th>
        <th>Fecha</th>
        <th>PDV</th>
        <th>Código</th>
        <th>Producto</th>
        <th class="num">Cant.</th>
        <th class="num">Costo u.</th>
        <th class="num">Importe</th>
      </tr>
    </thead>
    <tbody>
      ${bodyRows || '<tr><td colspan="8" class="muted">Sin transferencias en el criterio seleccionado.</td></tr>'}
    </tbody>
  </table>
  <div class="foot">
    <span>Documento de control de inventario · no es comprobante de venta</span>
    <span><strong>Unidades movidas:</strong> ${num(totalQty)}</span>
  </div>
  <p class="no-print">
    <button type="button" onclick="window.print()">Imprimir / Guardar como PDF</button>
  </p>
</body>
</html>`;
}

/**
 * Misma estrategia que facturas: Blob URL + window.open.
 * Si el popup está bloqueado → descarga HTML (sin depender de document.write).
 */
export function openTransferReportWindow(
  transfers: Transfer[],
  opts: TransferReportOptions,
): void {
  const html = buildTransferReportHtml(transfers, opts);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const w = window.open(url, '_blank', 'noopener,noreferrer,width=920,height=1000');
  if (!w) {
    const a = document.createElement('a');
    a.href = url;
    a.download = `informe-transferencias-${opts.kind}-${Date.now()}.html`;
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
