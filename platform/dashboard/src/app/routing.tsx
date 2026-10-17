import { type MouseEvent as ReactMouseEvent, type ReactNode, useEffect, useState } from "react";

export type ApplicationTab = "overview" | "deployments" | "environment" | "observability";

export type DashboardRoute =
  | { readonly kind: "overview" }
  | { readonly kind: "applications" }
  | { readonly kind: "create-service" }
  | { readonly kind: "application"; readonly appId: string; readonly tab: ApplicationTab }
  | { readonly kind: "deployments" }
  | { readonly kind: "operations" }
  | { readonly kind: "audit" }
  | { readonly kind: "observability" }
  | { readonly kind: "not-found" };

export function normalizePathname(pathname: string): string {
  if (!pathname || pathname === "/dashboard") return "/";
  return pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
}

export function resolveRoute(pathname: string): DashboardRoute {
  const normalized = normalizePathname(pathname);
  if (normalized === "/") return { kind: "overview" };
  if (normalized === "/applications") return { kind: "applications" };
  if (normalized === "/applications/new") return { kind: "create-service" };
  if (normalized === "/deployments") return { kind: "deployments" };
  if (normalized === "/operations") return { kind: "operations" };
  if (normalized === "/audit") return { kind: "audit" };
  if (normalized === "/observability") return { kind: "observability" };

  const applicationMatch = normalized.match(/^\/applications\/([^/]+)(?:\/(deployments|environment|observability))?$/);
  if (applicationMatch) {
    let appId: string;
    try {
      appId = decodeURIComponent(applicationMatch[1] ?? "");
    } catch {
      return { kind: "not-found" };
    }
    return {
      kind: "application",
      appId,
      tab: (applicationMatch[2] as ApplicationTab | undefined) ?? "overview",
    };
  }
  return { kind: "not-found" };
}

export function useDashboardPath(): string {
  const [pathname, setPathname] = useState(() => normalizePathname(window.location.pathname));
  useEffect(() => {
    const update = () => setPathname(normalizePathname(window.location.pathname));
    window.addEventListener("popstate", update);
    return () => window.removeEventListener("popstate", update);
  }, []);
  return pathname;
}

export function AppLink({
  to,
  children,
  className,
  active = false,
}: {
  readonly to: string;
  readonly children: ReactNode;
  readonly className?: string;
  readonly active?: boolean;
}) {
  function navigate(event: ReactMouseEvent<HTMLAnchorElement>) {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    if (normalizePathname(window.location.pathname) === normalizePathname(to)) return;
    window.history.pushState({}, "", to);
    window.dispatchEvent(new PopStateEvent("popstate"));
    window.scrollTo({ top: 0 });
  }

  return <a href={to} className={className} aria-current={active ? "page" : undefined} onClick={navigate}>{children}</a>;
}
