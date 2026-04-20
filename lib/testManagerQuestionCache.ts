const QUESTION_CACHE_PREFIX = "test-manager-question:";

const memoryCache = new Map<string, unknown>();

function getStorageKey(cardId: string) {
  return `${QUESTION_CACHE_PREFIX}${cardId}`;
}

export function readTestManagerQuestionCache<T>(cardId: string): T | null {
  if (memoryCache.has(cardId)) {
    return memoryCache.get(cardId) as T;
  }

  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.sessionStorage.getItem(getStorageKey(cardId));
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as T;
    memoryCache.set(cardId, parsed);
    return parsed;
  } catch {
    window.sessionStorage.removeItem(getStorageKey(cardId));
    return null;
  }
}

export function writeTestManagerQuestionCache(cardId: string, value: unknown) {
  memoryCache.set(cardId, value);

  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(getStorageKey(cardId), JSON.stringify(value));
}
