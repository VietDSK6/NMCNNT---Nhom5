import { type FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { api } from "../../api";
import { AlertIcon, ShieldIcon } from "../../icons";
import type { ApplicationItem } from "../../types";

interface EnvironmentEditorRow {
  readonly id: string;
  readonly key: string;
  readonly value: string;
  readonly sensitive: boolean;
  readonly retainsStoredValue: boolean;
}

export function EnvironmentVariablesPanel({
  application,
  onSaved,
}: {
  readonly application: ApplicationItem;
  readonly onSaved: (count: number) => void;
}) {
  const [rows, setRows] = useState<readonly EnvironmentEditorRow[]>([]);
  const [maximumVariables, setMaximumVariables] = useState(20);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const rowSequence = useRef(0);

  const loadEnvironment = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.environment(application.id);
      setMaximumVariables(response.data.limits.maximumVariables);
      setRows(response.data.variables.map((variable, index) => ({
        id: `stored-${variable.key}-${index}`,
        key: variable.key,
        value: variable.value ?? "",
        sensitive: variable.sensitive,
        retainsStoredValue: variable.sensitive && variable.value === null,
      })));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Không thể đọc biến môi trường.");
    } finally {
      setLoading(false);
    }
  }, [application.id]);

  useEffect(() => {
    void loadEnvironment();
  }, [loadEnvironment]);

  function updateRow(id: string, patch: Partial<EnvironmentEditorRow>) {
    setRows((current) => current.map((row) => row.id === id ? { ...row, ...patch } : row));
  }

  function addRow() {
    rowSequence.current += 1;
    setRows((current) => [...current, {
      id: `new-${rowSequence.current}`,
      key: "",
      value: "",
      sensitive: false,
      retainsStoredValue: false,
    }]);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const keys = rows.map((row) => row.key.trim());
    const invalidKey = keys.find((key) => !/^[A-Z][A-Z0-9_]{0,63}$/.test(key));
    if (invalidKey !== undefined) {
      setError("Tên biến phải viết hoa, bắt đầu bằng chữ cái và chỉ chứa chữ cái, số hoặc dấu gạch dưới.");
      return;
    }
    if (new Set(keys).size !== keys.length) {
      setError("Mỗi tên biến chỉ được xuất hiện một lần.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      const response = await api.updateEnvironment(application.id, rows.map((row) => ({
        key: row.key.trim(),
        value: row.sensitive && row.retainsStoredValue && row.value === "" ? null : row.value,
        sensitive: row.sensitive,
      })));
      setMaximumVariables(response.data.limits.maximumVariables);
      setRows(response.data.variables.map((variable, index) => ({
        id: `stored-${variable.key}-${index}`,
        key: variable.key,
        value: variable.value ?? "",
        sensitive: variable.sensitive,
        retainsStoredValue: variable.sensitive && variable.value === null,
      })));
      onSaved(response.data.count);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Không thể áp dụng biến môi trường.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="environment-panel" aria-labelledby="environment-title">
      <div className="environment-panel__heading">
        <div>
          <span className="eyebrow">CẤU HÌNH KHI CHẠY</span>
          <h2 id="environment-title">Biến môi trường</h2>
          <p>Giá trị được mã hóa trong SQLite. Khi lưu, Runner tái tạo container để cấu hình có hiệu lực ngay.</p>
        </div>
        <span className="environment-count">{rows.length}/{maximumVariables} biến</span>
      </div>

      <div className="environment-security-note">
        <ShieldIcon />
        <div><strong>Giá trị nhạy cảm không được đọc lại</strong><span>Sau khi lưu, Dashboard chỉ cho biết biến đã tồn tại. Để thay đổi, nhập một giá trị mới.</span></div>
      </div>

      {loading ? (
        <div className="environment-loading"><i /><i /></div>
      ) : (
        <form onSubmit={submit}>
          <div className="environment-list">
            {rows.length === 0 ? (
              <div className="environment-empty"><strong>Chưa có biến môi trường tùy chỉnh</strong><span>Thêm biến để cấu hình hành vi của {application.name} mà không sửa image.</span></div>
            ) : rows.map((row) => (
              <div className="environment-row" key={row.id}>
                <label>
                  <span>Tên biến</span>
                  <input
                    className="mono"
                    value={row.key}
                    onChange={(event) => updateRow(row.id, { key: event.target.value.toUpperCase() })}
                    placeholder="APP_MESSAGE"
                    maxLength={64}
                    autoComplete="off"
                    spellCheck={false}
                    disabled={saving}
                    required
                  />
                </label>
                <label>
                  <span>Giá trị</span>
                  <input
                    type={row.sensitive ? "password" : "text"}
                    value={row.value}
                    onChange={(event) => updateRow(row.id, { value: event.target.value, retainsStoredValue: false })}
                    placeholder={row.retainsStoredValue ? "Đã lưu · để trống để giữ nguyên" : "Nhập giá trị"}
                    maxLength={2_048}
                    autoComplete="new-password"
                    spellCheck={false}
                    disabled={saving}
                  />
                </label>
                <label className="environment-sensitive">
                  <input
                    type="checkbox"
                    checked={row.sensitive}
                    onChange={(event) => updateRow(row.id, {
                      sensitive: event.target.checked,
                      retainsStoredValue: event.target.checked ? row.retainsStoredValue : false,
                    })}
                    disabled={saving}
                  />
                  <span>Nhạy cảm</span>
                </label>
                <button
                  className="environment-remove"
                  type="button"
                  onClick={() => setRows((current) => current.filter((item) => item.id !== row.id))}
                  disabled={saving}
                  aria-label={`Xóa biến ${row.key || "chưa đặt tên"}`}
                >Xóa</button>
              </div>
            ))}
          </div>

          {error && <div className="form-error" role="alert"><AlertIcon />{error}</div>}
          <div className="environment-actions">
            <button className="button button--secondary" type="button" onClick={addRow} disabled={saving || rows.length >= maximumVariables}>Thêm biến</button>
            <button className="button button--secondary" type="button" onClick={() => void loadEnvironment()} disabled={saving}>Hoàn tác thay đổi</button>
            <button className="button button--primary" disabled={saving}>{saving ? "Đang áp dụng…" : "Lưu và tái triển khai"}</button>
          </div>
        </form>
      )}
    </section>
  );
}
