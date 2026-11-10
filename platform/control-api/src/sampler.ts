import type { ControlDatabase } from "./database.js";
import type { RunnerClient } from "./runner.js";

export const SAMPLE_INTERVAL_MS = 15_000;
export const SAMPLE_RETENTION_SECONDS = 24 * 3_600;

interface SamplerOptions {
  readonly db: ControlDatabase;
  readonly runnerClient: RunnerClient;
  readonly intervalMs?: number;
  readonly retentionSeconds?: number;
  readonly now?: () => number;
}

// Một lần lấy mẫu: ghi CPU/RAM của mọi container đang chạy; container đã dừng (Runner trả lỗi) bị bỏ qua.
export async function collectResourceSamples(options: SamplerOptions): Promise<number> {
  const { db, runnerClient } = options;
  const now = Math.floor((options.now?.() ?? Date.now()) / 1_000);
  const applications = db.listApplications();
  const results = await Promise.allSettled(applications.map((application) => runnerClient.stats(application.id)));
  const samples = results.flatMap((result, index) => {
    const application = applications[index];
    if (result.status !== "fulfilled" || !application) return [];
    return [{
      applicationId: application.id,
      cpuPercent: result.value.cpuPercent,
      memoryPercent: result.value.memoryPercent,
    }];
  });
  db.addResourceSamples(samples, now);
  db.pruneResourceSamples(now - (options.retentionSeconds ?? SAMPLE_RETENTION_SECONDS));
  return samples.length;
}

export function startResourceSampler(options: SamplerOptions): () => void {
  let busy = false;
  const tick = async () => {
    if (busy) return;
    busy = true;
    try {
      await collectResourceSamples(options);
    } catch {
      // Lấy mẫu là phụ trợ; lỗi tạm thời không được làm sập Control API.
    } finally {
      busy = false;
    }
  };
  void tick();
  const timer = setInterval(() => void tick(), options.intervalMs ?? SAMPLE_INTERVAL_MS);
  return () => clearInterval(timer);
}
