/**
 * IndexedDB for offline scan storage
 */

import { ScanResult } from './signal-processing';

const DB_NAME = 'peace-power';
const DB_VERSION = 1;
const STORE_NAME = 'pending-scans';

export interface PendingScan {
  id: string; // uuid
  data: ScanResult;
  timestamp: number;
  synced: boolean;
}

let db: IDBDatabase | null = null;

export async function initOfflineDB(): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      resolve();
    };

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });
}

export async function savePendingScan(scan: ScanResult): Promise<string> {
  if (!db) await initOfflineDB();

  const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const pending: PendingScan = {
    id,
    data: scan,
    timestamp: Date.now(),
    synced: false,
  };

  return new Promise((resolve, reject) => {
    const tx = db!.transaction([STORE_NAME], 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.add(pending);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(id);
  });
}

export async function getPendingScans(): Promise<PendingScan[]> {
  if (!db) await initOfflineDB();

  return new Promise((resolve, reject) => {
    const tx = db!.transaction([STORE_NAME], 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

export async function markScanSynced(id: string): Promise<void> {
  if (!db) await initOfflineDB();

  return new Promise((resolve, reject) => {
    const tx = db!.transaction([STORE_NAME], 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(id);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const scan = request.result;
      if (scan) {
        scan.synced = true;
        store.put(scan);
      }
      resolve();
    };
  });
}

export async function deletePendingScan(id: string): Promise<void> {
  if (!db) await initOfflineDB();

  return new Promise((resolve, reject) => {
    const tx = db!.transaction([STORE_NAME], 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}
