import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

function IconBase({ children, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      {children}
    </svg>
  );
}

export const GridIcon = (props: IconProps) => <IconBase {...props}><rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/></IconBase>;
export const BoxIcon = (props: IconProps) => <IconBase {...props}><path d="m4 7 8-4 8 4-8 4-8-4Z"/><path d="m4 7 8 4 8-4v10l-8 4-8-4V7Z"/><path d="M12 11v10"/></IconBase>;
export const ActivityIcon = (props: IconProps) => <IconBase {...props}><path d="M3 12h4l2.3-6 4.1 12 2.2-6H21"/></IconBase>;
export const HistoryIcon = (props: IconProps) => <IconBase {...props}><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l3 2"/></IconBase>;
export const RefreshIcon = (props: IconProps) => <IconBase {...props}><path d="M20 6v5h-5"/><path d="M4 18v-5h5"/><path d="M18.5 9A7 7 0 0 0 6 6.5L4 11M5.5 15A7 7 0 0 0 18 17.5l2-4.5"/></IconBase>;
export const ExternalIcon = (props: IconProps) => <IconBase {...props}><path d="M15 3h6v6"/><path d="m10 14 11-11"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></IconBase>;
export const LogOutIcon = (props: IconProps) => <IconBase {...props}><path d="M10 17l5-5-5-5"/><path d="M15 12H3"/><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/></IconBase>;
export const ShieldIcon = (props: IconProps) => <IconBase {...props}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/></IconBase>;
export const ServerIcon = (props: IconProps) => <IconBase {...props}><rect x="3" y="4" width="18" height="6" rx="2"/><rect x="3" y="14" width="18" height="6" rx="2"/><path d="M7 7h.01M7 17h.01"/></IconBase>;
export const ChevronIcon = (props: IconProps) => <IconBase {...props}><path d="m9 18 6-6-6-6"/></IconBase>;
export const CheckIcon = (props: IconProps) => <IconBase {...props}><path d="m5 12 4 4L19 6"/></IconBase>;
export const AlertIcon = (props: IconProps) => <IconBase {...props}><path d="M10.3 3.7 2.5 17a2 2 0 0 0 1.7 3h15.6a2 2 0 0 0 1.7-3L13.7 3.7a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4M12 17h.01"/></IconBase>;
export const PlayIcon = (props: IconProps) => <IconBase {...props}><path d="m7 4 12 8-12 8V4Z"/></IconBase>;
export const StopIcon = (props: IconProps) => <IconBase {...props}><rect x="5" y="5" width="14" height="14" rx="2"/></IconBase>;
export const DeployIcon = (props: IconProps) => <IconBase {...props}><path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/></IconBase>;
export const EyeIcon = (props: IconProps) => <IconBase {...props}><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></IconBase>;
export const EyeOffIcon = (props: IconProps) => <IconBase {...props}><path d="M9.9 5.2A10 10 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3.2 3.9M6.1 6.1A17 17 0 0 0 2 12s3.6 7 10 7a9.7 9.7 0 0 0 4.2-.9"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2M3 3l18 18"/></IconBase>;
export const UserIcon = (props: IconProps) => <IconBase {...props}><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></IconBase>;
export const LockIcon = (props: IconProps) => <IconBase {...props}><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></IconBase>;
export const GitIcon = (props: IconProps) => <IconBase {...props}><circle cx="6" cy="6" r="2.5"/><circle cx="6" cy="18" r="2.5"/><circle cx="18" cy="9" r="2.5"/><path d="M6 8.5v7M18 11.5c0 4-6 2-11 5"/></IconBase>;
export const MenuIcon = (props: IconProps) => <IconBase {...props}><path d="M4 6h16M4 12h16M4 18h16"/></IconBase>;
export const ChartIcon = (props: IconProps) => <IconBase {...props}><path d="M4 20V10M10 20V4M16 20v-8M22 20H2"/></IconBase>;
export const SearchIcon = (props: IconProps) => <IconBase {...props}><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></IconBase>;
