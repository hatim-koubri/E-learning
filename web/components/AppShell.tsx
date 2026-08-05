"use client";

import Link from "next/link";
import {
  BookOpen,
  Bell,
  CalendarDays,
  GraduationCap,
  Flag,
  LayoutDashboard,
  LogOut,
  Menu,
  NotebookPen,
  ShieldCheck,
  UserRound,
  X,
} from "lucide-react";
import {ReactNode, useEffect, useRef, useState} from "react";
import {Brand} from "@/components/Brand";
import {ThemeToggle} from "@/components/ThemeToggle";
import {IconButton} from "@/components/ui";
import type {User} from "@/lib/api";

const roleLabels: Record<User["role"], string> = {
  ADMIN: "Administration",
  FORMATEUR: "Espace formateur",
  PARTICIPANT: "Espace participant",
};

const navByRole = {
  ADMIN: [
    {href: "/admin/formateurs", label: "Demandes formateurs", icon: ShieldCheck},
    {href: "/admin/avis", label: "Avis signalés", icon: Flag},
    {href: "/notifications", label: "Notifications", icon: Bell},
    {href: "/profile", label: "Mon profil", icon: UserRound},
  ],
  FORMATEUR: [
    {href: "/formateur/formations", label: "Mes formations", icon: GraduationCap},
    {href: "/formateur/classes", label: "Classes virtuelles", icon: CalendarDays},
    {href: "/formateur/engagement", label: "Engagement", icon: LayoutDashboard},
    {href: "/notifications", label: "Notifications", icon: Bell},
    {href: "/catalogue", label: "Voir le catalogue", icon: BookOpen},
    {href: "/profile", label: "Mon profil", icon: UserRound},
  ],
  PARTICIPANT: [
    {href: "/profile", label: "Tableau de bord", icon: LayoutDashboard},
    {href: "/catalogue", label: "Explorer les cours", icon: BookOpen},
    {href: "/participant/classes", label: "Mes classes", icon: CalendarDays},
    {href: "/participant/notes", label: "Notes et signets", icon: NotebookPen},
    {href: "/notifications", label: "Notifications", icon: Bell},
  ],
};

export function AppShell({
  role,
  children,
}: {
  role: User["role"];
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [pathname, setPathname] = useState("");
  const sidebarRef = useRef<HTMLElement>(null);

  useEffect(() => {
    let stored: User | null = null;
    try { stored = JSON.parse(localStorage.getItem("user") ?? "null") as User | null; } catch {}
    const session = stored;
    queueMicrotask(() => {setUser(session);setPathname(window.location.pathname);});
  }, []);

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const media = window.matchMedia("(max-width: 900px)");
    const update = () => {
      setMobile(media.matches);
      if (!media.matches) setOpen(false);
    };
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (!mobile || !open) return;
    const sidebar = sidebarRef.current;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    const focusableSelector = "button:not(:disabled), a[href], [tabindex]:not([tabindex='-1'])";
    document.body.style.overflow = "hidden";
    queueMicrotask(() => sidebar?.querySelector<HTMLElement>(focusableSelector)?.focus());
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        return;
      }
      if (event.key !== "Tab" || !sidebar) return;
      const focusable = Array.from(sidebar.querySelectorAll<HTMLElement>(focusableSelector));
      if (!focusable.length) return;
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", keyboard);
    return () => {
      window.removeEventListener("keydown", keyboard);
      document.body.style.overflow = previousOverflow;
      previous?.focus();
    };
  }, [mobile, open]);

  function signOut() {
    localStorage.removeItem("access_token");
    localStorage.removeItem("user");
    location.href = "/login";
  }

  const navigation = navByRole[role];
  return (
    <div className="app-shell">
      <aside
        aria-hidden={mobile && !open || undefined}
        aria-label={mobile && open ? `Menu ${roleLabels[role]}` : undefined}
        aria-modal={mobile && open || undefined}
        className={open ? "sidebar open" : "sidebar"}
        id="workspace-navigation"
        inert={mobile && !open}
        ref={sidebarRef}
        role={mobile && open ? "dialog" : undefined}
      >
        <div className="sidebar-top">
          <Brand />
          <IconButton label="Fermer le menu" className="sidebar-close" onClick={() => setOpen(false)}>
            <X size={20} />
          </IconButton>
        </div>
        <div className="workspace-label">{roleLabels[role]}</div>
        <nav className="sidebar-nav" aria-label={roleLabels[role]}>
          {navigation.map(({href, label, icon: Icon}) => {
            const active = href === "/profile" ? pathname === href : pathname.startsWith(href);
            return (
              <Link className={active ? "active" : ""} href={href} key={href} onClick={() => setOpen(false)}>
                <Icon aria-hidden="true" size={19} />
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="sidebar-user">
          <span className="avatar" aria-hidden="true">{user?.nom?.slice(0, 1).toUpperCase() || "U"}</span>
          <div><strong>{user?.nom || "Mon compte"}</strong><small>{user?.email || roleLabels[role]}</small></div>
          <IconButton label="Se déconnecter de la session" onClick={signOut}><LogOut size={18} /></IconButton>
        </div>
      </aside>
      {open && <button className="drawer-overlay" aria-hidden="true" tabIndex={-1} onClick={() => setOpen(false)} />}
      <div className="shell-main" aria-hidden={mobile && open || undefined} inert={mobile && open}>
        <header className="shell-header">
          <div className="shell-header-start">
            <IconButton label="Ouvrir le menu" className="mobile-menu" aria-controls="workspace-navigation" aria-expanded={open} onClick={() => setOpen(true)}>
              <Menu size={21} />
            </IconButton>
            <span>{roleLabels[role]}</span>
          </div>
          <ThemeToggle />
        </header>
        <main className="shell-content" id="contenu-principal">{children}</main>
      </div>
    </div>
  );
}
