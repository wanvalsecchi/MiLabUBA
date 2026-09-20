import { Ficha } from './types';
import { safeStorage } from './storage';

const DB_NAME = 'MiLabUBADb';
const DB_VERSION = 1;
const STORE_NAME = 'fichas';
const FALLBACK_KEY = 'milabuba_fichas_fallback';

// Helper to determine if we are in fallback mode
let useFallbackStore = false;

// In-memory/localStorage backup list
function getFallbackFichas(): Ficha[] {
  try {
    const stored = safeStorage.getItem(FALLBACK_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    console.error('Error parsing fallback storage:', e);
    return [];
  }
}

function saveFallbackFichas(fichas: Ficha[]) {
  try {
    safeStorage.setItem(FALLBACK_KEY, JSON.stringify(fichas));
  } catch (e) {
    console.error('Error writing fallback storage:', e);
  }
}

export function initDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    try {
      if (typeof indexedDB === 'undefined') {
        throw new Error('indexedDB is undefined in this environment');
      }
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.warn('Error opening IndexedDB, falling back to storage:', request.error);
        useFallbackStore = true;
        reject(request.error || new Error('IndexedDB open error'));
      };

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onupgradeneeded = (event) => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      };
    } catch (err) {
      console.warn('IndexedDB is blocked or unsupported, switching to safe fallback:', err);
      useFallbackStore = true;
      reject(err);
    }
  });
}

export async function getAllFichas(): Promise<Ficha[]> {
  if (useFallbackStore) {
    return getFallbackFichas();
  }

  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      try {
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();

        request.onsuccess = () => {
          resolve(request.result || []);
        };

        request.onerror = () => {
          console.warn('Error fetching all fichas, falling back:', request.error);
          useFallbackStore = true;
          resolve(getFallbackFichas());
        };
      } catch (err) {
        console.warn('Transaction error, falling back:', err);
        useFallbackStore = true;
        resolve(getFallbackFichas());
      }
    });
  } catch (e) {
    useFallbackStore = true;
    return getFallbackFichas();
  }
}

export async function getFichaById(id: string): Promise<Ficha | undefined> {
  if (useFallbackStore) {
    const list = getFallbackFichas();
    return list.find(f => f.id === id);
  }

  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      try {
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(id);

        request.onsuccess = () => {
          resolve(request.result);
        };

        request.onerror = () => {
          console.warn(`Error fetching ficha with id ${id}, falling back:`, request.error);
          useFallbackStore = true;
          const list = getFallbackFichas();
          resolve(list.find(f => f.id === id));
        };
      } catch (err) {
        console.warn('Transaction error for getFichaById, falling back:', err);
        useFallbackStore = true;
        const list = getFallbackFichas();
        resolve(list.find(f => f.id === id));
      }
    });
  } catch (e) {
    useFallbackStore = true;
    const list = getFallbackFichas();
    return list.find(f => f.id === id);
  }
}

export async function saveFicha(ficha: Ficha): Promise<void> {
  // Always update backup in fallback store in parallel for seamless safety
  const currentFallback = getFallbackFichas();
  const existingIndex = currentFallback.findIndex(f => f.id === ficha.id);
  if (existingIndex >= 0) {
    currentFallback[existingIndex] = ficha;
  } else {
    currentFallback.push(ficha);
  }
  saveFallbackFichas(currentFallback);

  if (useFallbackStore) {
    return;
  }

  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      try {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.put(ficha);

        request.onsuccess = () => {
          resolve();
        };

        request.onerror = () => {
          console.warn('Error saving ficha to IndexedDB, using fallback:', request.error);
          useFallbackStore = true;
          resolve(); // Resolve anyway because backup is already saved
        };
      } catch (err) {
        console.warn('Transaction error in saveFicha, using fallback:', err);
        useFallbackStore = true;
        resolve();
      }
    });
  } catch (e) {
    useFallbackStore = true;
  }
}

export async function deleteFicha(id: string): Promise<void> {
  const currentFallback = getFallbackFichas();
  const filtered = currentFallback.filter(f => f.id !== id);
  saveFallbackFichas(filtered);

  if (useFallbackStore) {
    return;
  }

  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      try {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.delete(id);

        request.onsuccess = () => {
          resolve();
        };

        request.onerror = () => {
          console.warn(`Error deleting ficha with id ${id} from IndexedDB:`, request.error);
          useFallbackStore = true;
          resolve();
        };
      } catch (err) {
        console.warn('Transaction error in deleteFicha:', err);
        useFallbackStore = true;
        resolve();
      }
    });
  } catch (e) {
    useFallbackStore = true;
  }
}
