import { formatDateTime } from "../../shared/format";
import { operationActionLabels, operationStatusLabels } from "../../shared/labels";
import type { OperationItem } from "../../types";

export function OperationsTable({ operations }: { readonly operations: readonly OperationItem[] }) {
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
