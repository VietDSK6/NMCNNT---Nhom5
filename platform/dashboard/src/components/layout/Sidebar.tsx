import { motion } from "motion/react";
import { AppLink } from "../../app/routing";
import { shellStrings } from "../../config/shell";
import { isNavItemActive, type NavItem, navigation } from "../../config/navigation";
import { ExternalIcon, LogOutIcon } from "../../icons";
import { spring } from "../../motion/constants";
import { BrandMark } from "../ui/BrandMark";

function SidebarItem({ item, pathname, count }: { readonly item: NavItem; readonly pathname: string; readonly count?: number }) {
  const active = isNavItemActive(item, pathname);
  const Icon = item.icon;
  const content = (
    <>
      {active && <motion.span layoutId="nav-indicator" className="nav-indicator" transition={spring.snappy} />}
      <Icon />
      <span className="nav-item__label">{item.label}</span>
      {item.external && <ExternalIcon className="nav-item__external" />}
      {item.showCount && count !== undefined && <span className="nav-count">{count}</span>}
    </>
  );

  if (item.external) {
    return <a className="nav-item" href={item.to} target="_blank" rel="noreferrer" title={item.label}>{content}</a>;
  }
  return <AppLink className="nav-item" to={item.to} active={active} title={item.label}>{content}</AppLink>;
}

export function Sidebar({ pathname, applicationCount, onLogout }: {
  readonly pathname: string;
  readonly applicationCount: number | undefined;
  readonly onLogout: () => void;
}) {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <BrandMark />
        <div className="sidebar-brand__text"><strong>{shellStrings.brandName}</strong><small>{shellStrings.brandSub}</small></div>
      </div>
      <div className="sidebar__panel">
        <nav aria-label={shellStrings.mainNav}>
          {navigation.map((group) => (
            <div className="nav-group" key={group.label}>
              <span className="nav-label">{group.label}</span>
              {group.items.map((item) => <SidebarItem key={item.id} item={item} pathname={pathname} count={applicationCount} />)}
            </div>
          ))}
        </nav>
        <div className="sidebar-footer">
          <button className="sidebar-logout" onClick={onLogout} title={shellStrings.logoutHint}><LogOutIcon /><span className="nav-item__label">{shellStrings.logout}</span></button>
        </div>
      </div>
    </aside>
  );
}
