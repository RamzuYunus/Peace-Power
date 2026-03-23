/**
 * Hook to detect network status and manage offline state
 */

import { useState, useEffect } from 'react';

export interface OfflineState {
  isOnline: boolean;
  isSupported: boolean;
}

export function useOffline(): OfflineState {
  const [isOnline, setIsOnline] = useState(true);
  const [isSupported] = useState(() => {
    return 'serviceWorker' in navigator && 'indexedDB' in window;
  });

  useEffect(() => {
    // Set initial state
    setIsOnline(navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return { isOnline, isSupported };
}

export function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.log('SW registration failed:', err);
    });
  }
}
