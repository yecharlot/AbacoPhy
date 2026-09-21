import type { HttpClient } from '../../../../infrastructure/data/http';
import type {
  ChangePasswordRequestDto,
  LoginRequestDto,
  LoginResponseDto,
  MeResponseDto,
} from '../dto/AuthDto';

export class AuthRemoteSource {
  constructor(private readonly http: HttpClient) {}

  login(body: LoginRequestDto): Promise<LoginResponseDto> {
    return this.http.post<LoginResponseDto>('/auth/login', body, { skipAuth: true });
  }

  logout(): Promise<{ ok?: boolean }> {
    return this.http.post('/auth/logout', {});
  }

  me(): Promise<MeResponseDto> {
    return this.http.get<MeResponseDto>('/auth/me');
  }

  changePassword(body: ChangePasswordRequestDto): Promise<{ ok?: boolean }> {
    return this.http.post('/auth/password', body);
  }
}
