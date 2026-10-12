import { type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api, ApiError } from "./api";
import {
  ActivityIcon,
  AlertIcon,
  BoxIcon,
  CheckIcon,
  ChevronIcon,
  DeployIcon,
  ExternalIcon,
  GridIcon,
  HistoryIcon,
  LogOutIcon,
  PlayIcon,
  RefreshIcon,
  ServerIcon,
  ShieldIcon,
  StopIcon,
} from "./icons";
import type {
  ApplicationItem,
  ApplicationLogs,
  ApplicationStats,
  ApplicationsResponse,
  AuditEvent,
  DeploymentItem,
  OperationAction,
  OperationItem,
  TrustedSource,
  UserSession,
} from "./types";

type AuthState =
  | { readonly status: "loading" }
  | { readonly status: "guest" }
  | { readonly status: "authenticated"; readonly session: UserSession };

const actionLabels: Record<string, string> = {
  "auth.login": "Đăng nhập",
  "auth.logout": "Đăng xuất",
  "application.start": "Khởi động ứng dụng",
  "application.stop": "Dừng ứng dụng",
  "application.restart": "Khởi động lại ứng dụng",
  "application.update": "Cập nhật phiên bản",
  "deployment.create": "Triển khai từ Git",
};

const operationActionLabels: Record<OperationAction, string> = {
  start: "Khởi động",
  stop: "Dừng",
  restart: "Khởi động lại",
  update: "Cập nhật",
};

const operationStatusLabels: Record<OperationItem["status"], string> = {
  queued: "Đang chờ",
  running: "Đang xử lý",
  succeeded: "Thành công",
  failed: "Thất bại",
};

const deploymentStatusLabels: Record<DeploymentItem["status"], string> = {
  queued: "Đang chờ",
  running: "Đang build",
  succeeded: "Thành công",
  failed: "Thất bại",
};

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(value));
}

function LoadingScreen() {
  return (
    <main className="boot-screen" aria-live="polite">
      <div className="brand-mark brand-mark--large"><span /><span /><span /></div>
      <p>Đang kết nối Control API…</p>
    </main>
  );
}

function LoginScreen({ onAuthenticated }: { readonly onAuthenticated: (session: UserSession) => void }) {
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      onAuthenticated(await api.login(username.trim(), password));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Đăng nhập không thành công.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="login-shell">
      <section className="login-context" aria-label="Giới thiệu hệ thống">
        <div className="login-brand">
          <div className="brand-mark"><span /><span /><span /></div>
          <div><strong>Mini PaaS</strong><small>Control Center</small></div>
        </div>
        <div className="login-copy">
          <span className="eyebrow">NỀN TẢNG THỰC HÀNH · P1</span>
          <h1>Một điểm điều khiển cho toàn bộ vòng đời ứng dụng.</h1>
          <p>Theo dõi và vận hành các ứng dụng mẫu qua Control API, Deployment Runner và Docker Engine.</p>
        </div>
        <div className="login-capabilities">
          <div><ShieldIcon /><span><strong>Phiên quản trị an toàn</strong><small>Cookie HttpOnly và nhật ký kiểm toán</small></span></div>
          <div><ActivityIcon /><span><strong>Trạng thái được đối chiếu</strong><small>Health HTTP và trạng thái container</small></span></div>
          <div><BoxIcon /><span><strong>Thao tác có giới hạn</strong><small>Chỉ ứng dụng, lệnh và phiên bản đã cho phép</small></span></div>
        </div>
        <p className="login-stage-note">Control API không gắn Docker socket; quyền đặc biệt được cô lập tại Deployment Runner.</p>
      </section>

      <section className="login-panel">
        <form className="login-card" onSubmit={submit}>
          <div className="login-card__heading">
            <span className="eyebrow">KHU VỰC QUẢN TRỊ</span>
            <h2>Đăng nhập hệ thống</h2>
            <p>Sử dụng tài khoản quản trị được cấu hình trong môi trường triển khai.</p>
          </div>
          <label>
            <span>Tên đăng nhập</span>
            <input autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} required />
          </label>
          <label>
            <span>Mật khẩu</span>
            <input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required autoFocus />
          </label>
          {error && <div className="form-error" role="alert"><AlertIcon />{error}</div>}
          <button className="button button--primary button--wide" disabled={submitting}>
            {submitting ? "Đang xác thực…" : "Đăng nhập"}<ChevronIcon />
          </button>
          <p className="login-help"><ShieldIcon /> Mã phiên chỉ được lưu trong cookie HttpOnly.</p>
        </form>
      </section>
    </main>
  );
}

function StatusBadge({ status }: { readonly status: ApplicationItem["health"]["status"] }) {
  const label = status === "healthy" ? "HTTP ổn định" : status === "unhealthy" ? "HTTP có lỗi" : "HTTP chưa rõ";
  return <span className={`status status--${status}`}><i />{label}</span>;
}

function RuntimeBadge({ status }: { readonly status: ApplicationItem["runtime"]["status"] }) {
  const labels = {
    running: "Container chạy",
    stopped: "Container dừng",
    starting: "Đang khởi động",
    unhealthy: "Container có lỗi",
    unknown: "Chưa đọc được",
  } as const;
  const tone = status === "running" ? "healthy" : status === "stopped" || status === "unhealthy" ? "unhealthy" : "unknown";
  return <span className={`status status--${tone}`}><i />{labels[status]}</span>;
}

function ApplicationCard({
  application,
  submitting,
  onAction,
}: {
  readonly application: ApplicationItem;
  readonly submitting: boolean;
  readonly onAction: (application: ApplicationItem, action: OperationAction, version?: string) => void;
}) {
  const busy = submitting || Boolean(application.activeOperation);
  const running = application.runtime.status === "running" || application.runtime.status === "unhealthy";
  const currentVersion = application.runtime.observedVersion || application.observedVersion;
  const targetVersion = currentVersion === "v2.0.0" ? "v1.0.0" : "v2.0.0";

  return (
    <article className="app-card">
      <div className="app-card__top">
        <div className="app-icon"><BoxIcon /></div>
        <div className="status-stack"><RuntimeBadge status={application.runtime.status} /><StatusBadge status={application.health.status} /></div>
      </div>
      <div className="app-card__title">
        <div><span className="app-slug">{application.slug}</span><h3>{application.name}</h3></div>
        <a className="icon-button" href={application.route} target="_blank" rel="noreferrer" aria-label={`Mở ${application.name}`}><ExternalIcon /></a>
      </div>
      <p className="app-description">{application.description}</p>
      <dl className="app-facts">
        <div><dt>Phiên bản thực tế</dt><dd>{application.observedVersion || application.runtime.observedVersion || "Chưa đọc được"}</dd></div>
        <div><dt>Phiên bản mong muốn</dt><dd>{application.desiredVersion}</dd></div>
        <div><dt>Container</dt><dd title={application.runtime.containerName || undefined}>{application.runtime.containerName || "Chưa đọc được"}</dd></div>
      </dl>

      <div className="operation-controls" aria-label={`Thao tác ${application.name}`}>
        <div className="operation-controls__group">
          <span>Vòng đời</span>
          <div>
            {running ? (
              <button className="action-button action-button--danger" disabled={busy} onClick={() => onAction(application, "stop")}><StopIcon />Dừng</button>
            ) : (
              <button className="action-button action-button--success" disabled={busy || application.runtime.status === "unknown"} onClick={() => onAction(application, "start")}><PlayIcon />Khởi động</button>
            )}
            <button className="action-button" disabled={busy || !running} onClick={() => onAction(application, "restart")}><RefreshIcon />Khởi động lại</button>
          </div>
        </div>
        {application.id === "app-a" && (
          <div className="operation-controls__group operation-controls__group--release">
            <span>Phiên bản</span>
            <button className="action-button action-button--deploy" disabled={busy || !running} onClick={() => onAction(application, "update", targetVersion)}>
              <DeployIcon />{targetVersion === "v2.0.0" ? "Cập nhật lên v2.0.0" : "Trở về v1.0.0"}
            </button>
          </div>
        )}
      </div>

      {application.activeOperation && (
        <div className="active-operation" role="status">
          <RefreshIcon className="is-spinning" />
          <span>{operationStatusLabels[application.activeOperation.status]}: {operationActionLabels[application.activeOperation.action].toLowerCase()} {application.name}</span>
        </div>
      )}

      <div className="app-card__footer">
        <span><ActivityIcon /> Kiểm tra {formatDateTime(application.health.checkedAt)}</span>
        <a href={application.route} target="_blank" rel="noreferrer">Mở ứng dụng <ExternalIcon /></a>
      </div>
    </article>
  );
}

function OperationsTable({ operations }: { readonly operations: readonly OperationItem[] }) {
  return (
    <div className="table-wrap">
      <table>
        <thead><tr><th>Thời gian</th><th>Ứng dụng</th><th>Thao tác</th><th>Phiên bản</th><th>Trạng thái</th><th>Kết quả</th></tr></thead>
        <tbody>
          {operations.length === 0 ? (
            <tr><td colSpan={6} className="empty-cell">Chưa có thao tác vận hành. Hãy sử dụng các nút trên từng ứng dụng.</td></tr>
          ) : operations.map((operation) => (
            <tr key={operation.id}>
              <td>{formatDateTime(operation.createdAt)}</td>
              <td><strong>{operation.applicationName}</strong></td>
              <td>{operationActionLabels[operation.action]}</td>
              <td className="mono">{operation.requestedVersion || "—"}</td>
              <td><span className={`operation-state operation-state--${operation.status}`}>{operationStatusLabels[operation.status]}</span></td>
              <td className="operation-message">{operation.message || "Đang chờ Runner xử lý."}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function GitDeploymentPanel({
  sources,
  deployments,
  submitting,
  onDeploy,
}: {
  readonly sources: readonly TrustedSource[];
  readonly deployments: readonly DeploymentItem[];
  readonly submitting: boolean;
  readonly onDeploy: (sourceId: string, commit: string) => void;
}) {
  const [sourceId, setSourceId] = useState("");
  const [commit, setCommit] = useState("");
  const [validationError, setValidationError] = useState("");
  const selectedSource = sources.find((source) => source.id === sourceId) ?? sources[0];

  useEffect(() => {
    if (!sourceId && sources[0]) setSourceId(sources[0].id);
  }, [sourceId, sources]);

  function submit(event: FormEvent) {
    event.preventDefault();
    const normalizedCommit = commit.trim().toLowerCase();
    if (!/^[0-9a-f]{40}$/.test(normalizedCommit)) {
      setValidationError("Commit phải là SHA đầy đủ gồm đúng 40 ký tự hexadecimal.");
      return;
    }
    if (!selectedSource) {
      setValidationError("Chưa có kho mã nào được Runner cho phép.");
      return;
    }
    setValidationError("");
    onDeploy(selectedSource.id, normalizedCommit);
  }

  return (
    <div className="deployment-panel">
      <form className="deployment-form" onSubmit={submit}>
        <div className="deployment-form__heading">
          <span className="eyebrow">SOURCE ĐƯỢC KIỂM SOÁT</span>
          <h3>Build và triển khai một commit</h3>
          <p>Runner chỉ tải repository đã khai báo sẵn, build đúng thư mục cho phép và không nhận Dockerfile hoặc URL tùy ý.</p>
        </div>
        <label>
          <span>Kho mã</span>
          <select value={selectedSource?.id ?? ""} onChange={(event) => setSourceId(event.target.value)} disabled={submitting || sources.length === 0}>
            {sources.map((source) => <option key={source.id} value={source.id}>{source.name}</option>)}
          </select>
        </label>
        <label>
          <span>Commit SHA đầy đủ</span>
          <input
            className="mono"
            value={commit}
            onChange={(event) => setCommit(event.target.value)}
            placeholder="40 ký tự, ví dụ 4dbd6c1…"
            minLength={40}
            maxLength={40}
            autoComplete="off"
            spellCheck={false}
            required
            disabled={submitting || !selectedSource}
          />
        </label>
        {selectedSource && (
          <div className="source-summary">
            <div><small>Repository</small><a href={selectedSource.repositoryUrl} target="_blank" rel="noreferrer">{selectedSource.repositoryUrl}<ExternalIcon /></a></div>
            <div><small>Ứng dụng đích</small><strong>{selectedSource.appId}</strong></div>
          </div>
        )}
        {validationError && <div className="form-error" role="alert"><AlertIcon />{validationError}</div>}
        <button className="button button--primary deployment-submit" disabled={submitting || !selectedSource}>
          <DeployIcon />{submitting ? "Đang tiếp nhận…" : "Build và triển khai"}
        </button>
      </form>

      <div className="deployment-history">
        <div className="deployment-history__heading"><strong>Lịch sử deployment</strong><span>{deployments.length} bản ghi gần nhất</span></div>
        {deployments.length === 0 ? (
          <div className="deployment-empty"><HistoryIcon /><span><strong>Chưa có deployment từ Git</strong>Nhập commit của source được phép để bắt đầu.</span></div>
        ) : (
          <div className="deployment-list">
            {deployments.map((deployment) => (
              <article key={deployment.id} className="deployment-item">
                <div className="deployment-item__top">
                  <div><strong>{deployment.applicationName}</strong><code>{deployment.commitSha.slice(0, 12)}</code></div>
                  <span className={`operation-state operation-state--${deployment.status}`}>{deploymentStatusLabels[deployment.status]}</span>
                </div>
                <dl>
                  <div><dt>Phiên bản</dt><dd>{deployment.version ?? "—"}</dd></div>
                  <div><dt>Image</dt><dd title={deployment.imageReference ?? undefined}>{deployment.imageReference ?? "—"}</dd></div>
                  <div><dt>Thời gian</dt><dd>{formatDateTime(deployment.createdAt)}</dd></div>
                </dl>
                <p>{deployment.message ?? "Runner đang xử lý yêu cầu build và triển khai."}</p>
                {deployment.buildLog && <details><summary>Xem build log</summary><pre>{deployment.buildLog}</pre></details>}
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function AuditTable({ events }: { readonly events: readonly AuditEvent[] }) {
  return (
    <div className="table-wrap">
      <table>
        <thead><tr><th>Thời gian</th><th>Thao tác</th><th>Người thực hiện</th><th>Kết quả</th><th>Địa chỉ nguồn</th></tr></thead>
        <tbody>
          {events.length === 0 ? (
            <tr><td colSpan={5} className="empty-cell">Chưa có thao tác nào được ghi nhận.</td></tr>
          ) : events.map((event) => (
            <tr key={event.id}>
              <td>{formatDateTime(event.createdAt)}</td>
              <td><strong>{actionLabels[event.action] || event.action}</strong></td>
              <td>{event.actorUsername || "Hệ thống"}</td>
              <td><span className={`result result--${event.outcome}`}>{event.outcome === "succeeded" ? "Thành công" : "Thất bại"}</span></td>
              <td className="mono">{event.ipAddress || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function formatBytes(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "0 B";
  const units = ["B", "KiB", "MiB", "GiB"];
  const index = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1);
  const amount = value / 1024 ** index;
  return `${amount >= 100 || index === 0 ? amount.toFixed(0) : amount.toFixed(1)} ${units[index]}`;
}

function ObservabilityPanel({ applications }: { readonly applications: readonly ApplicationItem[] }) {
  const [selectedAppId, setSelectedAppId] = useState("app-a");
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

function Dashboard({ session, onLoggedOut }: { readonly session: UserSession; readonly onLoggedOut: () => void }) {
  const [applications, setApplications] = useState<ApplicationsResponse | null>(null);
  const [operations, setOperations] = useState<readonly OperationItem[]>([]);
  const [sources, setSources] = useState<readonly TrustedSource[]>([]);
  const [deployments, setDeployments] = useState<readonly DeploymentItem[]>([]);
  const [auditEvents, setAuditEvents] = useState<readonly AuditEvent[]>([]);
  const [refreshing, setRefreshing] = useState(true);
  const [submittingApp, setSubmittingApp] = useState<string | null>(null);
  const [submittingDeployment, setSubmittingDeployment] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadData = useCallback(async (quiet = false) => {
    if (!quiet) setRefreshing(true);
    setError("");
    try {
      const [apps, operationHistory, sourceCatalog, deploymentHistory, audit] = await Promise.all([
        api.applications(),
        api.operations(),
        api.sources(),
        api.deployments(),
        api.audit(),
      ]);
      setApplications(apps);
      setOperations(operationHistory.data);
      setSources(sourceCatalog.data);
      setDeployments(deploymentHistory.data);
      setAuditEvents(audit.data);
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.status === 401) {
        onLoggedOut();
        return;
      }
      setError(requestError instanceof Error ? requestError.message : "Không thể tải dữ liệu hệ thống.");
    } finally {
      setRefreshing(false);
    }
  }, [onLoggedOut]);

  useEffect(() => {
    void loadData();
    const timer = window.setInterval(() => void loadData(true), 5_000);
    return () => window.clearInterval(timer);
  }, [loadData]);

  const gatewayState = useMemo(() => {
    if (!applications) return "Đang kiểm tra";
    return applications.summary.healthy === applications.summary.total ? "Ổn định" : "Cần kiểm tra";
  }, [applications]);

  async function executeAction(application: ApplicationItem, action: OperationAction, version?: string) {
    setSubmittingApp(application.id);
    setError("");
    setNotice("");
    try {
      await api.execute(application.id, action, version);
      const versionText = version ? ` ${version}` : "";
      setNotice(`Đã tiếp nhận yêu cầu ${operationActionLabels[action].toLowerCase()} ${application.name}${versionText}.`);
      await loadData(true);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Không thể gửi thao tác tới hệ thống.");
    } finally {
      setSubmittingApp(null);
    }
  }

  async function deploySource(sourceId: string, commit: string) {
    setSubmittingDeployment(true);
    setError("");
    setNotice("");
    try {
      await api.deploySource(sourceId, commit);
      setNotice(`Đã tiếp nhận yêu cầu build và triển khai commit ${commit.slice(0, 12)}.`);
      await loadData(true);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Không thể tạo deployment từ Git.");
    } finally {
      setSubmittingDeployment(false);
    }
  }

  async function logout() {
    try { await api.logout(); } finally { onLoggedOut(); }
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="brand-mark"><span /><span /><span /></div>
          <div><strong>Mini PaaS</strong><small>Control Center</small></div>
        </div>
        <nav aria-label="Điều hướng chính">
          <span className="nav-label">VẬN HÀNH</span>
          <a className="nav-item nav-item--active" href="#overview"><GridIcon />Tổng quan</a>
          <a className="nav-item" href="#applications"><BoxIcon />Ứng dụng<span className="nav-count">{applications?.summary.total ?? "—"}</span></a>
          <a className="nav-item" href="#deployments"><DeployIcon />Triển khai Git</a>
          <a className="nav-item" href="#operations"><ServerIcon />Thao tác</a>
          <a className="nav-item" href="#activity"><HistoryIcon />Kiểm toán</a>
          <span className="nav-label nav-label--spaced">QUAN SÁT</span>
          <a className="nav-item" href="#observability"><ActivityIcon />Log và tài nguyên</a>
          <a className="nav-item" href="/monitoring/d/mini-paas-overview/mini-paas-tai-nguyen-ung-dung" target="_blank" rel="noreferrer"><ActivityIcon />Đồ thị lịch sử<ExternalIcon /></a>
        </nav>
        <div className="sidebar-footer">
          <div className="environment-card"><span className="pulse-dot" /><div><strong>Môi trường phát triển</strong><small>Một máy · Docker Compose</small></div></div>
          <button className="nav-item nav-item--button" onClick={logout}><LogOutIcon />Đăng xuất</button>
        </div>
      </aside>

      <main className="workspace" id="overview">
        <header className="topbar">
          <div><span className="breadcrumb">Mini PaaS <ChevronIcon /> Tổng quan</span><h1>Tổng quan hệ thống</h1></div>
          <div className="topbar-actions">
            <button className="button button--secondary" onClick={() => void loadData()} disabled={refreshing}><RefreshIcon className={refreshing ? "is-spinning" : ""} />{refreshing ? "Đang cập nhật" : "Làm mới"}</button>
            <div className="profile"><span>{session.user.username.slice(0, 1).toUpperCase()}</span><div><strong>{session.user.username}</strong><small>Quản trị viên</small></div></div>
          </div>
        </header>

        <div className="workspace-content">
          {error && <div className="alert alert--error" role="alert"><AlertIcon /><div><strong>Thao tác chưa hoàn tất</strong><span>{error}</span></div><button onClick={() => void loadData()}>Tải lại dữ liệu</button></div>}
          {notice && <div className="alert alert--success" role="status"><CheckIcon /><div><strong>Yêu cầu đã được tiếp nhận</strong><span>{notice}</span></div><button onClick={() => setNotice("")}>Đóng</button></div>}
          <section className="stage-banner">
            <div><span className="eyebrow">MINI PAAS · P1</span><h2>Triển khai và quan sát ứng dụng trên một nền tảng</h2><p>Runner build source tin cậy, vận hành container và xuất số liệu cho Prometheus/Grafana.</p></div>
            <div className="stage-banner__flow" aria-label="Luồng hệ thống"><span>Git commit</span><ChevronIcon /><span>Runner</span><ChevronIcon /><span>Container</span><ChevronIcon /><span>Metrics</span></div>
          </section>

          <section className="metrics-grid" aria-label="Chỉ số tổng quan">
            <article><span className="metric-icon metric-icon--blue"><BoxIcon /></span><div><small>Tổng ứng dụng</small><strong>{applications?.summary.total ?? "—"}</strong><span>Đã đăng ký trong SQLite</span></div></article>
            <article><span className="metric-icon metric-icon--green"><ServerIcon /></span><div><small>Container đang chạy</small><strong>{applications ? `${applications.summary.running}/${applications.summary.total}` : "—"}</strong><span>Đọc từ Docker qua Runner</span></div></article>
            <article><span className="metric-icon metric-icon--violet"><ActivityIcon /></span><div><small>Gateway</small><strong>{gatewayState}</strong><span>Health HTTP qua một cổng</span></div></article>
            <article><span className="metric-icon metric-icon--amber"><ShieldIcon /></span><div><small>Ranh giới quyền</small><strong>Đã tách</strong><span>Socket chỉ gắn vào Runner</span></div></article>
          </section>

          <section className="section" id="applications">
            <div className="section-heading"><div><span className="eyebrow">DANH MỤC ỨNG DỤNG</span><h2>Trạng thái và thao tác</h2><p>Health HTTP và trạng thái container được hiển thị riêng để tránh kết luận sai.</p></div><span className="last-updated">Tự động làm mới mỗi 5 giây</span></div>
            <div className="application-grid">
              {applications?.data.map((application) => (
                <ApplicationCard
                  key={application.id}
                  application={application}
                  submitting={submittingApp === application.id}
                  onAction={(item, action, version) => void executeAction(item, action, version)}
                />
              ))}
              {!applications && <><div className="skeleton-card" /><div className="skeleton-card" /></>}
            </div>
          </section>

          <section className="section" id="deployments">
            <div className="section-heading"><div><span className="eyebrow">TRIỂN KHAI TỪ GIT</span><h2>Build theo commit đã chọn</h2><p>Chỉ repository mẫu trong danh sách cho phép; mỗi lần triển khai lưu commit, image, log và kết quả thực tế.</p></div><span className="last-updated">Tự động làm mới mỗi 5 giây</span></div>
            <GitDeploymentPanel
              sources={sources}
              deployments={deployments}
              submitting={submittingDeployment}
              onDeploy={(sourceId, commit) => void deploySource(sourceId, commit)}
            />
          </section>

          <section className="runtime-note">
            <div className="runtime-note__icon"><ShieldIcon /></div>
            <div><span className="eyebrow">RANH GIỚI QUYỀN</span><h3>Docker socket chỉ tồn tại trong Deployment Runner</h3><p>Runner chỉ chấp nhận app/action/source đã khai báo, commit SHA đầy đủ và thư mục build cố định. Không có API nhận URL, Dockerfile hoặc lệnh shell tùy ý.</p></div>
            <span className="runtime-note__tag runtime-note__tag--ready">Runner hoạt động</span>
          </section>

          <section className="section" id="observability">
            <div className="section-heading"><div><span className="eyebrow">QUAN SÁT HỆ THỐNG</span><h2>Log và tài nguyên container</h2><p>Ảnh chụp và log được lấy có giới hạn; Prometheus lưu chuỗi thời gian để Grafana vẽ đồ thị.</p></div><a className="button button--secondary" href="/monitoring/d/mini-paas-overview/mini-paas-tai-nguyen-ung-dung" target="_blank" rel="noreferrer">Mở đồ thị lịch sử<ExternalIcon /></a></div>
            <ObservabilityPanel applications={applications?.data ?? []} />
          </section>

          <section className="section" id="operations">
            <div className="section-heading"><div><span className="eyebrow">VÒNG ĐỜI ỨNG DỤNG</span><h2>Lịch sử thao tác</h2><p>Mỗi yêu cầu có trạng thái chờ, đang xử lý, thành công hoặc thất bại và được lưu trong SQLite.</p></div></div>
            <OperationsTable operations={operations} />
          </section>

          <section className="section" id="activity">
            <div className="section-heading"><div><span className="eyebrow">KIỂM TOÁN</span><h2>Nhật ký quản trị</h2><p>Kết quả đăng nhập và thao tác ứng dụng được lưu kèm người thực hiện.</p></div></div>
            <AuditTable events={auditEvents} />
          </section>

          <footer className="workspace-footer"><span>Mini PaaS · Mốc P1 triển khai và quan sát</span><span><CheckIcon /> Control API không giữ quyền Docker trực tiếp</span></footer>
        </div>
      </main>
    </div>
  );
}

export default function App() {
  const [auth, setAuth] = useState<AuthState>({ status: "loading" });

  useEffect(() => {
    api.session()
      .then((session) => setAuth({ status: "authenticated", session }))
      .catch(() => setAuth({ status: "guest" }));
  }, []);

  if (auth.status === "loading") return <LoadingScreen />;
  if (auth.status === "guest") return <LoginScreen onAuthenticated={(session) => setAuth({ status: "authenticated", session })} />;
  return <Dashboard session={auth.session} onLoggedOut={() => setAuth({ status: "guest" })} />;
}
