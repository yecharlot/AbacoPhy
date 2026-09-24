import type { PayrollRepository } from '../repositories/PayrollRepository';
import type { CreateEmployeeInput, Employee } from '../entities/Employee';

export class CreateEmployee {
  constructor(private repository: PayrollRepository) {}

  async execute(input: CreateEmployeeInput): Promise<Employee> {
    return this.repository.createEmployee(input);
  }
}
