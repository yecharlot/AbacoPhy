<script lang="ts">
  import { Badge } from '../../../../infrastructure/ui/shared';
  import type { SyncStore, SyncState } from '../stores/syncStore';
  import { onMount } from 'svelte';

  export let store: SyncStore;

  let state: SyncState = store.getState();

  onMount(() => {
    return store.subscribe((s) => {
      state = s;
    });
  });

  $: tone =
    !state.online
      ? ('off' as const)
      : state.status === 'syncing'
        ? ('syncing' as const)
        : state.pendingCount > 0
          ? ('default' as const)
          : ('ok' as const);

  $: label = !state.online
    ? 'Sin conexión'
    : state.status === 'syncing'
      ? 'Sincronizando…'
      : state.pendingCount > 0
        ? `Cola ${state.pendingCount}`
        : 'En línea';
</script>

<Badge {tone}>{label}</Badge>
