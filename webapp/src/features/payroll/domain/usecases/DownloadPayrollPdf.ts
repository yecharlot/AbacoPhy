import type { PayrollRepository } from '../repositories/PayrollRepository';

/** Placeholder: el backend aún no expone PDF de nómina de forma uniforme. */
export class DownloadPayrollPdf {
  constructor(_repo: PayrollRepository) {}

  execute(_period: string): Promise<Blob> {
    return Promise.reject(new Error('PDF de nómina no disponible en esta versión'));
  }
}
