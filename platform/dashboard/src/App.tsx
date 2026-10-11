import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { api, ApiError } from "./api";
import {
  ActivityIcon,
  AlertIcon,
  BoxIcon,
  CheckIcon,
  ChevronIcon,
  ExternalIcon,
  GridIcon,
  HistoryIcon,
  LogOutIcon,
  RefreshIcon,
  ServerIcon,
  ShieldIcon,
} from "./icons";
import type { ApplicationItem, ApplicationsResponse, AuditEvent, UserSession } from "./types";

type AuthState =
  | { readonly status: "loading" }
  | { readonly status: "guest" }
  | { readonly status: "authenticated"; readonly session: UserSession };

const actionLabels: Record<string, string> = {
  "auth.login": "Đăng nhập",
  "auth.logout": "Đăng xuất",
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
          <span className="eyebrow">NỀN TẢNG THỰC HÀNH · P0.2</span>
          <h1>Một điểm điều khiển cho toàn bộ vòng đời ứng dụng.</h1>
          <p>Theo dõi tuyến truy cập, phiên bản và tình trạng ứng dụng trên hạ tầng container từ một giao diện thống nhất.</p>
        </div>
        <div className="login-capabilities">
          <div><ShieldIcon /><span><strong>Phiên quản trị an toàn</strong><small>Cookie HttpOnly và nhật ký kiểm toán</small></span></div>
          <div><ActivityIcon /><span><strong>Kiểm tra tình trạng thật</strong><small>Đối chiếu trực tiếp qua Gateway</small></span></div>
          <div><BoxIcon /><span><strong>Sẵn sàng mở rộng</strong><small>Cấu trúc dành cho Runner và giám sát</small></span></div>
        </div>
        <p className="login-stage-note">Mốc hiện tại chưa cấp quyền điều khiển Docker cho Control API.</p>
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
  const label = status === "healthy" ? "Hoạt động" : status === "unhealthy" ? "Có lỗi" : "Chưa xác định";
  return <span className={`status status--${status}`}><i />{label}</span>;
}

function ApplicationCard({ application }: { readonly application: ApplicationItem }) {
  return (
    <article className="app-card">
      <div className="app-card__top">
        <div className="app-icon"><BoxIcon /></div>
        <StatusBadge status={application.health.status} />
      </div>
      <div className="app-card__title">
        <div><span className="app-slug">{application.slug}</span><h3>{application.name}</h3></div>
        <a className="icon-button" href={application.route} target="_blank" rel="noreferrer" aria-label={`Mở ${application.name}`}><ExternalIcon /></a>
      </div>
      <p className="app-description">{application.description}</p>
      <dl className="app-facts">
        <div><dt>Phiên bản thực tế</dt><dd>{application.observedVersion || "Chưa đọc được"}</dd></div>
        <div><dt>Phiên bản mong muốn</dt><dd>{application.desiredVersion}</dd></div>
        <div><dt>Phản hồi HTTP</dt><dd>{application.health.httpStatus ? `${application.health.httpStatus} · ${application.health.latencyMs} ms` : "Không có phản hồi"}</dd></div>
      </dl>
      <div className="app-card__footer">
        <span><ActivityIcon /> Kiểm tra {formatDateTime(application.health.checkedAt)}</span>
        <a href={application.route} target="_blank" rel="noreferrer">Mở ứng dụng <ExternalIcon /></a>
      </div>
    </article>
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
  const [auditEvents, setAuditEvents] = useState<readonly AuditEvent[]>([]);
  const [refreshing, setRefreshing] = useState(true);
  const [error, setError] = useState("");

  const loadData = useCallback(async (quiet = false) => {
    if (!quiet) setRefreshing(true);
    setError("");
    try {
      const [apps, audit] = await Promise.all([api.applications(), api.audit()]);
      setApplications(apps);
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
    const timer = window.setInterval(() => void loadData(true), 30_000);
    return () => window.clearInterval(timer);
  }, [loadData]);

  const gatewayState = useMemo(() => {
    if (!applications) return "Đang kiểm tra";
    return applications.summary.healthy === applications.summary.total ? "Ổn định" : "Cần kiểm tra";
  }, [applications]);

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
          <a className="nav-item" href="#activity"><HistoryIcon />Lịch sử</a>
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
          {error && <div className="alert alert--error" role="alert"><AlertIcon /><div><strong>Không thể cập nhật dữ liệu</strong><span>{error}</span></div><button onClick={() => void loadData()}>Thử lại</button></div>}
          <section className="stage-banner">
            <div><span className="eyebrow">CONTROL PLANE · P0.2</span><h2>Kiểm soát trạng thái từ một nguồn thống nhất</h2><p>Dashboard đang đọc dữ liệu thật từ Control API và kiểm tra hai ứng dụng qua Gateway.</p></div>
            <div className="stage-banner__flow" aria-label="Luồng hệ thống"><span>Dashboard</span><ChevronIcon /><span>Control API</span><ChevronIcon /><span>Gateway</span><ChevronIcon /><span>Web Apps</span></div>
          </section>

          <section className="metrics-grid" aria-label="Chỉ số tổng quan">
            <article><span className="metric-icon metric-icon--blue"><BoxIcon /></span><div><small>Tổng ứng dụng</small><strong>{applications?.summary.total ?? "—"}</strong><span>Đã đăng ký trong SQLite</span></div></article>
            <article><span className="metric-icon metric-icon--green"><ActivityIcon /></span><div><small>Health HTTP</small><strong>{applications ? `${applications.summary.healthy}/${applications.summary.total}` : "—"}</strong><span>Phản hồi bình thường</span></div></article>
            <article><span className="metric-icon metric-icon--violet"><ServerIcon /></span><div><small>Gateway</small><strong>{gatewayState}</strong><span>Một cổng truy cập duy nhất</span></div></article>
            <article><span className="metric-icon metric-icon--amber"><ShieldIcon /></span><div><small>Phiên quản trị</small><strong>Đã xác thực</strong><span>Cookie HttpOnly · SameSite</span></div></article>
          </section>

          <section className="section" id="applications">
            <div className="section-heading"><div><span className="eyebrow">DANH MỤC ỨNG DỤNG</span><h2>Trạng thái triển khai</h2><p>Phiên bản thực tế được đọc từ endpoint của từng ứng dụng, không suy đoán từ cấu hình.</p></div><span className="last-updated">Tự động làm mới mỗi 30 giây</span></div>
            <div className="application-grid">
              {applications?.data.map((application) => <ApplicationCard key={application.id} application={application} />)}
              {!applications && <><div className="skeleton-card" /><div className="skeleton-card" /></>}
            </div>
          </section>

          <section className="runtime-note">
            <div className="runtime-note__icon"><ServerIcon /></div>
            <div><span className="eyebrow">RANH GIỚI QUYỀN</span><h3>Control API chưa điều khiển Docker trực tiếp</h3><p>Trạng thái HTTP ở trên đã được kiểm tra thực tế. Trạng thái container và các thao tác start/stop/update sẽ do Deployment Runner có danh sách cho phép cung cấp ở bước kế tiếp.</p></div>
            <span className="runtime-note__tag">Runner chưa tích hợp</span>
          </section>

          <section className="section" id="activity">
            <div className="section-heading"><div><span className="eyebrow">KIỂM TOÁN</span><h2>Hoạt động gần đây</h2><p>Các lần đăng nhập thành công và thất bại được lưu trong SQLite.</p></div></div>
            <AuditTable events={auditEvents} />
          </section>

          <footer className="workspace-footer"><span>Mini PaaS · Mốc P0.2</span><span><CheckIcon /> Control API đang được bảo vệ bởi xác thực</span></footer>
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
