import { useMemo, useState } from "react";
import { api } from "../api";
import type { HistoryRange } from "../types";
import type { ResourcePoint } from "./useResourceHistory";
import { usePolling } from "./usePolling";

const pollMilliseconds = 30_000;

const timeFormat = (range: HistoryRange) => new Intl.DateTimeFormat("vi-VN", range === "24h"
  ? { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }
  : { hour: "2-digit", minute: "2-digit", hour12: false });

// Lịch sử CPU/RAM do Control API lưu trong SQLite; tải lại mỗi 30 giây.
export function useStoredHistory() {
  const [range, setRange] = useState<HistoryRange>("1h");
  const polling = usePolling((signal) => api.metricsHistory(range, { signal }), pollMilliseconds, range);

  const shaped = useMemo(() => {
    const history = polling.data?.data;
    if (!history || history.range !== range) return { cpu: [] as readonly ResourcePoint[], memory: [] as readonly ResourcePoint[], names: [] as readonly string[] };
    const format = timeFormat(range);
    const names = new Map(history.applications.map((application) => [application.id, application.name]));
    const cpu = new Map<string, ResourcePoint>();
    const memory = new Map<string, ResourcePoint>();
    for (const point of history.points) {
      const label = format.format(new Date(point.time));
      const name = names.get(point.applicationId) ?? point.applicationId;
      cpu.set(point.time, { ...(cpu.get(point.time) ?? { time: label }), [name]: point.cpuPercent });
      memory.set(point.time, { ...(memory.get(point.time) ?? { time: label }), [name]: point.memoryPercent });
    }
    return {
      cpu: [...cpu.values()],
      memory: [...memory.values()],
      names: history.applications.map((application) => application.name),
    };
  }, [polling.data, range]);

  return { ...shaped, range, setRange, loading: polling.data === null && polling.refreshing, error: polling.data ? "" : polling.error };
}
