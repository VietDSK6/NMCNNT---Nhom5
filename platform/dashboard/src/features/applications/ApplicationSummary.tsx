import { AppLink } from "../../app/routing";
import { BoxIcon, ChevronIcon, DeployIcon, ExternalIcon } from "../../icons";
import { formatDateTime } from "../../shared/format";
import { deploymentStatusLabels } from "../../shared/labels";
import type { ApplicationItem, DeploymentItem } from "../../types";
import { RuntimeBadge, StatusBadge } from "./StatusBadges";

export function ApplicationDirectory({ applications }: { readonly applications: readonly ApplicationItem[] }) {
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

export function ApplicationIdentity({ application }: { readonly application: ApplicationItem }) {
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

export function ApplicationFacts({ application, latestDeployment }: { readonly application: ApplicationItem; readonly latestDeployment?: DeploymentItem }) {
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

export function DeploymentSnapshot({ deployments }: { readonly deployments: readonly DeploymentItem[] }) {
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
