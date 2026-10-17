import { type FormEvent, useState } from "react";
import { AppLink } from "../../app/routing";
import { BoxIcon, DeployIcon, ShieldIcon } from "../../icons";
import type { CreateServiceInput } from "../../types";

export function CreateServiceForm({
  submitting,
  onCreate,
}: {
  readonly submitting: boolean;
  readonly onCreate: (input: CreateServiceInput) => void;
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
    <form className="new-service-form" onSubmit={submit} aria-labelledby="new-service-form-title">
      <section className="new-service-form__section">
        <div className="new-service-form__heading">
          <div><span className="eyebrow">THÔNG TIN DỊCH VỤ</span><h2 id="new-service-form-title">Đặt tên và địa chỉ truy cập</h2><p>Slug được dùng làm tên container và tên miền con của dịch vụ.</p></div>
          <span className="new-service-form__step">01</span>
        </div>
        <div className="new-service-form__grid">
          <label><span>Tên dịch vụ</span><input required minLength={2} maxLength={80} value={name} onChange={(event) => setName(event.target.value)} placeholder="Website giới thiệu" /></label>
          <label><span>Slug</span><input required maxLength={63} value={slug} onChange={(event) => setSlug(event.target.value.toLowerCase())} placeholder="website-gioi-thieu" aria-invalid={Boolean(validationError) || undefined} /><small>URL dự kiến: https://{slug || "slug"}.ai2p.id.vn</small></label>
        </div>
      </section>

      <section className="new-service-form__section">
        <div className="new-service-form__heading">
          <div><span className="eyebrow">MÃ NGUỒN</span><h2>Kết nối repository GitHub</h2><p>Mini PaaS lấy nhánh main và build Dockerfile trong thư mục đã chọn.</p></div>
          <span className="new-service-form__step">02</span>
        </div>
        <div className="new-service-form__grid new-service-form__grid--source">
          <label className="new-service-form__repository"><span>Repository GitHub công khai</span><input required value={repositoryUrl} onChange={(event) => setRepositoryUrl(event.target.value)} placeholder="https://github.com/VietDSK6/ten-repository" aria-invalid={Boolean(validationError) || undefined} /></label>
          <label><span>Nhánh</span><input value="main" readOnly aria-readonly="true" /></label>
          <label><span>Build context</span><input required value={buildContext} onChange={(event) => setBuildContext(event.target.value)} placeholder="." /><small>Dùng <strong>.</strong> nếu Dockerfile ở thư mục gốc.</small></label>
        </div>
      </section>

      <div className="new-service-form__actions">
        <div>{validationError && <span className="field-error" role="alert">{validationError}</span>}</div>
        <AppLink className="button button--secondary" to="/applications">Quay lại danh sách</AppLink>
        <button className="button button--primary" type="submit" disabled={submitting}><DeployIcon />{submitting ? "Đang kiểm tra và triển khai…" : "Tạo và triển khai"}</button>
      </div>
    </form>
  );
}

export function CreateServiceGuide() {
  return (
    <aside className="new-service-guide" aria-label="Điều kiện triển khai Web Service">
      <span className="new-service-guide__label"><ShieldIcon />PHẠM VI MVP</span>
      <h2>Repository cần chuẩn bị</h2>
      <ol>
        <li><span>01</span><div><strong>GitHub công khai</strong><p>Repository thuộc owner đã được Mini PaaS cho phép.</p></div></li>
        <li><span>02</span><div><strong>Nhánh main</strong><p>Commit mới nhất của nhánh này sẽ được build đầu tiên.</p></div></li>
        <li><span>03</span><div><strong>Dockerfile hợp lệ</strong><p>Đặt tại gốc build context đã nhập trong biểu mẫu.</p></div></li>
        <li><span>04</span><div><strong>Cổng 3000 và /health</strong><p>Ứng dụng phải lắng nghe cổng 3000 và trả health HTTP.</p></div></li>
      </ol>
      <div className="new-service-guide__result"><BoxIcon /><div><strong>Sau khi tạo</strong><p>Hệ thống cấp image, container, lịch sử deployment và URL <code>slug.ai2p.id.vn</code>.</p></div></div>
    </aside>
  );
}
