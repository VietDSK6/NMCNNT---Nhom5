import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "../api";
import { usePageVisibility } from "./usePageVisibility";

// Tải dữ liệu định kỳ cho một trang: tạm dừng khi tab ẩn, hủy request khi rời trang, không chồng lệnh.
export function usePolling<T>(load: (signal: AbortSignal) => Promise<T>, intervalMs: number, resetKey?: string) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(true);
  const [reloadTick, setReloadTick] = useState(0);
  const visible = usePageVisibility();
  const loadRef = useRef(load);

  useEffect(() => { loadRef.current = load; });

  useEffect(() => {
    if (!visible) return;
    const controller = new AbortController();
    let busy = false;
    const run = async () => {
      if (busy) return;
      busy = true;
      try {
        setData(await loadRef.current(controller.signal));
        setError("");
      } catch (requestError) {
        if (!controller.signal.aborted) {
          setError(requestError instanceof ApiError || requestError instanceof Error ? requestError.message : "Không thể tải dữ liệu.");
        }
      } finally {
        busy = false;
        if (!controller.signal.aborted) setRefreshing(false);
      }
    };
    setRefreshing(true);
    void run();
    const timer = window.setInterval(() => void run(), intervalMs);
    return () => { controller.abort(); window.clearInterval(timer); };
  }, [visible, intervalMs, reloadTick, resetKey]);

  const reload = useCallback(() => setReloadTick((tick) => tick + 1), []);
  return { data, error, refreshing, reload };
}
