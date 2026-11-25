import { useState } from "react";

// Sao chép URL tuyệt đối; báo thành công/thất bại ngay tại nút (clipboard cần HTTPS hoặc localhost).
export function CopyUrlButton({ route }: { readonly route: string }) {
  const [state, setState] = useState<"idle" | "done" | "failed">("idle");
  async function copy() {
    try {
      await navigator.clipboard.writeText(new URL(route, window.location.origin).href);
      setState("done");
    } catch {
      setState("failed");
    }
    window.setTimeout(() => setState("idle"), 2500);
  }
  return (
    <>
      <button type="button" className="button button--secondary" onClick={() => void copy()}>Sao chép</button>
      <span role="status" className={state === "failed" ? "field-error" : undefined}>
        {state === "done" ? " Đã sao chép URL." : state === "failed" ? " Không sao chép được, hãy chọn và sao chép thủ công." : ""}
      </span>
    </>
  );
}
