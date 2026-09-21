/** Online/offline detection — browser only. */

export type NetworkStatus = {
  online: boolean;
};

type Listener = (status: NetworkStatus) => void;

function readOnline(): boolean {
  if (typeof navigator === 'undefined') return true;
  return navigator.onLine;
}

/**
 * Subscribe to online/offline changes.
 * Returns unsubscribe function.
 */
export function subscribeNetworkStatus(listener: Listener): () => void {
  const emit = () => listener({ online: readOnline() });

  if (typeof window === 'undefined') {
    emit();
    return () => {};
  }

  window.addEventListener('online', emit);
  window.addEventListener('offline', emit);
  emit();

  return () => {
    window.removeEventListener('online', emit);
    window.removeEventListener('offline', emit);
  };
}

export function isOnline(): boolean {
  return readOnline();
}
