import { useState } from "react";
import { AlertIcon, HistoryIcon } from "../../icons";
import { formatDateTime } from "../../shared/format";
import { releaseOriginLabels } from "../../shared/labels";
import type { ApplicationItem, ReleaseItem } from "../../types";

export function ReleaseHistoryPanel({
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
