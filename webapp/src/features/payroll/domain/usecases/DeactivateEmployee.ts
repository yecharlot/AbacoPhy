import type { PayrollRepository } from '../repositories/PayrollRepository';

/** Baja lógica — el backend registra traza nomina.trabajador.baja */
export class DeactivateEmployee {
  constructor(private repository: PayrollRepository) {}

  async execute(id: string): Promise<void> {
    if (!id) throw new Error('ID de trabajador requerido');
    return this.repository.deactivateEmployee(id);
  }
}
