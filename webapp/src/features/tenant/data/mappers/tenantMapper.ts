import type { Tenant, UpdateTenantInput } from '../../domain/entities/Tenant';
import type { TenantDto, TenantResponseDto } from '../dto/TenantDto';

function unwrap(dto: TenantResponseDto): TenantDto {
  if (dto.tenant && typeof dto.tenant === 'object') return dto.tenant;
  return dto;
}

export function tenantDtoToEntity(dto: TenantResponseDto): Tenant {
  const t = unwrap(dto);
  return {
    id: String(t.id ?? ''),
    name: String(t.name ?? ''),
    slug: String(t.slug ?? ''),
    currency: String(t.currency ?? 'CUP'),
    phone: String(t.phone ?? ''),
    address: String(t.address ?? ''),
    email: String(t.email ?? ''),
    taxId: String(t.tax_id ?? t.taxId ?? ''),
    settings: (t.settings && typeof t.settings === 'object' ? t.settings : {}) as Record<
      string,
      unknown
    >,
  };
}

export function updateInputToDto(input: UpdateTenantInput): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  if (input.name !== undefined) body.name = input.name;
  if (input.currency !== undefined) body.currency = input.currency;
  if (input.phone !== undefined) body.phone = input.phone;
  if (input.address !== undefined) body.address = input.address;
  if (input.email !== undefined) body.email = input.email;
  if (input.taxId !== undefined) body.tax_id = input.taxId;
  if (input.settings !== undefined) body.settings = input.settings;
  return body;
}
