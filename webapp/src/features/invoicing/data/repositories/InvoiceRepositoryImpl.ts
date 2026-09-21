import type { HttpClient, HttpError } from '../../../../infrastructure/data/http';
import type { EmitInvoiceInput, EmitInvoiceResult, Invoice } from '../../domain/entities/Invoice';
import type { InvoiceRepository } from '../../domain/repositories/InvoiceRepository';
import {
  emitInputToDto,
  emitResponseToResult,
  invoiceDtoToEntity,
} from '../mappers/invoiceMapper';
import { InvoiceRemoteSource } from '../sources/InvoiceRemoteSource';

function toUserMessage(err: unknown): string {
  if (err && typeof err === 'object' && 'message' in err) {
    const msg = (err as HttpError).message;
    if (typeof msg === 'string' && msg.trim()) return msg;
  }
  return 'No se pudo completar la operación';
}

export class InvoiceRepositoryImpl implements InvoiceRepository {
  private readonly remote: InvoiceRemoteSource;

  constructor(http: HttpClient) {
    this.remote = new InvoiceRemoteSource(http);
  }

  async list(): Promise<Invoice[]> {
    try {
      const dto = await this.remote.list();
      const raw = dto.invoices ?? dto.facturas ?? [];
      return raw.map(invoiceDtoToEntity);
    } catch (err) {
      throw new Error(toUserMessage(err));
    }
  }

  async emit(input: EmitInvoiceInput): Promise<EmitInvoiceResult> {
    try {
      const dto = await this.remote.emit(emitInputToDto(input));
      return emitResponseToResult(dto);
    } catch (err) {
      throw new Error(toUserMessage(err));
    }
  }

  async downloadPdf(id: string): Promise<Blob> {
    try {
      return await this.remote.downloadPdf(id);
    } catch (err) {
      throw new Error(toUserMessage(err));
    }
  }
}
