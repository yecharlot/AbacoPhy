/**
 * Dado un correo explícito, consulta Gravatar y devuelve hasta 1 foto candidata
 * (mismo contrato de progreso que antes, sin búsqueda web).
 */
import {
  fetchGravatarProfile,
  type GravatarPhotoHit,
} from '../../data/sources/gravatarClient';

export type PhotoSearchPhase =
  | 'idle'
  | 'querying_gravatar'
  | 'done'
  | 'cancelled'
  | 'error';

export type PhotoCandidate = {
  id: string;
  email: string;
  avatarUrl: string;
  displayName?: string;
  profileUrl?: string;
  sourceLabel: string;
};

export type PhotoSearchProgress = {
  phase: PhotoSearchPhase;
  message: string;
  emailsFound: number;
  photosFound: number;
  candidates: PhotoCandidate[];
  error?: string;
};

export type FindPhotosOptions = {
  /** Correo introducido por el administrador (obligatorio para buscar). */
  email: string;
  signal?: AbortSignal;
  onProgress?: (p: PhotoSearchProgress) => void;
};

function normalizeEmail(raw: string): string {
  return (raw || '').trim().toLowerCase();
}

function isValidEmail(email: string): boolean {
  if (!email || email.length > 254 || !email.includes('@')) return false;
  const [local, domain] = email.split('@');
  if (!local || !domain || !domain.includes('.')) return false;
  return true;
}

export async function findProfilePhotoByEmail(
  opts: FindPhotosOptions,
): Promise<PhotoSearchProgress> {
  const emit = (p: PhotoSearchProgress) => opts.onProgress?.(p);
  const email = normalizeEmail(opts.email);

  if (!email) {
    const p: PhotoSearchProgress = {
      phase: 'done',
      message: 'Indique un correo para buscar foto en Gravatar.',
      emailsFound: 0,
      photosFound: 0,
      candidates: [],
    };
    emit(p);
    return p;
  }
  if (!isValidEmail(email)) {
    const p: PhotoSearchProgress = {
      phase: 'error',
      message: 'El correo no tiene un formato válido.',
      emailsFound: 0,
      photosFound: 0,
      candidates: [],
      error: 'email_invalid',
    };
    emit(p);
    return p;
  }

  try {
    emit({
      phase: 'querying_gravatar',
      message: 'Consultando Gravatar…',
      emailsFound: 1,
      photosFound: 0,
      candidates: [],
    });

    let hit: GravatarPhotoHit | null = null;
    try {
      hit = await fetchGravatarProfile(email, opts.signal);
    } catch (err) {
      if (opts.signal?.aborted) throw err;
      hit = null;
    }

    if (!hit) {
      const p: PhotoSearchProgress = {
        phase: 'done',
        message: 'No hay avatar en Gravatar para este correo. Puede guardar el empleado sin foto.',
        emailsFound: 1,
        photosFound: 0,
        candidates: [],
      };
      emit(p);
      return p;
    }

    const candidate: PhotoCandidate = {
      id: `g-${hit.email}`,
      email: hit.email,
      avatarUrl: hit.avatarUrl,
      displayName: hit.displayName,
      profileUrl: hit.profileUrl,
      sourceLabel: hit.source === 'gravatar-profile' ? 'Gravatar (perfil)' : 'Gravatar',
    };
    const p: PhotoSearchProgress = {
      phase: 'done',
      message: 'Foto candidata encontrada. Selecciónela si corresponde.',
      emailsFound: 1,
      photosFound: 1,
      candidates: [candidate],
    };
    emit(p);
    return p;
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      const p: PhotoSearchProgress = {
        phase: 'cancelled',
        message: 'Búsqueda cancelada.',
        emailsFound: 0,
        photosFound: 0,
        candidates: [],
      };
      emit(p);
      return p;
    }
    const msg = err instanceof Error ? err.message : 'Error al consultar Gravatar';
    const p: PhotoSearchProgress = {
      phase: 'error',
      message: msg,
      emailsFound: 1,
      photosFound: 0,
      candidates: [],
      error: msg,
    };
    emit(p);
    return p;
  }
}
