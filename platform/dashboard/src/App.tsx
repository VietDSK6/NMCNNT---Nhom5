import { type FormEvent, type MouseEvent as ReactMouseEvent, type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  ReleaseItem,
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
  "application.environment.update": "Cập nhật biến môi trường",
  "deployment.create": "Triển khai từ Git",
  "release.rollback": "Khôi phục phiên bản",
  "service.create": "Tạo Web Service",
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

const releaseOriginLabels: Record<ReleaseItem["origin"], string> = {
  catalog: "Cập nhật phiên bản",
  source: "Triển khai từ Git",
  rollback: "Khôi phục phiên bản",
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

type ApplicationTab = "overview" | "deployments" | "environment" | "observability";
type DashboardRoute =
  | { readonly kind: "overview" }
  | { readonly kind: "applications" }
  | { readonly kind: "application"; readonly appId: string; readonly tab: ApplicationTab }
  | { readonly kind: "deployments" }
  | { readonly kind: "operations" }
  | { readonly kind: "audit" }
  | { readonly kind: "observability" }
  | { readonly kind: "not-found" };

function normalizePathname(pathname: string): string {
  if (!pathname || pathname === "/dashboard") return "/";
  return pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
}

function resolveRoute(pathname: string): DashboardRoute {
  const normalized = normalizePathname(pathname);
  if (normalized === "/") return { kind: "overview" };
  if (normalized === "/applications") return { kind: "applications" };
  if (normalized === "/deployments") return { kind: "deployments" };
  if (normalized === "/operations") return { kind: "operations" };
  if (normalized === "/audit") return { kind: "audit" };
  if (normalized === "/observability") return { kind: "observability" };

  const applicationMatch = normalized.match(/^\/applications\/([^/]+)(?:\/(deployments|environment|observability))?$/);
  if (applicationMatch) {
    let appId: string;
    try {
      appId = decodeURIComponent(applicationMatch[1] ?? "");
    } catch {
      return { kind: "not-found" };
    }
    return {
      kind: "application",
      appId,
      tab: (applicationMatch[2] as ApplicationTab | undefined) ?? "overview",
    };
  }
  return { kind: "not-found" };
}

function useDashboardPath(): string {
  const [pathname, setPathname] = useState(() => normalizePathname(window.location.pathname));
  useEffect(() => {
    const update = () => setPathname(normalizePathname(window.location.pathname));
    window.addEventListener("popstate", update);
    return () => window.removeEventListener("popstate", update);
  }, []);
  return pathname;
}

function AppLink({
  to,
  children,
  className,
  active = false,
}: {
  readonly to: string;
  readonly children: ReactNode;
  readonly className?: string;
  readonly active?: boolean;
}) {
  function navigate(event: ReactMouseEvent<HTMLAnchorElement>) {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    if (normalizePathname(window.location.pathname) === normalizePathname(to)) return;
    window.history.pushState({}, "", to);
    window.dispatchEvent(new PopStateEvent("popstate"));
    window.scrollTo({ top: 0 });
  }

  return <a href={to} className={className} aria-current={active ? "page" : undefined} onClick={navigate}>{children}</a>;
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

function ApplicationControlPanel({
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
    <section className="service-control" aria-labelledby="service-control-title">
      <div className="service-control__heading">
        <div>
          <span className="eyebrow">VÒNG ĐỜI CONTAINER</span>
          <h2 id="service-control-title">Điều khiển vận hành</h2>
          <p>Thao tác được xếp hàng, chuyển qua Deployment Runner và lưu kết quả vào lịch sử.</p>
        </div>
        <div className="status-stack"><RuntimeBadge status={application.runtime.status} /><StatusBadge status={application.health.status} /></div>
      </div>
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
    </section>
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
  onDeployLatest,
}: {
  readonly sources: readonly TrustedSource[];
  readonly deployments: readonly DeploymentItem[];
  readonly submitting: boolean;
  readonly onDeploy: (sourceId: string, commit: string) => void;
  readonly onDeployLatest: (sourceId: string) => void;
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
          <h3>Chọn phiên bản mã nguồn</h3>
          <p>Triển khai commit mới nhất của nhánh mặc định hoặc chỉ định chính xác một commit đã tồn tại.</p>
        </div>
        {sources.length === 0 ? (
          <div className="source-unavailable"><AlertIcon /><div><strong>Chưa cấu hình source Git</strong><span>Ứng dụng này hiện được dựng từ Docker Compose và chưa nhận deployment từ repository.</span></div></div>
        ) : (
          <>
            <label>
              <span>Kho mã</span>
              <select value={selectedSource?.id ?? ""} onChange={(event) => setSourceId(event.target.value)} disabled={submitting}>
                {sources.map((source) => <option key={source.id} value={source.id}>{source.name}</option>)}
              </select>
            </label>
            {selectedSource && (
              <div className="source-summary">
                <div><small>Repository</small><a href={selectedSource.repositoryUrl} target="_blank" rel="noreferrer">{selectedSource.repositoryUrl}<ExternalIcon /></a></div>
                <div><small>Ứng dụng đích</small><strong>{selectedSource.appId}</strong></div>
                <div><small>Nhánh mặc định</small><strong className="mono">{selectedSource.defaultBranch}</strong></div>
              </div>
            )}
            <button
              className="button button--primary deployment-submit deployment-submit--latest"
              type="button"
              disabled={submitting || !selectedSource}
              onClick={() => selectedSource && onDeployLatest(selectedSource.id)}
            >
              <DeployIcon />{submitting ? "Đang tiếp nhận…" : "Triển khai commit mới nhất"}
            </button>
            <div className="deployment-choice-separator"><span>Hoặc triển khai commit cụ thể</span></div>
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
            {validationError && <div className="form-error" role="alert"><AlertIcon />{validationError}</div>}
            <button className="button button--secondary deployment-submit deployment-submit--specific" disabled={submitting || !selectedSource}>
              <DeployIcon />{submitting ? "Đang tiếp nhận…" : "Triển khai commit đã nhập"}
            </button>
          </>
        )}
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

function ReleaseHistoryPanel({
  application,
  releases,
  submittingReleaseId,
  onRollback,
}: {
  readonly application: ApplicationItem;
  readonly releases: readonly ReleaseItem[];
  readonly submittingReleaseId: string | null;
  readonly onRollback: (release: ReleaseItem) => void;
}) {
  const observedVersion = application.observedVersion || application.runtime.observedVersion;
  const [confirmingReleaseId, setConfirmingReleaseId] = useState<string | null>(null);
  const currentReleaseId = releases.find((release) => (
    release.version === observedVersion
      && release.imageId === application.runtime.imageId
  ))?.id;
  return (
    <section className="release-history" aria-labelledby="release-history-title">
      <div className="release-history__heading">
        <div>
          <span className="eyebrow">LỊCH SỬ PHIÊN BẢN</span>
          <h3 id="release-history-title">Các mốc có thể rollback</h3>
          <p>Runner chỉ dùng image còn tồn tại và có image ID khớp với bản ghi đã lưu trên Docker host.</p>
        </div>
        <span>{releases.length} release gần nhất</span>
      </div>
      {releases.length === 0 ? (
        <div className="deployment-empty"><HistoryIcon /><span><strong>Chưa có release</strong>Cập nhật phiên bản hoặc triển khai một commit thành công để tạo mốc rollback.</span></div>
      ) : (
        <div className="release-history__list">
          {releases.map((release) => {
            const isCurrent = release.id === currentReleaseId;
            const isSubmitting = submittingReleaseId === release.id;
            return (
              <article className="release-history__item" key={release.id}>
                <div className="release-history__identity">
                  <span>{releaseOriginLabels[release.origin]}</span>
                  <strong className="mono">{release.version}</strong>
                  <small>{release.commitSha ? `Commit ${release.commitSha.slice(0, 12)}` : release.imageReference}</small>
                </div>
                <div className="release-history__meta">
                  <span>{formatDateTime(release.createdAt)}</span>
                  <span>{release.requestedBy}</span>
                </div>
                {confirmingReleaseId === release.id ? (
                  <div className="release-history__actions">
                    <button className="button button--secondary" type="button" onClick={() => setConfirmingReleaseId(null)}>Giữ phiên bản hiện tại</button>
                    <button
                      className="button button--danger"
                      type="button"
                      onClick={() => {
                        setConfirmingReleaseId(null);
                        onRollback(release);
                      }}
                    >Xác nhận rollback</button>
                  </div>
                ) : (
                  <button
                    className="button button--secondary"
                    type="button"
                    disabled={isCurrent || submittingReleaseId !== null}
                    onClick={() => setConfirmingReleaseId(release.id)}
                  >
                    <HistoryIcon />{isCurrent ? "Đang chạy" : isSubmitting ? "Đang rollback…" : "Rollback về đây"}
                  </button>
                )}
              </article>
            );
          })}
        </div>
      )}
      <p className="bounded-note"><AlertIcon />Rollback hiện dùng image cục bộ trên một host. Nếu image đã bị xóa hoặc thay đổi nội dung, hệ thống sẽ từ chối thao tác.</p>
    </section>
  );
}

interface EnvironmentEditorRow {
  readonly id: string;
  readonly key: string;
  readonly value: string;
  readonly sensitive: boolean;
  readonly retainsStoredValue: boolean;
}

function EnvironmentVariablesPanel({
  application,
  onSaved,
}: {
  readonly application: ApplicationItem;
  readonly onSaved: (count: number) => void;
}) {
  const [rows, setRows] = useState<readonly EnvironmentEditorRow[]>([]);
  const [maximumVariables, setMaximumVariables] = useState(20);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const rowSequence = useRef(0);

  const loadEnvironment = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.environment(application.id);
      setMaximumVariables(response.data.limits.maximumVariables);
      setRows(response.data.variables.map((variable, index) => ({
        id: `stored-${variable.key}-${index}`,
        key: variable.key,
        value: variable.value ?? "",
        sensitive: variable.sensitive,
        retainsStoredValue: variable.sensitive && variable.value === null,
      })));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Không thể đọc biến môi trường.");
    } finally {
      setLoading(false);
    }
  }, [application.id]);

  useEffect(() => {
    void loadEnvironment();
  }, [loadEnvironment]);

  function updateRow(id: string, patch: Partial<EnvironmentEditorRow>) {
    setRows((current) => current.map((row) => row.id === id ? { ...row, ...patch } : row));
  }

  function addRow() {
    rowSequence.current += 1;
    setRows((current) => [...current, {
      id: `new-${rowSequence.current}`,
      key: "",
      value: "",
      sensitive: false,
      retainsStoredValue: false,
    }]);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const keys = rows.map((row) => row.key.trim());
    const invalidKey = keys.find((key) => !/^[A-Z][A-Z0-9_]{0,63}$/.test(key));
    if (invalidKey !== undefined) {
      setError("Tên biến phải viết hoa, bắt đầu bằng chữ cái và chỉ chứa chữ cái, số hoặc dấu gạch dưới.");
      return;
    }
    if (new Set(keys).size !== keys.length) {
      setError("Mỗi tên biến chỉ được xuất hiện một lần.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      const response = await api.updateEnvironment(application.id, rows.map((row) => ({
        key: row.key.trim(),
        value: row.sensitive && row.retainsStoredValue && row.value === "" ? null : row.value,
        sensitive: row.sensitive,
      })));
      setMaximumVariables(response.data.limits.maximumVariables);
      setRows(response.data.variables.map((variable, index) => ({
        id: `stored-${variable.key}-${index}`,
        key: variable.key,
        value: variable.value ?? "",
        sensitive: variable.sensitive,
        retainsStoredValue: variable.sensitive && variable.value === null,
      })));
      onSaved(response.data.count);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Không thể áp dụng biến môi trường.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="environment-panel" aria-labelledby="environment-title">
      <div className="environment-panel__heading">
        <div>
          <span className="eyebrow">CẤU HÌNH KHI CHẠY</span>
          <h2 id="environment-title">Biến môi trường</h2>
          <p>Giá trị được mã hóa trong SQLite. Khi lưu, Runner tái tạo container để cấu hình có hiệu lực ngay.</p>
        </div>
        <span className="environment-count">{rows.length}/{maximumVariables} biến</span>
      </div>

      <div className="environment-security-note">
        <ShieldIcon />
        <div><strong>Giá trị nhạy cảm không được đọc lại</strong><span>Sau khi lưu, Dashboard chỉ cho biết biến đã tồn tại. Để thay đổi, nhập một giá trị mới.</span></div>
      </div>

      {loading ? (
        <div className="environment-loading"><i /><i /></div>
      ) : (
        <form onSubmit={submit}>
          <div className="environment-list">
            {rows.length === 0 ? (
              <div className="environment-empty"><strong>Chưa có biến môi trường tùy chỉnh</strong><span>Thêm biến để cấu hình hành vi của {application.name} mà không sửa image.</span></div>
            ) : rows.map((row) => (
              <div className="environment-row" key={row.id}>
                <label>
                  <span>Tên biến</span>
                  <input
                    className="mono"
                    value={row.key}
                    onChange={(event) => updateRow(row.id, { key: event.target.value.toUpperCase() })}
                    placeholder="APP_MESSAGE"
                    maxLength={64}
                    autoComplete="off"
                    spellCheck={false}
                    disabled={saving}
                    required
                  />
                </label>
                <label>
                  <span>Giá trị</span>
                  <input
                    type={row.sensitive ? "password" : "text"}
                    value={row.value}
                    onChange={(event) => updateRow(row.id, { value: event.target.value, retainsStoredValue: false })}
                    placeholder={row.retainsStoredValue ? "Đã lưu · để trống để giữ nguyên" : "Nhập giá trị"}
                    maxLength={2_048}
                    autoComplete="new-password"
                    spellCheck={false}
                    disabled={saving}
                  />
                </label>
                <label className="environment-sensitive">
                  <input
                    type="checkbox"
                    checked={row.sensitive}
                    onChange={(event) => updateRow(row.id, {
                      sensitive: event.target.checked,
                      retainsStoredValue: event.target.checked ? row.retainsStoredValue : false,
                    })}
                    disabled={saving}
                  />
                  <span>Nhạy cảm</span>
                </label>
                <button
                  className="environment-remove"
                  type="button"
                  onClick={() => setRows((current) => current.filter((item) => item.id !== row.id))}
                  disabled={saving}
                  aria-label={`Xóa biến ${row.key || "chưa đặt tên"}`}
                >Xóa</button>
              </div>
            ))}
          </div>

          {error && <div className="form-error" role="alert"><AlertIcon />{error}</div>}
          <div className="environment-actions">
            <button className="button button--secondary" type="button" onClick={addRow} disabled={saving || rows.length >= maximumVariables}>Thêm biến</button>
            <button className="button button--secondary" type="button" onClick={() => void loadEnvironment()} disabled={saving}>Hoàn tác thay đổi</button>
            <button className="button button--primary" disabled={saving}>{saving ? "Đang áp dụng…" : "Lưu và tái triển khai"}</button>
          </div>
        </form>
      )}
    </section>
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

function CreateServicePanel({
  submitting,
  onCreate,
}: {
  readonly submitting: boolean;
  readonly onCreate: (input: {
    name: string;
    slug: string;
    repositoryUrl: string;
    defaultBranch: "main";
    buildContext: string;
  }) => void;
}) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [repositoryUrl, setRepositoryUrl] = useState("");
  const [buildContext, setBuildContext] = useState(".");
  const [validationError, setValidationError] = useState("");

  function submit(event: FormEvent) {
    event.preventDefault();
    const normalizedSlug = slug.trim().toLowerCase();
    if (!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(normalizedSlug)) {
      setValidationError("Slug chỉ gồm chữ thường, số và dấu gạch ngang.");
      return;
    }
    if (!/^https:\/\/github\.com\/[^/]+\/[^/]+(?:\.git)?$/.test(repositoryUrl.trim())) {
      setValidationError("Hãy nhập URL repository GitHub công khai.");
      return;
    }
    setValidationError("");
    onCreate({
      name: name.trim(),
      slug: normalizedSlug,
      repositoryUrl: repositoryUrl.trim(),
      defaultBranch: "main",
      buildContext: buildContext.trim() || ".",
    });
  }

  return (
    <section className="create-service" aria-labelledby="create-service-title">
      <div className="create-service__heading">
        <div><span className="eyebrow">WEB SERVICE MỚI</span><h2 id="create-service-title">Triển khai một sản phẩm độc lập</h2><p>Mini PaaS đọc nhánh main, build Dockerfile và cấp URL theo slug. Repository phải thuộc owner đã được quản trị viên cho phép.</p></div>
        <span className="create-service__policy"><ShieldIcon />Giới hạn tài nguyên mặc định</span>
      </div>
      <form className="create-service__form" onSubmit={submit}>
        <label><span>Tên dịch vụ</span><input required minLength={2} maxLength={80} value={name} onChange={(event) => setName(event.target.value)} placeholder="Website giới thiệu" /></label>
        <label><span>Slug</span><input required maxLength={63} value={slug} onChange={(event) => setSlug(event.target.value.toLowerCase())} placeholder="website-gioi-thieu" /><small>URL dự kiến: {slug || "slug"}.ai2p.id.vn</small></label>
        <label className="create-service__repository"><span>Repository GitHub công khai</span><input required value={repositoryUrl} onChange={(event) => setRepositoryUrl(event.target.value)} placeholder="https://github.com/VietDSK6/ten-repository" /></label>
        <label><span>Build context</span><input required value={buildContext} onChange={(event) => setBuildContext(event.target.value)} placeholder="." /><small>Dùng . nếu Dockerfile ở thư mục gốc.</small></label>
        <div className="create-service__submit">
          {validationError && <span className="field-error" role="alert">{validationError}</span>}
          <button className="button button--primary" type="submit" disabled={submitting}><DeployIcon />{submitting ? "Đang kiểm tra và triển khai…" : "Tạo Web Service"}</button>
        </div>
      </form>
    </section>
  );
}

function ApplicationDirectory({ applications }: { readonly applications: readonly ApplicationItem[] }) {
  if (applications.length === 0) {
    return (
      <div className="page-empty">
        <BoxIcon />
        <div><h2>Chưa có ứng dụng</h2><p>Ứng dụng được đăng ký trong danh mục Control API sẽ xuất hiện tại đây.</p></div>
      </div>
    );
  }

  return (
    <div className="service-directory">
      {applications.map((application) => {
        const observedVersion = application.observedVersion || application.runtime.observedVersion || "Chưa đọc được";
        return (
          <article className="service-row" key={application.id}>
            <div className="service-row__identity">
              <span className="app-icon"><BoxIcon /></span>
              <div>
                <span className="app-slug">{application.slug}</span>
                <AppLink to={`/applications/${application.id}`}><h2>{application.name}</h2></AppLink>
                <p>{application.description}</p>
              </div>
            </div>
            <div className="service-row__state">
              <RuntimeBadge status={application.runtime.status} />
              <StatusBadge status={application.health.status} />
            </div>
            <dl className="service-row__facts">
              <div><dt>Phiên bản</dt><dd>{observedVersion}</dd></div>
              <div><dt>Đường dẫn</dt><dd>{application.route}</dd></div>
              <div><dt>Cập nhật</dt><dd>{formatDateTime(application.health.checkedAt)}</dd></div>
            </dl>
            <div className="service-row__actions">
              <a className="icon-button" href={application.route} target="_blank" rel="noreferrer" aria-label={`Mở ${application.name}`}><ExternalIcon /></a>
              <AppLink className="button button--secondary" to={`/applications/${application.id}`}>Xem chi tiết<ChevronIcon /></AppLink>
            </div>
          </article>
        );
      })}
    </div>
  );
}

function ApplicationIdentity({ application }: { readonly application: ApplicationItem }) {
  return (
    <section className="service-identity">
      <div className="service-identity__main">
        <span className="app-icon app-icon--large"><BoxIcon /></span>
        <div>
          <span className="app-slug">{application.slug}</span>
          <h2>{application.name}</h2>
          <p>{application.description}</p>
        </div>
      </div>
      <div className="service-identity__aside">
        <div className="status-stack"><RuntimeBadge status={application.runtime.status} /><StatusBadge status={application.health.status} /></div>
        <a className="button button--secondary" href={application.route} target="_blank" rel="noreferrer">Mở ứng dụng<ExternalIcon /></a>
      </div>
    </section>
  );
}

function ApplicationFacts({ application, latestDeployment }: { readonly application: ApplicationItem; readonly latestDeployment?: DeploymentItem }) {
  const observedVersion = application.observedVersion || application.runtime.observedVersion || "Chưa đọc được";
  return (
    <section className="service-facts" aria-labelledby="service-facts-title">
      <div className="panel-heading"><div><span className="eyebrow">TRẠNG THÁI HIỆN TẠI</span><h2 id="service-facts-title">Thông tin dịch vụ</h2></div></div>
      <dl>
        <div><dt>URL truy cập</dt><dd><a href={application.route} target="_blank" rel="noreferrer">{application.route}<ExternalIcon /></a></dd></div>
        <div><dt>Phiên bản thực tế</dt><dd className="mono">{observedVersion}</dd></div>
        <div><dt>Phiên bản mong muốn</dt><dd className="mono">{application.desiredVersion}</dd></div>
        <div><dt>Container</dt><dd className="mono">{application.runtime.containerName || "Chưa đọc được"}</dd></div>
        <div><dt>Image</dt><dd className="mono">{application.runtime.image || "Chưa đọc được"}</dd></div>
        <div><dt>Biến môi trường</dt><dd>{application.runtime.environmentVariableCount} biến đang áp dụng</dd></div>
        <div><dt>Commit gần nhất</dt><dd className="mono">{latestDeployment?.commitSha.slice(0, 12) || "Chưa có deployment Git"}</dd></div>
      </dl>
    </section>
  );
}

function DeploymentSnapshot({ deployments }: { readonly deployments: readonly DeploymentItem[] }) {
  return (
    <section className="release-snapshot" aria-labelledby="release-snapshot-title">
      <div className="panel-heading">
        <div><span className="eyebrow">RELEASE GẦN ĐÂY</span><h2 id="release-snapshot-title">Lần triển khai mới nhất</h2></div>
      </div>
      {deployments[0] ? (
        <div className="release-snapshot__body">
          <div className="release-snapshot__status"><span className={`operation-state operation-state--${deployments[0].status}`}>{deploymentStatusLabels[deployments[0].status]}</span><time dateTime={deployments[0].createdAt}>{formatDateTime(deployments[0].createdAt)}</time></div>
          <code>{deployments[0].commitSha}</code>
          <p>{deployments[0].message || "Runner đang xử lý lần triển khai này."}</p>
          {deployments[0].imageReference && <small>{deployments[0].imageReference}</small>}
        </div>
      ) : (
        <div className="panel-empty"><DeployIcon /><div><strong>Chưa có deployment từ Git</strong><span>Dịch vụ hiện được khởi tạo từ cấu hình Docker Compose.</span></div></div>
      )}
    </section>
  );
}

function Dashboard({ session, onLoggedOut }: { readonly session: UserSession; readonly onLoggedOut: () => void }) {
  const [applications, setApplications] = useState<ApplicationsResponse | null>(null);
  const [operations, setOperations] = useState<readonly OperationItem[]>([]);
  const [sources, setSources] = useState<readonly TrustedSource[]>([]);
  const [deployments, setDeployments] = useState<readonly DeploymentItem[]>([]);
  const [releases, setReleases] = useState<readonly ReleaseItem[]>([]);
  const [auditEvents, setAuditEvents] = useState<readonly AuditEvent[]>([]);
  const [refreshing, setRefreshing] = useState(true);
  const [submittingApp, setSubmittingApp] = useState<string | null>(null);
  const [submittingDeployment, setSubmittingDeployment] = useState(false);
  const [submittingReleaseId, setSubmittingReleaseId] = useState<string | null>(null);
  const [submittingService, setSubmittingService] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const pathname = useDashboardPath();
  const route = resolveRoute(pathname);

  const loadData = useCallback(async (quiet = false) => {
    if (!quiet) setRefreshing(true);
    setError("");
    try {
      const [apps, operationHistory, sourceCatalog, deploymentHistory, releaseHistory, audit] = await Promise.all([
        api.applications(),
        api.operations(),
        api.sources(),
        api.deployments(),
        api.releases(),
        api.audit(),
      ]);
      setApplications(apps);
      setOperations(operationHistory.data);
      setSources(sourceCatalog.data);
      setDeployments(deploymentHistory.data);
      setReleases(releaseHistory.data);
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

  async function deployLatestSource(sourceId: string) {
    setSubmittingDeployment(true);
    setError("");
    setNotice("");
    try {
      const response = await api.deployLatestSource(sourceId);
      setNotice(`Đã tiếp nhận commit mới nhất ${response.data.commitSha.slice(0, 12)} để build và triển khai.`);
      await loadData(true);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Không thể triển khai commit mới nhất.");
    } finally {
      setSubmittingDeployment(false);
    }
  }

  async function rollbackRelease(release: ReleaseItem) {
    setSubmittingReleaseId(release.id);
    setError("");
    setNotice("");
    try {
      await api.rollbackRelease(release.id);
      setNotice(`Đã rollback ${release.applicationName} về ${release.version}.`);
      await loadData(true);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Không thể rollback release.");
    } finally {
      setSubmittingReleaseId(null);
    }
  }

  async function createService(input: Parameters<typeof api.createService>[0]) {
    setSubmittingService(true);
    setError("");
    setNotice("");
    try {
      const response = await api.createService(input);
      setNotice(`Đã đăng ký ${input.name}; deployment commit mới nhất đang được xử lý.`);
      await loadData(true);
      window.history.pushState({}, "", `/applications/${response.data.application.id}/deployments`);
      window.dispatchEvent(new PopStateEvent("popstate"));
      window.scrollTo({ top: 0 });
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Không thể tạo Web Service.");
    } finally {
      setSubmittingService(false);
    }
  }

  async function logout() {
    try { await api.logout(); } finally { onLoggedOut(); }
  }

  const currentApplication = route.kind === "application"
    ? applications?.data.find((application) => application.id === route.appId)
    : undefined;

  const pageTitle = (() => {
    if (route.kind === "applications") return "Ứng dụng";
    if (route.kind === "deployments") return "Triển khai từ Git";
    if (route.kind === "operations") return "Lịch sử thao tác";
    if (route.kind === "audit") return "Nhật ký quản trị";
    if (route.kind === "observability") return "Log và tài nguyên";
    if (route.kind === "application") return currentApplication?.name ?? "Chi tiết ứng dụng";
    if (route.kind === "not-found") return "Không tìm thấy trang";
    return "Tổng quan hệ thống";
  })();

  function renderApplicationPage(application: ApplicationItem, tab: ApplicationTab) {
    const applicationDeployments = deployments.filter((deployment) => deployment.applicationId === application.id);
    const applicationOperations = operations.filter((operation) => operation.applicationId === application.id);
    const applicationSources = sources.filter((source) => source.appId === application.id);
    const applicationReleases = releases.filter((release) => release.applicationId === application.id);
    const basePath = `/applications/${application.id}`;

    return (
      <>
        <ApplicationIdentity application={application} />
        <nav className="detail-tabs" aria-label={`Khu vực ${application.name}`}>
          <AppLink to={basePath} active={tab === "overview"}>Tổng quan</AppLink>
          <AppLink to={`${basePath}/deployments`} active={tab === "deployments"}>Triển khai</AppLink>
          <AppLink to={`${basePath}/environment`} active={tab === "environment"}>Biến môi trường</AppLink>
          <AppLink to={`${basePath}/observability`} active={tab === "observability"}>Nhật ký &amp; tài nguyên</AppLink>
        </nav>

        {tab === "overview" && (
          <div className="detail-content">
            <ApplicationControlPanel
              application={application}
              submitting={submittingApp === application.id}
              onAction={(item, action, version) => void executeAction(item, action, version)}
            />
            <div className="detail-grid">
              <ApplicationFacts application={application} latestDeployment={applicationDeployments[0]} />
              <DeploymentSnapshot deployments={applicationDeployments} />
            </div>
            <section className="page-section">
              <div className="section-heading">
                <div><span className="eyebrow">HOẠT ĐỘNG CỦA ỨNG DỤNG</span><h2>Lịch sử thao tác gần đây</h2><p>Chỉ hiển thị các thao tác thuộc {application.name}.</p></div>
                <AppLink className="text-link" to="/operations">Xem toàn hệ thống<ChevronIcon /></AppLink>
              </div>
              <OperationsTable operations={applicationOperations} />
            </section>
          </div>
        )}

        {tab === "deployments" && (
          <section className="detail-content">
            <div className="page-intro page-intro--compact">
              <div><span className="eyebrow">TRIỂN KHAI RIÊNG CHO ỨNG DỤNG</span><h2>Source, commit và build log</h2><p>Mọi bản ghi dưới đây đều thuộc {application.name}.</p></div>
            </div>
            <GitDeploymentPanel
              sources={applicationSources}
              deployments={applicationDeployments}
              submitting={submittingDeployment}
              onDeploy={(sourceId, commit) => void deploySource(sourceId, commit)}
              onDeployLatest={(sourceId) => void deployLatestSource(sourceId)}
            />
            <ReleaseHistoryPanel
              application={application}
              releases={applicationReleases}
              submittingReleaseId={submittingReleaseId}
              onRollback={(release) => void rollbackRelease(release)}
            />
          </section>
        )}

        {tab === "environment" && (
          <section className="detail-content">
            <EnvironmentVariablesPanel
              application={application}
              onSaved={(count) => {
                setNotice(`Đã áp dụng ${count} biến môi trường cho ${application.name}.`);
                void loadData(true);
              }}
            />
          </section>
        )}

        {tab === "observability" && (
          <section className="detail-content">
            <div className="page-intro page-intro--compact">
              <div><span className="eyebrow">QUAN SÁT RIÊNG CHO ỨNG DỤNG</span><h2>Log và tài nguyên container</h2><p>Số liệu và nhật ký chỉ lấy từ container của {application.name}.</p></div>
              <a className="button button--secondary" href="/monitoring/d/mini-paas-overview/mini-paas-tai-nguyen-ung-dung" target="_blank" rel="noreferrer">Mở Grafana<ExternalIcon /></a>
            </div>
            <ObservabilityPanel applications={[application]} />
          </section>
        )}
      </>
    );
  }

  function renderPage() {
    if (route.kind === "overview") {
      return (
        <>
          <section className="stage-banner">
            <div><span className="eyebrow">MINI PAAS · P1</span><h2>Một điểm vận hành cho các Web Service của nhóm</h2><p>Từ commit Git tin cậy tới container, đường dẫn truy cập, nhật ký và chỉ số tài nguyên.</p></div>
            <div className="stage-banner__flow" aria-label="Luồng hệ thống"><span>Git commit</span><ChevronIcon /><span>Runner</span><ChevronIcon /><span>Container</span><ChevronIcon /><span>Metrics</span></div>
          </section>

          <section className="metrics-grid" aria-label="Chỉ số tổng quan">
            <article><span className="metric-icon metric-icon--blue"><BoxIcon /></span><div><small>Tổng ứng dụng</small><strong>{applications?.summary.total ?? "—"}</strong><span>Đã đăng ký trong SQLite</span></div></article>
            <article><span className="metric-icon metric-icon--green"><ServerIcon /></span><div><small>Container đang chạy</small><strong>{applications ? `${applications.summary.running}/${applications.summary.total}` : "—"}</strong><span>Đọc từ Docker qua Runner</span></div></article>
            <article><span className="metric-icon metric-icon--violet"><ActivityIcon /></span><div><small>Gateway</small><strong>{gatewayState}</strong><span>Health HTTP qua một cổng</span></div></article>
            <article><span className="metric-icon metric-icon--amber"><ShieldIcon /></span><div><small>Ranh giới quyền</small><strong>Đã tách</strong><span>Socket chỉ gắn vào Runner</span></div></article>
          </section>

          <section className="page-section">
            <div className="section-heading"><div><span className="eyebrow">DỊCH VỤ ĐANG QUẢN LÝ</span><h2>Ứng dụng</h2><p>Mở một ứng dụng để xem deployment, log và tài nguyên trong đúng ngữ cảnh.</p></div><AppLink className="text-link" to="/applications">Xem danh sách đầy đủ<ChevronIcon /></AppLink></div>
            {applications ? <ApplicationDirectory applications={applications.data} /> : <div className="skeleton-list"><i /><i /></div>}
          </section>

          <section className="page-section">
            <div className="section-heading"><div><span className="eyebrow">HOẠT ĐỘNG GẦN ĐÂY</span><h2>Thao tác toàn hệ thống</h2><p>Theo dõi yêu cầu đang chờ, thành công hoặc thất bại.</p></div><AppLink className="text-link" to="/operations">Xem tất cả<ChevronIcon /></AppLink></div>
            <OperationsTable operations={operations.slice(0, 6)} />
          </section>
        </>
      );
    }

    if (route.kind === "applications") {
      return (
        <>
          <section className="page-intro"><div><span className="eyebrow">DANH MỤC DỊCH VỤ</span><h2>Ứng dụng</h2><p>Mỗi ứng dụng có không gian vận hành riêng cho vòng đời, deployment và quan sát.</p></div><span className="last-updated">Tự động làm mới mỗi 5 giây</span></section>
          <CreateServicePanel submitting={submittingService} onCreate={(input) => void createService(input)} />
          {applications ? <ApplicationDirectory applications={applications.data} /> : <div className="skeleton-list"><i /><i /></div>}
        </>
      );
    }

    if (route.kind === "application") {
      if (!applications) return <div className="skeleton-detail"><i /><i /><i /></div>;
      if (!currentApplication) {
        return <div className="page-empty"><AlertIcon /><div><h2>Không tìm thấy ứng dụng</h2><p>ID ứng dụng không nằm trong danh mục Control API.</p><AppLink className="button button--secondary" to="/applications">Về danh sách ứng dụng</AppLink></div></div>;
      }
      return renderApplicationPage(currentApplication, route.tab);
    }

    if (route.kind === "deployments") {
      return (
        <>
          <section className="page-intro"><div><span className="eyebrow">TRIỂN KHAI TỪ GIT</span><h2>Build commit mới nhất hoặc đã chọn</h2><p>Góc nhìn toàn hệ thống cho source được phép và lịch sử deployment gần đây.</p></div><span className="last-updated">Tự động làm mới mỗi 5 giây</span></section>
          <GitDeploymentPanel
            sources={sources}
            deployments={deployments}
            submitting={submittingDeployment}
            onDeploy={(sourceId, commit) => void deploySource(sourceId, commit)}
            onDeployLatest={(sourceId) => void deployLatestSource(sourceId)}
          />
        </>
      );
    }

    if (route.kind === "operations") {
      return <><section className="page-intro"><div><span className="eyebrow">VÒNG ĐỜI ỨNG DỤNG</span><h2>Lịch sử thao tác</h2><p>Tất cả yêu cầu Start, Stop, Restart và Update trên các ứng dụng.</p></div></section><OperationsTable operations={operations} /></>;
    }

    if (route.kind === "audit") {
      return <><section className="page-intro"><div><span className="eyebrow">KIỂM TOÁN</span><h2>Nhật ký quản trị</h2><p>Kết quả đăng nhập và thao tác được lưu cùng người thực hiện và địa chỉ nguồn.</p></div></section><AuditTable events={auditEvents} /></>;
    }

    if (route.kind === "observability") {
      return (
        <>
          <section className="page-intro"><div><span className="eyebrow">QUAN SÁT HỆ THỐNG</span><h2>Log và tài nguyên</h2><p>Chọn ứng dụng để đọc log gần nhất và ảnh chụp tài nguyên container.</p></div><a className="button button--secondary" href="/monitoring/d/mini-paas-overview/mini-paas-tai-nguyen-ung-dung" target="_blank" rel="noreferrer">Mở Grafana<ExternalIcon /></a></section>
          <ObservabilityPanel applications={applications?.data ?? []} />
        </>
      );
    }

    return <div className="page-empty"><AlertIcon /><div><h2>Không tìm thấy trang</h2><p>Đường dẫn không thuộc Dashboard Mini PaaS.</p><AppLink className="button button--secondary" to="/">Về Tổng quan</AppLink></div></div>;
  }

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">Bỏ qua điều hướng</a>
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="brand-mark"><span /><span /><span /></div>
          <div><strong>Mini PaaS</strong><small>Control Center</small></div>
        </div>
        <nav aria-label="Điều hướng chính">
          <span className="nav-label">VẬN HÀNH</span>
          <AppLink className={`nav-item ${pathname === "/" ? "nav-item--active" : ""}`} to="/" active={pathname === "/"}><GridIcon />Tổng quan</AppLink>
          <AppLink className={`nav-item ${pathname.startsWith("/applications") ? "nav-item--active" : ""}`} to="/applications" active={pathname.startsWith("/applications")}><BoxIcon />Ứng dụng<span className="nav-count">{applications?.summary.total ?? "—"}</span></AppLink>
          <AppLink className={`nav-item ${pathname === "/deployments" ? "nav-item--active" : ""}`} to="/deployments" active={pathname === "/deployments"}><DeployIcon />Triển khai Git</AppLink>
          <AppLink className={`nav-item ${pathname === "/operations" ? "nav-item--active" : ""}`} to="/operations" active={pathname === "/operations"}><ServerIcon />Thao tác</AppLink>
          <AppLink className={`nav-item ${pathname === "/audit" ? "nav-item--active" : ""}`} to="/audit" active={pathname === "/audit"}><HistoryIcon />Kiểm toán</AppLink>
          <span className="nav-label nav-label--spaced">QUAN SÁT</span>
          <AppLink className={`nav-item ${pathname === "/observability" ? "nav-item--active" : ""}`} to="/observability" active={pathname === "/observability"}><ActivityIcon />Log và tài nguyên</AppLink>
          <a className="nav-item" href="/monitoring/d/mini-paas-overview/mini-paas-tai-nguyen-ung-dung" target="_blank" rel="noreferrer"><ActivityIcon />Đồ thị lịch sử<ExternalIcon /></a>
        </nav>
        <div className="sidebar-footer">
          <div className="environment-card"><span className="pulse-dot" /><div><strong>Môi trường phát triển</strong><small>Một máy · Docker Compose</small></div></div>
          <button className="nav-item nav-item--button" onClick={logout}><LogOutIcon />Đăng xuất</button>
        </div>
      </aside>

      <main className="workspace" id="main-content">
        <header className="topbar">
          <div>
            <span className="breadcrumb"><AppLink to="/">Mini PaaS</AppLink><ChevronIcon />{route.kind === "application" && <><AppLink to="/applications">Ứng dụng</AppLink><ChevronIcon /></>}{pageTitle}</span>
            <h1>{pageTitle}</h1>
          </div>
          <div className="topbar-actions">
            <button className="button button--secondary" onClick={() => void loadData()} disabled={refreshing}><RefreshIcon className={refreshing ? "is-spinning" : ""} />{refreshing ? "Đang cập nhật" : "Làm mới"}</button>
            <div className="profile"><span>{session.user.username.slice(0, 1).toUpperCase()}</span><div><strong>{session.user.username}</strong><small>Quản trị viên</small></div></div>
          </div>
        </header>

        <div className="workspace-content">
          {error && <div className="alert alert--error" role="alert"><AlertIcon /><div><strong>Thao tác chưa hoàn tất</strong><span>{error}</span></div><button onClick={() => void loadData()}>Tải lại dữ liệu</button></div>}
          {notice && <div className="alert alert--success" role="status"><CheckIcon /><div><strong>Yêu cầu đã được tiếp nhận</strong><span>{notice}</span></div><button onClick={() => setNotice("")}>Đóng</button></div>}
          {renderPage()}
          <footer className="workspace-footer"><span>Mini PaaS · Control plane một máy</span><span><CheckIcon /> Mỗi ứng dụng có không gian vận hành riêng</span></footer>
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
