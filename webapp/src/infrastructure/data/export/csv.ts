/**
 * Exportación CSV en cliente (sin backend).
 * Escapa comillas y separa con `;` (útil con Excel en locales ES).
 */

export function escapeCsvCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  const s = String(value);
  if (/[;"\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function rowsToCsv(
  headers: string[],
  rows: Array<Array<unknown>>,
  separator = ';',
): string {
  const lines = [
    headers.map(escapeCsvCell).join(separator),
    ...rows.map((r) => r.map(escapeCsvCell).join(separator)),
  ];
  return lines.join('\r\n');
}

/** Descarga un Blob como archivo en el navegador. */
export function downloadTextFile(filename: string, content: string, mime = 'text/csv;charset=utf-8'): void {
  const bom = mime.includes('csv') ? '\uFEFF' : '';
  const blob = new Blob([bom + content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function downloadCsv(filename: string, headers: string[], rows: Array<Array<unknown>>): void {
  downloadTextFile(filename.endsWith('.csv') ? filename : `${filename}.csv`, rowsToCsv(headers, rows));
}
