import { useEffect } from "react";
import { motion } from "motion/react";
import { AlertIcon } from "../../icons";
import { spring } from "../../motion/constants";

export function Toast({
  message,
  closeLabel,
  actionLabel,
  onAction,
  onClose,
}: {
  readonly message: string;
  readonly closeLabel: string;
  readonly actionLabel?: string;
  readonly onAction?: () => void;
  readonly onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <motion.div
      className="toast glass-strong"
      role="alert"
      initial={{ opacity: 0, y: -24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -24 }}
      transition={spring.snappy}
    >
      <AlertIcon />
      <span>{message}</span>
      {actionLabel && onAction && <button type="button" className="toast__action" onClick={onAction}>{actionLabel}</button>}
      <button type="button" className="toast__close" aria-label={closeLabel} onClick={onClose}>×</button>
    </motion.div>
  );
}
