import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../../api";
import { AlertIcon, BoxIcon, RefreshIcon } from "../../icons";
import { formatDateTime } from "../../shared/format";
import type { ApplicationItem, ApplicationLogs, ApplicationStats } from "../../types";

function formatBytes(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "0 B";
  const units = ["B", "KiB", "MiB", "GiB"];
  const index = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1);
  const amount = value / 1024 ** index;
  return `${amount >= 100 || index === 0 ? amount.toFixed(0) : amount.toFixed(1)} ${units[index]}`;
}

export function ObservabilityPanel({ applications }: { readonly applications: readonly ApplicationItem[] }) {
  const [selectedAppId, setSelectedAppId] = useState(applications[0]?.id ?? "app-a");
  const [tail, setTail] = useState(100);
  const [stats, setStats] = useState<ApplicationStats | null>(null);
  const [logs, setLogs] = useState<ApplicationLogs | null>(null);
  const [statsError, setStatsError] = useState("");
  const [logsError, setLogsError] = useState("");
  const [loading, setLoading] = useState(false);
  const requestSequence = useRef(0);
  const selectedApplication = applications.find((application) => application.id === selectedAppId) ?? applications[0];

  const loadObservability = useCallback(async () => {
    if (!selectedApplication) return;
    const requestId = ++requestSequence.current;
    setLoading(true);
    setStats(null);
    setLogs(null);
    setStatsError("");
    setLogsError("");
    const [statsResult, logsResult] = await Promise.allSettled([
      api.stats(selectedApplication.id),
      api.logs(selectedApplication.id, tail),
    ]);
    if (requestId !== requestSequence.current) return;
    if (statsResult.status === "fulfilled") {
      setStats(statsResult.value.data);
    } else {
      setStats(null);
      setStatsError(statsResult.reason instanceof Error ? statsResult.reason.message : "Không thể lấy số liệu tài nguyên.");
    }
    if (logsResult.status === "fulfilled") {
      setLogs(logsResult.value.data);
    } else {
      setLogs(null);
      setLogsError(logsResult.reason instanceof Error ? logsResult.reason.message : "Không thể lấy nhật ký ứng dụng.");
    }
    setLoading(false);
  }, [selectedApplication?.id, tail]);

  useEffect(() => {
    void loadObservability();
  }, [loadObservability]);

  if (!selectedApplication) return <div className="skeleton-card" />;

  return (
    <div className="observability-panel">
      <div className="observability-toolbar">
        {applications.length > 1 ? (
          <div className="application-switcher" role="group" aria-label="Chọn ứng dụng cần quan sát">
            {applications.map((application) => (
              <button
                key={application.id}
                className={application.id === selectedApplication.id ? "is-selected" : ""}
                aria-pressed={application.id === selectedApplication.id}
                onClick={() => setSelectedAppId(application.id)}
              >
                <BoxIcon />{application.name}
              </button>
            ))}
          </div>
        ) : <span className="observation-scope"><BoxIcon />{selectedApplication.name}</span>}
        <div className="observability-actions">
          <label htmlFor="log-tail">Số dòng log</label>
          <select id="log-tail" value={tail} onChange={(event) => setTail(Number(event.target.value))}>
            <option value={50}>50 dòng</option>
            <option value={100}>100 dòng</option>
            <option value={200}>200 dòng</option>
          </select>
          <button className="button button--secondary observation-refresh" onClick={() => void loadObservability()} disabled={loading}>
            <RefreshIcon className={loading ? "is-spinning" : ""} />{loading ? "Đang lấy dữ liệu" : "Làm mới quan sát"}
          </button>
        </div>
      </div>

      <div className="resource-heading">
        <div><strong>{selectedApplication.name}</strong><span>Ảnh chụp tại một thời điểm, không phải dữ liệu liên tục</span></div>
        {stats && <time dateTime={stats.sampledAt}>Lấy lúc {formatDateTime(stats.sampledAt)}</time>}
      </div>

      {statsError ? (
        <div className="inline-state inline-state--error" role="status"><AlertIcon /><span><strong>Chưa lấy được số liệu</strong>{statsError}</span></div>
      ) : stats ? (
        <div className="resource-grid" aria-label={`Số liệu tài nguyên ${selectedApplication.name}`}>
          <article><small>CPU</small><strong>{stats.cpuPercent.toFixed(2)}%</strong><span>Mức dùng tại thời điểm lấy mẫu</span></article>
          <article><small>Bộ nhớ</small><strong>{formatBytes(stats.memoryWorkingSetBytes)}</strong><span>{stats.memoryPercent.toFixed(1)}% của {formatBytes(stats.memoryLimitBytes)}</span></article>
          <article><small>Tiến trình</small><strong>{stats.pids}</strong><span>Số PID trong container</span></article>
          <article><small>Mạng</small><strong>↓ {formatBytes(stats.networkRxBytes)}</strong><span>↑ {formatBytes(stats.networkTxBytes)} từ lúc khởi động</span></article>
        </div>
      ) : (
        <div className="resource-grid resource-grid--loading" aria-label="Đang lấy số liệu tài nguyên"><i /><i /><i /><i /></div>
      )}

      <div className="log-heading">
        <div><strong>Nhật ký container gần nhất</strong><span>Chỉ đọc stdout/stderr, tối đa 200 dòng mỗi yêu cầu</span></div>
        {logs && <span className="log-count">{logs.lines.length}/{logs.requestedTail} dòng</span>}
      </div>
      {logsError ? (
        <div className="inline-state inline-state--error" role="status"><AlertIcon /><span><strong>Chưa lấy được log</strong>{logsError}</span></div>
      ) : logs ? (
        <div className="log-viewer" role="region" aria-label={`Log gần nhất của ${selectedApplication.name}`} tabIndex={0}>
          {logs.lines.length === 0 ? (
            <p className="log-empty">Container chưa có dòng log nào trong phạm vi đã chọn.</p>
          ) : (
            <ol>
              {logs.lines.map((line, index) => (
                <li key={`${line.timestamp ?? "none"}-${index}`} className={line.stream === "stderr" ? "is-stderr" : ""}>
                  <time dateTime={line.timestamp ?? undefined}>{line.timestamp ? formatDateTime(line.timestamp) : "Không có thời gian"}</time>
                  <span className="log-stream">{line.stream}</span>
                  <code>{line.message}</code>
                </li>
              ))}
            </ol>
          )}
        </div>
      ) : (
        <div className="log-viewer log-viewer--loading" aria-label="Đang lấy log"><span /><span /><span /><span /></div>
      )}
      {logs?.truncated && <p className="bounded-note"><AlertIcon />Một số nội dung đã được rút gọn để bảo vệ giao diện. Có thể chọn tối đa 200 dòng.</p>}
    </div>
  );
}
