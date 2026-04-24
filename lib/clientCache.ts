const DEFAULT_TTL_MS = 5 * 60 * 1000;
const DEFAULT_READ_TIMEOUT_MS = 10_000;
const STORAGE_KEY_PREFIX = "bluebook:";
const STORAGE_EVICTION_BATCH_SIZE = 8;

type CacheEntry<T> = {
  value: T;
  expiresAt: number;
  createdAt?: number;
};

const memoryCache = new Map<string, CacheEntry<unknown>>();
const inflightCache = new Map<string, Promise<unknown>>();
const cacheWriteVersions = new Map<string, number>();

function getStorageKey(key: string) {
  return `${STORAGE_KEY_PREFIX}${key}`;
}

function isExpired(entry: CacheEntry<unknown>) {
  return entry.expiresAt <= Date.now();
}

function getClientKeyFromStorageKey(storageKey: string) {
  return storageKey.startsWith(STORAGE_KEY_PREFIX) ? storageKey.slice(STORAGE_KEY_PREFIX.length) : storageKey;
}

function isQuotaExceededError(error: unknown) {
  if (typeof DOMException !== "undefined" && error instanceof DOMException) {
    return (
      error.name === "QuotaExceededError" ||
      error.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
      error.code === 22 ||
      error.code === 1014
    );
  }

  return (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    ((error as { name?: string }).name === "QuotaExceededError" ||
      (error as { name?: string }).name === "NS_ERROR_DOM_QUOTA_REACHED")
  );
}

function getEntryTimestamp(entry: CacheEntry<unknown>) {
  return entry.createdAt ?? entry.expiresAt;
}

function evictExpiredMemoryEntries() {
  Array.from(memoryCache.entries()).forEach(([key, entry]) => {
    if (isExpired(entry)) {
      memoryCache.delete(key);
    }
  });
}

function evictOldestMemoryEntries(count: number) {
  evictExpiredMemoryEntries();

  Array.from(memoryCache.entries())
    .sort(([, a], [, b]) => getEntryTimestamp(a) - getEntryTimestamp(b))
    .slice(0, count)
    .forEach(([key]) => memoryCache.delete(key));
}

function getSessionStorageEntries() {
  if (typeof window === "undefined") {
    return [];
  }

  return Object.keys(window.sessionStorage)
    .filter((key) => key.startsWith(STORAGE_KEY_PREFIX))
    .map((storageKey) => {
      try {
        const rawValue = window.sessionStorage.getItem(storageKey);
        const entry = rawValue ? (JSON.parse(rawValue) as CacheEntry<unknown>) : undefined;
        return { storageKey, entry };
      } catch {
        return { storageKey, entry: undefined };
      }
    });
}

function evictOldestStorageEntries(count: number) {
  if (typeof window === "undefined") {
    return;
  }

  const entries = getSessionStorageEntries();
  const expiredOrInvalidKeys = entries
    .filter(({ entry }) => !entry || typeof entry.expiresAt !== "number" || isExpired(entry))
    .map(({ storageKey }) => storageKey);

  expiredOrInvalidKeys.forEach((storageKey) => {
    window.sessionStorage.removeItem(storageKey);
    memoryCache.delete(getClientKeyFromStorageKey(storageKey));
  });

  if (expiredOrInvalidKeys.length >= count) {
    return;
  }

  entries
    .filter(({ storageKey, entry }) => !expiredOrInvalidKeys.includes(storageKey) && entry)
    .sort((a, b) => getEntryTimestamp(a.entry as CacheEntry<unknown>) - getEntryTimestamp(b.entry as CacheEntry<unknown>))
    .slice(0, count - expiredOrInvalidKeys.length)
    .forEach(({ storageKey }) => {
      window.sessionStorage.removeItem(storageKey);
      memoryCache.delete(getClientKeyFromStorageKey(storageKey));
    });
}

export function evictOldestClientCacheEntries(count = STORAGE_EVICTION_BATCH_SIZE) {
  evictOldestMemoryEntries(count);
  evictOldestStorageEntries(count);
}

function readStorageEntry<T>(key: string) {
  if (typeof window === "undefined") {
    return undefined;
  }

  try {
    const rawValue = window.sessionStorage.getItem(getStorageKey(key));
    if (!rawValue) {
      return undefined;
    }

    const parsedValue = JSON.parse(rawValue) as CacheEntry<T>;
    if (!parsedValue || typeof parsedValue !== "object" || typeof parsedValue.expiresAt !== "number") {
      window.sessionStorage.removeItem(getStorageKey(key));
      return undefined;
    }

    if (isExpired(parsedValue as CacheEntry<unknown>)) {
      window.sessionStorage.removeItem(getStorageKey(key));
      return undefined;
    }

    return parsedValue;
  } catch {
    return undefined;
  }
}

function writeStorageEntry<T>(key: string, entry: CacheEntry<T>) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.sessionStorage.setItem(getStorageKey(key), JSON.stringify(entry));
  } catch (error) {
    if (isQuotaExceededError(error)) {
      evictOldestClientCacheEntries();

      try {
        window.sessionStorage.setItem(getStorageKey(key), JSON.stringify(entry));
      } catch {
        // Keep serving from memory if storage is still unavailable.
      }
      return;
    }

    // Ignore non-quota storage write failures and keep the in-memory cache only.
  }
}

export function getClientCache<T>(key: string): T | undefined {
  const memoryEntry = memoryCache.get(key);
  if (memoryEntry) {
    if (isExpired(memoryEntry)) {
      memoryCache.delete(key);
    } else {
      return memoryEntry.value as T;
    }
  }

  const storageEntry = readStorageEntry<T>(key);
  if (!storageEntry) {
    return undefined;
  }

  memoryCache.set(key, storageEntry);
  return storageEntry.value;
}

export function setClientCache<T>(key: string, value: T, ttlMs = DEFAULT_TTL_MS) {
  const entry: CacheEntry<T> = {
    value,
    expiresAt: Date.now() + ttlMs,
    createdAt: Date.now(),
  };

  memoryCache.set(key, entry);
  writeStorageEntry(key, entry);
}

export function deleteClientCache(key: string) {
  memoryCache.delete(key);
  inflightCache.delete(key);
  cacheWriteVersions.delete(key);

  if (typeof window === "undefined") {
    return;
  }

  try {
    window.sessionStorage.removeItem(getStorageKey(key));
  } catch {
    // Ignore storage delete failures and continue.
  }
}

export function clearClientCache(keyPrefix?: string) {
  if (!keyPrefix) {
    memoryCache.clear();
    inflightCache.clear();
    cacheWriteVersions.clear();

    if (typeof window !== "undefined") {
      try {
        Object.keys(window.sessionStorage)
          .filter((key) => key.startsWith("bluebook:"))
          .forEach((key) => window.sessionStorage.removeItem(key));
      } catch {
        // Ignore storage cleanup failures and continue.
      }
    }

    return;
  }

  Array.from(memoryCache.keys())
    .filter((key) => key.startsWith(keyPrefix))
    .forEach((key) => memoryCache.delete(key));
  Array.from(inflightCache.keys())
    .filter((key) => key.startsWith(keyPrefix))
    .forEach((key) => inflightCache.delete(key));
  Array.from(cacheWriteVersions.keys())
    .filter((key) => key.startsWith(keyPrefix))
    .forEach((key) => cacheWriteVersions.delete(key));

  if (typeof window === "undefined") {
    return;
  }

  try {
    Object.keys(window.sessionStorage)
      .filter((key) => key.startsWith(getStorageKey(keyPrefix)))
      .forEach((key) => window.sessionStorage.removeItem(key));
  } catch {
    // Ignore storage cleanup failures and continue.
  }
}

interface ReadThroughOptions {
  forceRefresh?: boolean;
  ttlMs?: number;
  timeoutMs?: number;
}

function withTimeout<T>(request: Promise<T>, timeoutMs: number, key: string) {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`Client cache request timed out for ${key}`));
    }, timeoutMs);
  });

  return Promise.race([request, timeout]).finally(() => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  });
}

export async function readThroughClientCache<T>(
  key: string,
  load: () => Promise<T>,
  options?: ReadThroughOptions,
) {
  if (!options?.forceRefresh) {
    const cachedValue = getClientCache<T>(key);
    if (cachedValue !== undefined) {
      return cachedValue;
    }

    const inflightValue = inflightCache.get(key);
    if (inflightValue) {
      return inflightValue as Promise<T>;
    }
  }

  if (options?.forceRefresh) {
    cacheWriteVersions.set(key, (cacheWriteVersions.get(key) ?? 0) + 1);
  }

  const requestVersion = cacheWriteVersions.get(key) ?? 0;
  const request = withTimeout(Promise.resolve().then(load), options?.timeoutMs ?? DEFAULT_READ_TIMEOUT_MS, key)
    .then((value) => {
      if ((cacheWriteVersions.get(key) ?? 0) === requestVersion) {
        setClientCache(key, value, options?.ttlMs);
      }
      if (inflightCache.get(key) === request) {
        inflightCache.delete(key);
      }
      return value;
    })
    .catch((error) => {
      if (inflightCache.get(key) === request) {
        inflightCache.delete(key);
      }
      throw error;
    });

  inflightCache.set(key, request);
  return request;
}
