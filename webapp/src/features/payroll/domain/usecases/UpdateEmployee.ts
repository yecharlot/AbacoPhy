import type { PayrollRepository } from '../repositories/PayrollRepository';
import type { Employee, UpdateEmployeeInput } from '../entities/Employee';

export class UpdateEmployee {
  constructor(private repository: PayrollRepository) {}

  async execute(input: UpdateEmployeeInput): Promise<Employee> {
    if (!input.id) throw new Error('ID de trabajador requerido');
    return this.repository.updateEmployee(input);
  }
}
