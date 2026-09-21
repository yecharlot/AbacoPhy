import type { PayrollRepository } from '../repositories/PayrollRepository';
import type { Employee } from '../entities/Employee';

export class CreateEmployee {
  constructor(private repository: PayrollRepository) {}

  async execute(employee: Omit<Employee, 'id' | 'active'>): Promise<Employee> {
    return this.repository.createEmployee(employee);
  }
}
