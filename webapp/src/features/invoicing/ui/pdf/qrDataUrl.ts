/**
 * Genera un data-URL PNG de un QR.
 * Varias fuentes públicas (sin npm). Si todas fallan → null (plantilla usa fallback).
 */

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}

/** URL remota usable como <img src> si no hay data-URL. */
export function qrRemoteUrl(text: string, size = 160): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=8&data=${encodeURIComponent(text)}`;
}

export async function qrDataUrlFromText(text: string, size = 160): Promise<string | null> {
  const encoded = encodeURIComponent(text);
  const candidates = [
    `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=8&data=${encoded}`,
    `https://quickchart.io/qr?text=${encoded}&size=${size}&margin=2&dark=0f172a&light=ffffff`,
  ];

  for (const url of candidates) {
    try {
      const res = await fetch(url, { mode: 'cors', credentials: 'omit' });
      if (!res.ok) continue;
      const blob = await res.blob();
      if (!blob || blob.size < 32) continue;
      // Algunos proxies devuelven HTML de error
      if (blob.type && !blob.type.startsWith('image') && !blob.type.includes('octet')) {
        continue;
      }
      return await blobToDataUrl(blob);
    } catch {
      /* siguiente fuente */
    }
  }
  return null;
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
  return JSON.stringify(p);
}
