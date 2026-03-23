/**
 * Sync manager for pending offline scans
 */

import { getPendingScans, markScanSynced, deletePendingScan } from './offline-db';
import { submitScan } from '@workspace/api-client-react';

export async function syncPendingScans(): Promise<{ synced: number; failed: number }> {
  const pending = await getPendingScans();
  let synced = 0;
  let failed = 0;

  for (const scan of pending) {
    if (scan.synced) continue;

    try {
      await submitScan(scan.data);
      await markScanSynced(scan.id);
      synced++;
    } catch (err) {
      console.error(`Failed to sync scan ${scan.id}:`, err);
      failed++;
    }
  }

  return { synced, failed };
}

export async function cleanupSyncedScans(): Promise<void> {
  const pending = await getPendingScans();
  for (const scan of pending) {
    if (scan.synced) {
      await deletePendingScan(scan.id);
    }
  }
}

// Auto-sync when coming back online
export function setupAutoSync() {
  const handleOnline = async () => {
    console.log('Back online, syncing pending scans...');
    await syncPendingScans();
    await cleanupSyncedScans();
  };

  window.addEventListener('online', handleOnline);
  return () => window.removeEventListener('online', handleOnline);
}
