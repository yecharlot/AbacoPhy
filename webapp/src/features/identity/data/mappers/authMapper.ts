import type { Session } from '../../domain/entities/Session';
import type { User } from '../../domain/entities/User';
import type { LoginResponseDto, MeResponseDto } from '../dto/AuthDto';

function mapUser(u: LoginResponseDto['user'] | MeResponseDto['user']): User {
  return {
    id: u.id,
    username: u.username,
    displayName: u.display_name ?? u.username,
    role: u.role,
    tenantId: u.tenant_id,
  };
}

export function loginResponseToSession(dto: LoginResponseDto): Session {
  return {
    token: dto.token,
    expiresAt: dto.expires_at ?? null,
    user: mapUser(dto.user),
    views: dto.views ?? [],
    modules: dto.modules ?? {},
  };
}

export function meResponseToSession(dto: MeResponseDto, token: string): Session {
  return {
    token,
    expiresAt: null,
    user: mapUser(dto.user),
    views: dto.views ?? [],
    modules: dto.modules ?? {},
    tenantName: dto.tenant?.name,
    rev: dto.rev,
    rootCid: dto.root_cid,
  };
}
