"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";

/**
 * Opens the sidebar on a screen too narrow to keep it.
 *
 * THE BUG THIS FIXES. The rail is `hidden … lg:flex`, so below 1024px it is
 * display:none — and nothing else ever offered a way to reach it. Every one of
 * its sixty-odd links was still in the DOM and none of them was reachable: on a
 * phone or a tablet the application had no navigation whatsoever. You could
 * open a page from a link on another page, and that was all. For a product used
 * by field officers on tablets that is not a polish item.
 *
 * The state lives in a context rather than in either component because the
 * trigger belongs in the top bar and the drawer is the sidebar — two siblings
 * under the same server layout, with no parent client component to hold it.
 */

const MobileNavContext = React.createContext<{
  open: boolean;
  setOpen: (open: boolean) => void;
} | null>(null);

export function MobileNavProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const pathname = usePathname();

  // Navigating is what the drawer is for, so arriving somewhere closes it.
  // Keyed on the pathname rather than on the link's click handler so it also
  // covers the back button and any programmatic push.
  const [seen, setSeen] = React.useState(pathname);
  if (seen !== pathname) {
    setSeen(pathname);
    if (open) setOpen(false);
  }

  // Escape closes it, and the page behind it does not scroll while it is open.
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open]);

  const value = React.useMemo(() => ({ open, setOpen }), [open]);
  return <MobileNavContext.Provider value={value}>{children}</MobileNavContext.Provider>;
}

export function useMobileNav() {
  const ctx = React.useContext(MobileNavContext);
  if (!ctx) throw new Error("useMobileNav must be used inside MobileNavProvider");
  return ctx;
}

/** The hamburger. Hidden once the rail itself is on screen. */
export function MobileNavTrigger() {
  const { open, setOpen } = useMobileNav();
  return (
    <button
      type="button"
      aria-label="Open navigation menu"
      aria-expanded={open}
      aria-controls="legacy-sidebar"
      onClick={() => setOpen(true)}
      className="-ml-1 shrink-0 rounded p-1.5 transition-opacity hover:opacity-60 lg:hidden"
      style={{ color: "var(--lg-icon-action)" }}
    >
      <Menu className="size-[22px]" strokeWidth={1.6} aria-hidden />
    </button>
  );
}

/** The dimmed backdrop behind the open drawer. Clicking it closes. */
export function MobileNavBackdrop() {
  const { open, setOpen } = useMobileNav();
  if (!open) return null;
  return (
    <div
      onClick={() => setOpen(false)}
      aria-hidden
      className="fixed inset-0 z-40 bg-black/40 lg:hidden"
    />
  );
}
