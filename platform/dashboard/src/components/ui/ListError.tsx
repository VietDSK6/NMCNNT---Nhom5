import { AlertIcon } from "../../icons";

export function ListError({ message, onRetry }: { readonly message: string; readonly onRetry: () => void }) {
  return (
    <div className="inline-state inline-state--error card" role="alert">
      <AlertIcon /><span><strong>Chưa tải được dữ liệu</strong>{message}</span>
      <button className="button button--secondary" onClick={onRetry}>Thử lại</button>
    </div>
  );
}
