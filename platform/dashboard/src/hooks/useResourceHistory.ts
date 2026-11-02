import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../api";
import type { ApplicationItem } from "../types";
import { usePageVisibility } from "./usePageVisibility";

const sampleIntervalMs = 5_000;
const maximumSamples = 60;

export type ResourcePoint = { readonly time: string } & Readonly<Record<string, number | string>>;

interface Sample {
  readonly time: string;
  readonly cpu: Readonly<Record<string, number>>;
  readonly memory: Readonly<Record<string, number>>;
}

// Backend chưa có API lịch sử, nên Dashboard tự lấy mẫu /stats khi trang đang mở và giữ tối đa 5 phút gần nhất.
export function useResourceHistory(applications: readonly ApplicationItem[]) {
  const [samples, setSamples] = useState<readonly Sample[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const visible = usePageVisibility();
  const namesRef = useRef(new Map<string, string>());
  const runningKey = applications.filter((item) => item.runtime.status === "running").map((item) => item.id).join(",");

  useEffect(() => {
    namesRef.current = new Map(applications.map((item) => [item.id, item.name]));
  }, [applications]);

  const sample = useCallback(async (signal: AbortSignal) => {
    const running = runningKey ? runningKey.split(",") : [];
    const results = await Promise.allSettled(running.map((id) => api.stats(id, { signal })));
    const cpu: Record<string, number> = {};
    const memory: Record<string, number> = {};
    results.forEach((result, index) => {
      const id = running[index];
      if (result.status !== "fulfilled" || !id) return;
      const name = namesRef.current.get(id) ?? id;
      cpu[name] = Number(result.value.data.cpuPercent.toFixed(2));
      memory[name] = Number(result.value.data.memoryPercent.toFixed(1));
    });
    if (signal.aborted) return;
    const failed = running.length > 0 && Object.keys(cpu).length === 0;
    setError(failed ? "Runner chưa trả được số liệu tài nguyên." : "");
    if (!failed && running.length > 0) {
      const time = new Date().toLocaleTimeString("vi-VN", { hour12: false });
      setSamples((current) => [...current, { time, cpu, memory }].slice(-maximumSamples));
    }
    setLoading(false);
  }, [runningKey]);

  useEffect(() => {
    if (!visible) return;
    const controller = new AbortController();
    void sample(controller.signal);
    const timer = window.setInterval(() => void sample(controller.signal), sampleIntervalMs);
    return () => { controller.abort(); window.clearInterval(timer); };
  }, [sample, visible]);

  const flatten = (pick: (item: Sample) => Readonly<Record<string, number>>): readonly ResourcePoint[] => (
    samples.map((item) => ({ time: item.time, ...pick(item) }))
  );
  const names = [...new Set(samples.flatMap((item) => Object.keys(item.cpu)))];

  return { cpu: flatten((item) => item.cpu), memory: flatten((item) => item.memory), names, loading, error };
}
