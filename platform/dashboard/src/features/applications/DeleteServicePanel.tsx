import { type FormEvent, useState } from "react";
import { AlertIcon } from "../../icons";
import type { ApplicationItem } from "../../types";

// Vùng nguy hiểm: xóa Web Service cần gõ lại slug để xác nhận.
export function DeleteServicePanel({ application, submitting, onDelete }: {
  readonly application: ApplicationItem;
  readonly submitting: boolean;
  readonly onDelete: (application: ApplicationItem) => void;
}) {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const confirmed = typed.trim() === application.slug;
  const busy = submitting || Boolean(application.activeOperation);

  function submit(event: FormEvent) {
    event.preventDefault();
    if (confirmed && !busy) onDelete(application);
  }

  return (
    <section className="danger-zone card" aria-labelledby="danger-zone-title">
      <div className="danger-zone__text">
        <span className="eyebrow">VÙNG NGUY HIỂM</span>
        <h2 id="danger-zone-title">Xóa Web Service</h2>
        <p>Gỡ container, image và toàn bộ lịch sử deployment, release, biến môi trường của {application.name}. Hành động này không thể hoàn tác.</p>
      </div>
      {!open ? (
        <button className="button button--danger" type="button" onClick={() => setOpen(true)}>Xóa Web Service</button>
      ) : (
        <form className="danger-zone__confirm" onSubmit={submit}>
          <label>
            <span>Gõ <strong className="mono">{application.slug}</strong> để xác nhận</span>
            <input value={typed} onChange={(event) => setTyped(event.target.value)} autoComplete="off" spellCheck={false} disabled={busy} />
          </label>
          <div className="danger-zone__actions">
            <button className="button button--secondary" type="button" onClick={() => { setOpen(false); setTyped(""); }} disabled={busy}>Hủy</button>
            <button className="button button--danger" type="submit" disabled={!confirmed || busy}><AlertIcon />{busy ? "Đang xóa…" : "Xóa vĩnh viễn"}</button>
          </div>
        </form>
      )}
    </section>
  );
}
