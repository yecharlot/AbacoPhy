import type { KeyValueStorage } from '../../../../infrastructure/data/storage';
import type { QueueStorageDto } from '../dto/SyncDto';

const QUEUE_KEY = 'abacophy.sync.queue';

const empty: QueueStorageDto = { ops: [], clientRev: 0 };

export class SyncLocalQueue {
  constructor(private readonly storage: KeyValueStorage) {}

  read(): QueueStorageDto {
    const raw = this.storage.get(QUEUE_KEY);
    if (!raw) return { ...empty, ops: [] };
    try {
      const parsed = JSON.parse(raw) as QueueStorageDto;
      return {
        ops: Array.isArray(parsed.ops) ? parsed.ops : [],
        clientRev: Number(parsed.clientRev ?? 0),
      };
    } catch {
      return { ...empty, ops: [] };
    }
  }

  write(data: QueueStorageDto): void {
    this.storage.set(QUEUE_KEY, JSON.stringify(data));
  }
}
