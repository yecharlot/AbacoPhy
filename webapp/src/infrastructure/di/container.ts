import { createHttpClient, type HttpClient } from '../data/http';
import {
  createLocalStorageAdapter,
  StorageKeys,
  type KeyValueStorage,
} from '../data/storage';
import { createAppDataBus, type AppDataBus } from '../domain/events/appDataBus';

export type AppContainer = {
  storage: KeyValueStorage;
  http: HttpClient;
  getToken: () => string | null;
  setToken: (token: string | null) => void;
  /** Invalidación cross-feature post-mutación (sin polling). */
  appDataBus: AppDataBus;
};

export type CreateContainerOptions = {
  /** API base, e.g. https://abacophy.onrender.com/api/v1 or /api/v1 */
  apiBaseUrl?: string;
  storage?: KeyValueStorage;
  appDataBus?: AppDataBus;
};

/**
 * Manual root DI — phase 0.
 * Features will receive slices of this container via their own di/ modules later.
 */
export function createAppContainer(options: CreateContainerOptions = {}): AppContainer {
  const storage = options.storage ?? createLocalStorageAdapter();
  const apiBaseUrl = options.apiBaseUrl ?? '/api/v1';
  const appDataBus = options.appDataBus ?? createAppDataBus();

  const getToken = () => storage.get(StorageKeys.authToken);
  const setToken = (token: string | null) => {
    if (token) storage.set(StorageKeys.authToken, token);
    else storage.remove(StorageKeys.authToken);
  };

  const http = createHttpClient({
    baseUrl: apiBaseUrl,
    getToken,
  });

  return { storage, http, getToken, setToken, appDataBus };
}
