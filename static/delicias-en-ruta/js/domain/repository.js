/** Port: persistence abstraction (IPFS-backed in infrastructure) */
export class BusinessRepository {
  async load() { throw new Error('not implemented'); }
  async save(state) { throw new Error('not implemented'); }
  async history() { return []; }
}
