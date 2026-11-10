import { useCallback, useState } from "react";

const storageKey = "sidebar-collapsed";
const compactBreakpoint = 1280;

export function useSidebarCollapsed(): { collapsed: boolean; toggle: () => void } {
  const [collapsed, setCollapsed] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved !== null) return saved === "1";
    } catch { /* đọc lựa chọn đã lưu là tùy chọn */ }
    return window.innerWidth < compactBreakpoint;
  });

  const toggle = useCallback(() => {
    setCollapsed((current) => {
      try { localStorage.setItem(storageKey, current ? "0" : "1"); } catch { /* lưu lựa chọn là tùy chọn */ }
      return !current;
    });
  }, []);

  return { collapsed, toggle };
}
