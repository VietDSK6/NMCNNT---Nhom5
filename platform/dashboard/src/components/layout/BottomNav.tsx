import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { AppLink } from "../../app/routing";
import { shellStrings } from "../../config/shell";
import { isNavItemActive, navigation } from "../../config/navigation";
import { ExternalIcon, GridIcon, LogOutIcon } from "../../icons";
import { spring } from "../../motion/constants";

const allItems = navigation.flatMap((group) => group.items);
const primaryItems = allItems.filter((item) => item.inBottomNav);
const moreItems = allItems.filter((item) => !item.inBottomNav);

export function BottomNav({ pathname, onLogout }: { readonly pathname: string; readonly onLogout: () => void }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      {open && <div className="sheet-overlay" onClick={() => setOpen(false)} aria-hidden="true" />}
      <AnimatePresence>
        {open && (
          <motion.div
            className="more-sheet glass-strong"
            role="dialog"
            aria-label={shellStrings.more}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={spring.snappy}
          >
            {moreItems.map((item) => {
              const Icon = item.icon;
              return item.external ? (
                <a key={item.id} className="nav-item" href={item.to} target="_blank" rel="noreferrer"><Icon /><span className="nav-item__label">{item.label}</span><ExternalIcon /></a>
              ) : (
                <AppLink key={item.id} className="nav-item" to={item.to} active={isNavItemActive(item, pathname)}><Icon /><span className="nav-item__label">{item.label}</span></AppLink>
              );
            })}
            <button className="nav-item nav-item--button" onClick={onLogout}><LogOutIcon /><span className="nav-item__label">{shellStrings.logout}</span></button>
          </motion.div>
        )}
      </AnimatePresence>
      <nav className="bottom-nav glass-strong" aria-label={shellStrings.bottomNav} onClick={(event) => { if ((event.target as Element).closest("a")) setOpen(false); }}>
        {primaryItems.map((item) => {
          const Icon = item.icon;
          const active = isNavItemActive(item, pathname);
          return (
            <AppLink key={item.id} className="bottom-nav__item" to={item.to} active={active}>
              {active && <motion.span layoutId="bottom-indicator" className="bottom-nav__indicator" transition={spring.snappy} />}
              <Icon /><span>{item.label}</span>
            </AppLink>
          );
        })}
        <button className="bottom-nav__item" aria-expanded={open} onClick={() => setOpen((current) => !current)}><GridIcon /><span>{shellStrings.more}</span></button>
      </nav>
    </>
  );
}
