// Safe storage utility with in-memory fallback for environments where localStorage is blocked or throws SecurityError in iframes
const memoryStorage: { [key: string]: string } = {};

function checkLocalStorage(): boolean {
  try {
    const testKey = '__storage_test__';
    window.localStorage.setItem(testKey, testKey);
    const retrieved = window.localStorage.getItem(testKey);
    window.localStorage.removeItem(testKey);
    return retrieved === testKey;
  } catch (e) {
    return false;
  }
}

const isLocalStorageAvailable = checkLocalStorage();

export const safeStorage = {
  getItem(key: string): string | null {
    if (isLocalStorageAvailable) {
      try {
        return window.localStorage.getItem(key);
      } catch (e) {
        console.warn('Failed to read from localStorage, using memory storage:', e);
      }
    }
    return memoryStorage[key] !== undefined ? memoryStorage[key] : null;
  },

  setItem(key: string, value: string): void {
    if (isLocalStorageAvailable) {
      try {
        window.localStorage.setItem(key, value);
        return;
      } catch (e) {
        console.warn('Failed to write to localStorage, using memory storage:', e);
      }
    }
    memoryStorage[key] = String(value);
  },

  removeItem(key: string): void {
    if (isLocalStorageAvailable) {
      try {
        window.localStorage.removeItem(key);
        return;
      } catch (e) {
        console.warn('Failed to remove from localStorage:', e);
      }
    }
    delete memoryStorage[key];
  },

  clear(): void {
    if (isLocalStorageAvailable) {
      try {
        window.localStorage.clear();
        return;
      } catch (e) {
        console.warn('Failed to clear localStorage:', e);
      }
    }
    for (const key in memoryStorage) {
      delete memoryStorage[key];
    }
  }
};
