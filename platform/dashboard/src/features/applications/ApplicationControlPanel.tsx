import { DeployIcon, PlayIcon, RefreshIcon, StopIcon } from "../../icons";
import { operationActionLabels, operationStatusLabels } from "../../shared/labels";
import type { ApplicationItem, OperationAction } from "../../types";
import { RuntimeBadge, StatusBadge } from "./StatusBadges";

export function ApplicationControlPanel({
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
