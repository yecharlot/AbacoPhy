import type { HttpClient, HttpError } from '../../../../infrastructure/data/http';
import type { EmitInvoiceInput, Invoice } from '../../domain/entities/Invoice';
import type { InvoicingRepository } from '../../domain/repositories/InvoicingRepository';
import { InvoicingRemoteSource } from '../sources/InvoicingRemoteSource';
import { invoicingMapper } from '../mappers/invoicingMapper';

function toUserMessage(err: unknown): string {
  if (err && typeof err === 'object' && 'message' in err) {
    const msg = (err as HttpError).message;
    if (typeof msg === 'string' && msg.trim()) return msg;
  }
  return 'Error en la facturación';
}

export class InvoicingRepositoryImpl implements InvoicingRepository {
  private readonly remote: InvoicingRemoteSource;

  constructor(http: HttpClient) {
    this.remote = new InvoicingRemoteSource(http);
  }

  async getInvoices(): Promise<Invoice[]> {
    try {
      const res = await this.remote.getInvoices();
      return (res.invoices || []).map((row) =>
        invoicingMapper.toEntity(row as Parameters<typeof invoicingMapper.toEntity>[0]),
      );
    } catch (err) {
      throw new Error(toUserMessage(err));
    }
  }

  async emitInvoice(input: EmitInvoiceInput): Promise<Invoice> {
    try {
      const dto = await this.remote.emitInvoice(invoicingMapper.toEmitDto(input));
      return invoicingMapper.toEntity(dto as Parameters<typeof invoicingMapper.toEntity>[0]);
    } catch (err) {
      throw new Error(toUserMessage(err));
    }
  }

  async getInvoicePdf(id: string): Promise<Blob> {
    try {
      return await this.remote.getPdf(id);
    } catch (err) {
      throw new Error(toUserMessage(err));
    }
  }
}
