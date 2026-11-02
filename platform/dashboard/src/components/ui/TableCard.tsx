import type { ReactNode } from "react";

export function TableCard({ footer, children }: { readonly footer: string; readonly children: ReactNode }) {
  return (
    <section className="card list-table">
      <div className="table-scroll">{children}</div>
      <div className="list-table__footer">{footer}</div>
    </section>
  );
}
