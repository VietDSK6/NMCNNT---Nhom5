import { useCallback, useState } from "react";

export type Theme = "light" | "dark";

export function useTheme(): { theme: Theme; toggle: () => void } {
  const [theme, setTheme] = useState<Theme>(() => (document.documentElement.dataset.theme === "dark" ? "dark" : "light"));

  const toggle = useCallback(() => {
    setTheme((current) => {
      const next: Theme = current === "dark" ? "light" : "dark";
      document.documentElement.dataset.theme = next;
      try { localStorage.setItem("theme", next); } catch { /* lưu lựa chọn là tùy chọn */ }
      return next;
    });
  }, []);

  return { theme, toggle };
}
