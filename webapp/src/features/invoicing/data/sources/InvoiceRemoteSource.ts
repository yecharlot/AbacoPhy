import type { HttpClient } from '../../../../infrastructure/data/http';
import type {
  EmitInvoiceRequestDto,
  EmitInvoiceResponseDto,
  InvoicesResponseDto,
} from '../dto/InvoiceDto';

export class InvoiceRemoteSource {
  constructor(private readonly http: HttpClient) {}

  list(): Promise<InvoicesResponseDto> {
    return this.http.get<InvoicesResponseDto>('/invoices');
  }

  emit(body: EmitInvoiceRequestDto): Promise<EmitInvoiceResponseDto> {
    return this.http.post<EmitInvoiceResponseDto>('/invoices', body);
  }

  /**
   * PDF is binary — use raw fetch path on HttpClient if available,
   * otherwise fall back via getBlob helper on the client.
   */
  downloadPdf(id: string): Promise<Blob> {
    return this.http.getBlob(`/invoices/pdf?id=${encodeURIComponent(id)}`);
  }
}
