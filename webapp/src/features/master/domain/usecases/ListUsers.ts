import type { UsersSnapshot } from '../entities/PlatformUser';
import type { MasterRepository } from '../repositories/MasterRepository';

export class ListUsers {
  constructor(private readonly repo: MasterRepository) {}

  execute(): Promise<UsersSnapshot> {
    return this.repo.getUsers();
  }
}
