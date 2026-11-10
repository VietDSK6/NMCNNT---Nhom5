import { useEffect, useRef, useState } from "react";

const fallbackMilliseconds = 1_200;

// Báo true một lần khi phần tử vào khung nhìn. Có đường lui theo thời gian để số liệu và biểu đồ
// không bị kẹt ở trạng thái rỗng khi IntersectionObserver không phát tín hiệu.
export function useInView<T extends Element>(): { ref: React.RefObject<T | null>; inView: boolean } {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element || inView) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) setInView(true);
    }, { threshold: 0.1 });
    observer.observe(element);
    const fallback = window.setTimeout(() => setInView(true), fallbackMilliseconds);
    return () => {
      observer.disconnect();
      window.clearTimeout(fallback);
    };
  }, [inView]);

  return { ref, inView };
}
