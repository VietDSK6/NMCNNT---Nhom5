import { type FormEvent, useEffect, useState } from "react";
import { AlertIcon, DeployIcon, ExternalIcon, HistoryIcon } from "../../icons";
import { formatDateTime } from "../../shared/format";
import { deploymentStatusLabels } from "../../shared/labels";
import type { DeploymentItem, TrustedSource } from "../../types";

export function GitDeploymentPanel({
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
