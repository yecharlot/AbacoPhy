import type { Invoice } from '../../domain/entities/Invoice';
import { buildInvoiceQrPayload, qrDataUrlFromText } from './qrDataUrl';

export type InvoiceIssuer = {
  name: string;
  tradeName?: string;
  taxId?: string;
  address?: string;
  phone?: string;
  logoUrl?: string;
};

function esc(s: string): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function money(n: number, currency: string): string {
  const v = Number.isFinite(n) ? n : 0;
  return `${currency} ${v.toFixed(2)}`;
}

export async function buildInvoicePdfHtml(
  inv: Invoice,
  issuer: InvoiceIssuer,
): Promise<string> {
  const issuerName = inv.issuerName || issuer.name || 'ÁbacoPhy';
  const issuerTax = inv.issuerTaxId || issuer.taxId || '';
  const issuerAddr = inv.issuerAddress || issuer.address || '';
  const issuerPhone = inv.issuerPhone || issuer.phone || '';
  const logo = issuer.logoUrl || '/abacus_color_icon.svg';

  const qrPayload = buildInvoiceQrPayload({
    app: 'AbacoPhy',
    number: inv.number,
    total: inv.total,
    currency: inv.currency || 'CUP',
    client: inv.clientName,
    issuer: issuerName,
    operator: inv.operatorName || undefined,
    unit: inv.unitName || undefined,
    date: inv.issuedAt || undefined,
    cid: inv.cid || undefined,
  });
  const qrImg = await qrDataUrlFromText(qrPayload, 140);

  const rows = (inv.lines || [])
    .map(
      (l) => `
      <tr>
        <td>${esc(l.description)}</td>
        <td class="num">${l.qty}</td>
        <td class="num">${money(l.unitPrice, inv.currency)}</td>
        <td class="num">${money(l.amount || l.qty * l.unitPrice, inv.currency)}</td>
      </tr>`,
    )
    .join('');

  const qrBlock = qrImg
    ? `<img class="qr" src="${qrImg}" alt="QR factura" />`
    : `<pre class="qr-fallback">${esc(qrPayload)}</pre>`;

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>Factura ${esc(inv.number)}</title>
  <style>
    @page { size: A4; margin: 14mm; }
    * { box-sizing: border-box; }
    body {
      font-family: "Segoe UI", system-ui, -apple-system, sans-serif;
      color: #0f172a; margin: 0; padding: 20px; font-size: 12px; line-height: 1.45; background: #fff;
    }
    .top {
      display: flex; justify-content: space-between; gap: 24px;
      border-bottom: 3px solid #0d9488; padding-bottom: 16px; margin-bottom: 16px;
    }
    .brand { display: flex; gap: 12px; align-items: center; }
    .brand img { width: 52px; height: 52px; object-fit: contain; }
    .brand h1 { margin: 0; font-size: 20px; }
    .brand p { margin: 2px 0 0; color: #64748b; font-size: 11px; }
    .doc-meta { text-align: right; }
    .doc-meta .label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; color: #64748b; }
    .doc-meta .num { font-size: 22px; font-weight: 700; color: #0d9488; }
    .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }
    .box {
      background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px 14px;
    }
    .box h3 {
      margin: 0 0 8px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: #64748b;
    }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    th {
      text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.04em;
      color: #64748b; border-bottom: 2px solid #cbd5e1; padding: 8px 6px;
    }
    td { padding: 8px 6px; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
    .num { text-align: right; font-variant-numeric: tabular-nums; }
    .bottom {
      display: flex; justify-content: space-between; align-items: flex-end; gap: 24px; margin-top: 20px;
    }
    .totals { width: 260px; }
    .totals div { display: flex; justify-content: space-between; padding: 4px 0; }
    .totals .grand {
      margin-top: 6px; padding-top: 8px; border-top: 2px solid #0d9488; font-size: 15px; font-weight: 700;
    }
    .qr-wrap { text-align: center; }
    .qr { width: 120px; height: 120px; }
    .qr-fallback {
      max-width: 180px; font-size: 8px; white-space: pre-wrap; word-break: break-all;
      background: #f1f5f9; padding: 8px; border-radius: 8px;
    }
    .qr-cap { font-size: 9px; color: #64748b; margin-top: 4px; }
    .foot {
      margin-top: 28px; padding-top: 12px; border-top: 1px solid #e2e8f0;
      color: #94a3b8; font-size: 10px; display: flex; justify-content: space-between;
    }
    .toolbar {
      position: sticky; top: 0; z-index: 10; display: flex; gap: 8px; justify-content: flex-end;
      padding: 8px 0 12px; background: #fff;
    }
    .toolbar button {
      font-family: inherit; font-size: 13px; font-weight: 600; padding: 8px 14px;
      border-radius: 8px; cursor: pointer; border: 1px solid #cbd5e1; background: #0d9488; color: #fff;
    }
    .toolbar button.secondary { background: #fff; color: #0f172a; }
    @media print { .toolbar { display: none !important; } body { padding: 0; } }
  </style>
</head>
<body>
  <div class="toolbar">
    <button type="button" onclick="window.print()">Imprimir / Guardar PDF</button>
    <button type="button" class="secondary" onclick="window.close()">Cerrar</button>
  </div>

  <div class="top">
    <div class="brand">
      <img src="${esc(logo)}" alt="Logo" onerror="this.style.display='none'" />
      <div>
        <h1>${esc(issuerName)}</h1>
        <p>${esc(issuer.tradeName || 'Contabilidad para PyME · ÁbacoPhy')}</p>
        ${issuerTax ? `<p>NIT/RUC: ${esc(issuerTax)}</p>` : ''}
        ${issuerAddr ? `<p>${esc(issuerAddr)}</p>` : ''}
        ${issuerPhone ? `<p>Tel: ${esc(issuerPhone)}</p>` : ''}
      </div>
    </div>
    <div class="doc-meta">
      <div class="label">Factura</div>
      <div class="num">${esc(inv.number || '—')}</div>
      <div>Estado: ${esc(inv.status || '—')}</div>
      <div>Fecha: ${esc(inv.issuedAt || new Date().toISOString().slice(0, 10))}</div>
      ${inv.unitName ? `<div>Punto: ${esc(inv.unitName)}</div>` : ''}
    </div>
  </div>

  <div class="grid2">
    <div class="box">
      <h3>Cliente</h3>
      <div><strong>${esc(inv.clientName)}</strong></div>
      ${inv.clientTax ? `<div>Doc. fiscal: ${esc(inv.clientTax)}</div>` : ''}
    </div>
    <div class="box">
      <h3>Emisión</h3>
      <div>Negocio: <strong>${esc(issuerName)}</strong></div>
      ${inv.operatorName ? `<div>Operador: <strong>${esc(inv.operatorName)}</strong></div>` : ''}
      ${inv.unitName ? `<div>Unidad: ${esc(inv.unitName)}</div>` : ''}
      <div>Moneda: ${esc(inv.currency || 'CUP')}</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Descripción / concepto</th>
        <th class="num">Cant.</th>
        <th class="num">Precio unit.</th>
        <th class="num">Importe</th>
      </tr>
    </thead>
    <tbody>${rows || '<tr><td colspan="4">Sin líneas</td></tr>'}</tbody>
  </table>

  <div class="bottom">
    <div class="qr-wrap">
      ${qrBlock}
      <div class="qr-cap">Escanee para verificar datos de la factura</div>
    </div>
    <div class="totals">
      <div><span>Subtotal</span><span>${money(inv.subtotal, inv.currency || 'CUP')}</span></div>
      <div><span>Impuesto</span><span>${money(inv.tax, inv.currency || 'CUP')}</span></div>
      <div class="grand"><span>Total</span><span>${money(inv.total, inv.currency || 'CUP')}</span></div>
    </div>
  </div>

  <div class="foot">
    <span>Documento generado por ÁbacoPhy</span>
    <span>${esc(inv.number || '')}${inv.cid ? ' · ' + esc(inv.cid.slice(0, 12)) : ''}</span>
  </div>
</body>
</html>`;
}

export async function openInvoicePrintWindow(
  inv: Invoice,
  issuer: InvoiceIssuer,
): Promise<void> {
  const html = await buildInvoicePdfHtml(inv, issuer);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const w = window.open(url, '_blank', 'noopener,noreferrer,width=920,height=1000');
  if (!w) {
    const a = document.createElement('a');
    a.href = url;
    a.download = `factura-${inv.number || inv.id || 'doc'}.html`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
    throw new Error(
      'Ventana bloqueada. Se descargó el HTML de la factura: ábralo e imprima como PDF.',
    );
  }
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
