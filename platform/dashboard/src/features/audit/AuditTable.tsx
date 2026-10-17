import { formatDateTime } from "../../shared/format";
import { actionLabels } from "../../shared/labels";
import type { AuditEvent } from "../../types";

export function AuditTable({ events }: { readonly events: readonly AuditEvent[] }) {
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
