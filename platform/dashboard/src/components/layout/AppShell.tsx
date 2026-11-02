import type { ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { shellStrings } from "../../config/shell";
import { CheckIcon } from "../../icons";
import { useSidebarCollapsed } from "../../hooks/useSidebarCollapsed";
import { duration, easing } from "../../motion/constants";
import { BottomNav } from "./BottomNav";
import { Header, type Crumb } from "./Header";
import { Sidebar } from "./Sidebar";

export function AppShell({ pathname, applicationCount, crumbs, title, refreshing, username, notices, children, onRefresh, onLogout }: {
  readonly pathname: string;
  readonly applicationCount: number | undefined;
  readonly crumbs: readonly Crumb[];
  readonly title: string;
  readonly refreshing: boolean;
  readonly username: string;
  readonly notices: ReactNode;
  readonly children: ReactNode;
  readonly onRefresh: () => void;
  readonly onLogout: () => void;
}) {
  const { collapsed, toggle } = useSidebarCollapsed();

  return (
    <div className="app-shell" data-collapsed={collapsed || undefined}>
      <a className="skip-link" href="#main-content">{shellStrings.skipLink}</a>
      <Sidebar pathname={pathname} applicationCount={applicationCount} onLogout={onLogout} />
      <main className="workspace" id="main-content">
        <Header crumbs={crumbs} title={title} refreshing={refreshing} username={username} sidebarCollapsed={collapsed} onToggleSidebar={toggle} onRefresh={onRefresh} onLogout={onLogout} />
        <div className="workspace-content">
          {notices}
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: duration.fast, ease: easing.out }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
          <footer className="workspace-footer"><span>{shellStrings.footerLeft}</span><span><CheckIcon /> {shellStrings.footerRight}</span></footer>
        </div>
      </main>
      <BottomNav pathname={pathname} onLogout={onLogout} />
    </div>
  );
}
