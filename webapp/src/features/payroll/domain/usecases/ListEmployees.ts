import type { PayrollRepository } from '../repositories/PayrollRepository';
import type { Employee } from '../entities/Employee';

export class ListEmployees {
  constructor(private repository: PayrollRepository) {}

  async execute(): Promise<Employee[]> {
    return this.repository.getEmployees();
  }
}
