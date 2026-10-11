import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";
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
  ApplicationsResponse,
  AuditEvent,
  OperationAction,
  OperationItem,
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
          <span className="eyebrow">NỀN TẢNG THỰC HÀNH · P0.2B</span>
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

function Dashboard({ session, onLoggedOut }: { readonly session: UserSession; readonly onLoggedOut: () => void }) {
  const [applications, setApplications] = useState<ApplicationsResponse | null>(null);
  const [operations, setOperations] = useState<readonly OperationItem[]>([]);
  const [auditEvents, setAuditEvents] = useState<readonly AuditEvent[]>([]);
  const [refreshing, setRefreshing] = useState(true);
  const [submittingApp, setSubmittingApp] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadData = useCallback(async (quiet = false) => {
    if (!quiet) setRefreshing(true);
    setError("");
    try {
      const [apps, operationHistory, audit] = await Promise.all([
        api.applications(),
        api.operations(),
        api.audit(),
      ]);
      setApplications(apps);
      setOperations(operationHistory.data);
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
          <a className="nav-item" href="#operations"><ServerIcon />Thao tác</a>
          <a className="nav-item" href="#activity"><HistoryIcon />Kiểm toán</a>
          <span className="nav-label nav-label--spaced">QUAN SÁT</span>
          <span className="nav-item nav-item--disabled"><ActivityIcon />Số liệu tài nguyên<small>P1</small></span>
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
            <div><span className="eyebrow">CONTROL PLANE · P0.2B</span><h2>Vận hành ứng dụng qua một ranh giới quyền rõ ràng</h2><p>Dashboard gửi thao tác có cấu trúc; chỉ Deployment Runner nội bộ được phép giao tiếp với Docker Engine.</p></div>
            <div className="stage-banner__flow" aria-label="Luồng hệ thống"><span>Dashboard</span><ChevronIcon /><span>Control API</span><ChevronIcon /><span>Runner</span><ChevronIcon /><span>Docker</span></div>
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

          <section className="runtime-note">
            <div className="runtime-note__icon"><ShieldIcon /></div>
            <div><span className="eyebrow">RANH GIỚI QUYỀN</span><h3>Docker socket chỉ tồn tại trong Deployment Runner</h3><p>Runner chỉ chấp nhận app-a/app-b cùng bốn thao tác start, stop, restart, update và các phiên bản đã khai báo. Không có API chạy lệnh shell tùy ý.</p></div>
            <span className="runtime-note__tag runtime-note__tag--ready">Runner hoạt động</span>
          </section>

          <section className="section" id="operations">
            <div className="section-heading"><div><span className="eyebrow">VÒNG ĐỜI ỨNG DỤNG</span><h2>Lịch sử thao tác</h2><p>Mỗi yêu cầu có trạng thái chờ, đang xử lý, thành công hoặc thất bại và được lưu trong SQLite.</p></div></div>
            <OperationsTable operations={operations} />
          </section>

          <section className="section" id="activity">
            <div className="section-heading"><div><span className="eyebrow">KIỂM TOÁN</span><h2>Nhật ký quản trị</h2><p>Kết quả đăng nhập và thao tác ứng dụng được lưu kèm người thực hiện.</p></div></div>
            <AuditTable events={auditEvents} />
          </section>

          <footer className="workspace-footer"><span>Mini PaaS · Mốc P0.2B</span><span><CheckIcon /> Control API không giữ quyền Docker trực tiếp</span></footer>
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
