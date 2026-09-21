import type { CreateEmployeeInput, Employee } from '../entities/Employee';
import type { PayrollRepository } from '../repositories/PayrollRepository';

export class CreateEmployee {
  constructor(private readonly repo: PayrollRepository) {}

  async execute(input: CreateEmployeeInput): Promise<Employee> {
    if (!input.name?.trim()) throw new Error('Indique el nombre del trabajador');
    if (!(input.salary >= 0)) throw new Error('El salario no puede ser negativo');
    return this.repo.createEmployee({
      ...input,
      name: input.name.trim(),
      idNumber: input.idNumber?.trim(),
      position: input.position?.trim(),
    });
  }
}
