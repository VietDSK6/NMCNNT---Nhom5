import { type FormEvent, useState } from "react";
import { api } from "../../api";
import { ActivityIcon, AlertIcon, BoxIcon, ChevronIcon, ShieldIcon } from "../../icons";
import type { UserSession } from "../../types";

export function LoadingScreen() {
  return (
    <main className="boot-screen" aria-live="polite">
      <div className="brand-mark brand-mark--large"><span /><span /><span /></div>
      <p>Đang kết nối Control API…</p>
    </main>
  );
}

export function LoginScreen({ onAuthenticated }: { readonly onAuthenticated: (session: UserSession) => void }) {
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
