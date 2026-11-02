import { useEffect, useRef, useState } from "react";
import { AppLink } from "../../app/routing";
import { shellStrings } from "../../config/shell";
import { ChevronIcon, LogOutIcon, MenuIcon, RefreshIcon } from "../../icons";
import { ThemeToggle } from "./ThemeToggle";

export interface Crumb {
  readonly label: string;
  readonly to?: string;
}

function UserMenu({ username, onLogout }: { readonly username: string; readonly onLogout: () => void }) {
  const [open, setOpen] = useState(false);
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (event: Event) => {
      if (event instanceof KeyboardEvent ? event.key === "Escape" : !container.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", close);
    return () => { document.removeEventListener("pointerdown", close); document.removeEventListener("keydown", close); };
  }, [open]);

  return (
    <div className="user-menu" ref={container}>
      <button className="profile" aria-haspopup="menu" aria-expanded={open} aria-label={shellStrings.userMenu} onClick={() => setOpen((current) => !current)}>
        <span className="profile__avatar">{username.slice(0, 1).toUpperCase()}</span>
        <span className="profile__text"><strong>{username}</strong><small>{shellStrings.role}</small></span>
      </button>
      {open && (
        <div className="user-menu__dropdown glass-strong" role="menu">
          <button role="menuitem" onClick={onLogout}><LogOutIcon />{shellStrings.logout}</button>
        </div>
      )}
    </div>
  );
}

export function Header({ crumbs, title, refreshing, username, sidebarCollapsed, onToggleSidebar, onRefresh, onLogout }: {
  readonly crumbs: readonly Crumb[];
  readonly title: string;
  readonly refreshing: boolean;
  readonly username: string;
  readonly sidebarCollapsed: boolean;
  readonly onToggleSidebar: () => void;
  readonly onRefresh: () => void;
  readonly onLogout: () => void;
}) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 8);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

  return (
    <header className="topbar" data-scrolled={scrolled || undefined}>
      <button className="icon-button sidebar-toggle" onClick={onToggleSidebar} aria-expanded={!sidebarCollapsed} aria-label={sidebarCollapsed ? shellStrings.expandSidebar : shellStrings.collapseSidebar}><MenuIcon /></button>
      <div className="topbar__title">
        <nav className="breadcrumb" aria-label="Đường dẫn">
          {crumbs.map((crumb, index) => (
            <span key={crumb.label}>
              {index > 0 && <ChevronIcon />}
              {crumb.to ? <AppLink to={crumb.to}>{crumb.label}</AppLink> : crumb.label}
            </span>
          ))}
        </nav>
        <h1 key={title}>{title}</h1>
      </div>
      <div className="topbar-actions">
        <button className="button button--secondary" onClick={onRefresh} disabled={refreshing}>
          <RefreshIcon className={refreshing ? "is-spinning" : ""} /><span>{refreshing ? shellStrings.refreshing : shellStrings.refresh}</span>
        </button>
        <ThemeToggle />
        <UserMenu username={username} onLogout={onLogout} />
      </div>
    </header>
  );
}
