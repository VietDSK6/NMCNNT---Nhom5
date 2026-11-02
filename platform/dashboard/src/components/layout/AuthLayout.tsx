import type { ReactNode } from "react";

export function AuthLayout({ children }: { readonly children: ReactNode }) {
  return <main className="auth-layout">{children}</main>;
}
