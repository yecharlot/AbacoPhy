/**
 * Bus liviano de invalidación cross-feature (sin WebSocket / sin polling).
 * Tras una mutación OK en el servidor, el feature emite; quien escucha vuelve a pedir datos.
 *
 * ledger.changed  → resumen, cuentas, asientos, ecuación
 * stock.changed   → almacén / POS stock
 * ops.changed     → recepciones, transferencias, listados ops
 */
export type AppDataEvent = 'ledger.changed' | 'stock.changed' | 'ops.changed';

export type AppDataBus = {
  emit(event: AppDataEvent): void;
  on(event: AppDataEvent, listener: () => void): () => void;
};

export function createAppDataBus(): AppDataBus {
  const listeners = new Map<AppDataEvent, Set<() => void>>();

  function getSet(event: AppDataEvent): Set<() => void> {
    let set = listeners.get(event);
    if (!set) {
      set = new Set();
      listeners.set(event, set);
    }
    return set;
  }

  return {
    emit(event: AppDataEvent): void {
      const set = listeners.get(event);
      if (!set || set.size === 0) return;
      for (const fn of [...set]) {
        try {
          fn();
        } catch {
          /* un listener no debe tumbar a los demás */
        }
      }
    },
    on(event: AppDataEvent, listener: () => void): () => void {
      getSet(event).add(listener);
      return () => {
        getSet(event).delete(listener);
      };
    },
  };
}
