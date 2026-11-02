import { AppLink } from "../../app/routing";
import { AlertIcon, CheckIcon, HistoryIcon } from "../../icons";
import { formatDateTime } from "../../shared/format";
import { actionLabels } from "../../shared/labels";
import type { AuditEvent } from "../../types";

const visibleEvents = 4;

export function AuditFeed({ events }: { readonly events: readonly AuditEvent[] }) {
  return (
    <section className="card" aria-label="Bảng tin quản trị">
      <div className="card__head"><h2>Bảng tin quản trị</h2><AppLink to="/audit">Xem tất cả</AppLink></div>
      {events.length === 0 ? (
        <div className="panel-empty"><HistoryIcon /><div><strong>Chưa có hoạt động</strong></div></div>
      ) : (
        <ul className="audit-list card__body">
          {events.slice(0, visibleEvents).map((event) => (
            <li key={event.id} data-outcome={event.outcome}>
              <span className="audit-list__icon">{event.outcome === "succeeded" ? <CheckIcon /> : <AlertIcon />}</span>
              <div>
                <strong>{actionLabels[event.action] || event.action}</strong>
                <small>{event.actorUsername || "Hệ thống"} · {formatDateTime(event.createdAt)}</small>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
