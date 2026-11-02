import { useEffect } from "react";

export type AuthAmbience = "typing" | "submit" | "success" | "error";

// Đặt trạng thái môi trường lên <html> để lớp nền (CSS) phản ứng mà không cần re-render.
export function useAuthAmbience(mode: AuthAmbience | undefined) {
  useEffect(() => {
    const root = document.documentElement;
    if (mode) root.dataset.auth = mode;
    else delete root.dataset.auth;
  }, [mode]);

  useEffect(() => () => { delete document.documentElement.dataset.auth; }, []);
}
