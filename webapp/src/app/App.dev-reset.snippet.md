## Cablear reset en App.svelte

```ts
import { RESET_CONFIRMATION } from '../infrastructure/ui/dev';
// masterStore ya existe vía createMasterModule(container)
```

Donde montas el dashboard:

```svelte
<DashboardScreen
  store={accountingStore}
  onDevReset={async () => {
    await masterStore.reset(RESET_CONFIRMATION);
    // opcional: recargar la página para limpiar todos los stores
    // location.reload();
  }}
/>
```

Login con **master** / `AbacoPhy#Master1` (el endpoint `/master/reset` exige rol master).
Tras el reset, vuelve a entrar con admin demo si el bootstrap lo recrea.
