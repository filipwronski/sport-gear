import { useEffect } from "react";
import type { UseAutoRefreshOptions } from "../components/dashboard/types";

export function useAutoRefresh(options: UseAutoRefreshOptions): void {
  const { enabled, intervalMs, onRefresh } = options;

  useEffect(() => {
    if (!enabled) return;

    const intervalId = setInterval(() => {
      onRefresh();
    }, intervalMs);

    return () => clearInterval(intervalId);
  }, [enabled, intervalMs, onRefresh]);
}
