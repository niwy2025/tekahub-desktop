import { useCallback, useEffect, useState } from "react";
import type { FlushOfflineQueueResult, OfflineQueueState } from "@teka/shared";

const EMPTY: OfflineQueueState = {
  pending: 0,
  items: [],
  lastFlushAt: null,
  lastError: null,
  flushing: false,
};

export function useOfflineQueue(enabled: boolean) {
  const [state, setState] = useState<OfflineQueueState>(EMPTY);
  const [online, setOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true,
  );

  const refresh = useCallback(async () => {
    if (!window.teka?.getOfflineQueueState) return;
    try {
      setState(await window.teka.getOfflineQueueState());
    } catch {
      // ignore
    }
  }, []);

  const flush = useCallback(async (): Promise<FlushOfflineQueueResult | null> => {
    if (!window.teka?.flushOfflineQueue) return null;
    try {
      const result = await window.teka.flushOfflineQueue();
      await refresh();
      return result;
    } catch {
      await refresh();
      return null;
    }
  }, [refresh]);

  useEffect(() => {
    if (!enabled) return;
    void refresh();
    const unsub = window.teka?.onOfflineQueueChanged?.((next) => setState(next));
    return () => unsub?.();
  }, [enabled, refresh]);

  useEffect(() => {
    if (!enabled) return;
    const onOnline = () => {
      setOnline(true);
      void flush();
    };
    const onOffline = () => setOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [enabled, flush]);

  return { state, online, refresh, flush };
}
