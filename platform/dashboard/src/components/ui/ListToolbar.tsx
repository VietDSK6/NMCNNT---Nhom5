import { RefreshIcon, SearchIcon } from "../../icons";

export interface ToolbarFilter<T extends string> {
  readonly id: T;
  readonly label: string;
  readonly count: number;
}

// Thanh lọc dùng chung cho các trang danh sách: tab trạng thái, tìm kiếm, tổng số, làm mới.
export function ListToolbar<T extends string>({ filters, active, onFilter, query, onQuery, placeholder, total, refreshing, onRefresh }: {
  readonly filters: readonly ToolbarFilter<T>[];
  readonly active: T;
  readonly onFilter: (id: T) => void;
  readonly query: string;
  readonly onQuery: (value: string) => void;
  readonly placeholder: string;
  readonly total: number;
  readonly refreshing: boolean;
  readonly onRefresh: () => void;
}) {
  return (
    <section className="card list-toolbar" aria-label="Bộ lọc">
      <div className="filter-tabs" role="group" aria-label="Lọc theo trạng thái">
        {filters.map((item) => (
          <button key={item.id} type="button" aria-pressed={active === item.id} onClick={() => onFilter(item.id)}>
            {item.label} ({item.count})
          </button>
        ))}
      </div>
      <div className="list-toolbar__tools">
        <label className="search-field">
          <SearchIcon />
          <input type="search" value={query} onChange={(event) => onQuery(event.target.value)} placeholder={placeholder} aria-label={placeholder} />
        </label>
        <span className="total-chip">Tổng số: <strong>{total}</strong></span>
        <button className="button button--secondary" onClick={onRefresh} disabled={refreshing}><RefreshIcon className={refreshing ? "is-spinning" : ""} />Làm mới</button>
      </div>
    </section>
  );
}
