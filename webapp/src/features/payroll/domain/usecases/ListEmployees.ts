import type { Employee } from '../entities/Employee';
import type { PayrollRepository } from '../repositories/PayrollRepository';

export class ListEmployees {
  constructor(private readonly repo: PayrollRepository) {}

  execute(): Promise<Employee[]> {
    return this.repo.getEmployees();
  }
}
