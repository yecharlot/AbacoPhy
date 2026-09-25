/**
 * Genera un data-URL PNG de un QR con el payload de la factura.
 * Preferencia: API pública (sin dependencia npm). Si falla, devuelve null
 * y la plantilla muestra el texto del payload.
 */
export async function qrDataUrlFromText(text: string, size = 160): Promise<string | null> {
  const encoded = encodeURIComponent(text);
  // quickchart.io — PNG QR
  const url = `https://quickchart.io/qr?text=${encoded}&size=${size}&margin=1&dark=0f172a&light=ffffff`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    return await blobToDataUrl(blob);
  } catch {
    return null;
  }
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}

export type InvoiceQrPayload = {
  app: 'AbacoPhy';
  number: string;
  total: number;
  currency: string;
  client: string;
  issuer: string;
  operator?: string;
  unit?: string;
  date?: string;
  cid?: string;
};

export function buildInvoiceQrPayload(p: InvoiceQrPayload): string {
  // JSON compacto legible por apps de escaneo
  return JSON.stringify(p);
}
