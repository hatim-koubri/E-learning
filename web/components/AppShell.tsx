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
import {ReactNode, useEffect, useState} from "react";
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
  const [user, setUser] = useState<User | null>(null);
  const [pathname, setPathname] = useState("");

  useEffect(() => {
    let stored: User | null = null;
    try { stored = JSON.parse(localStorage.getItem("user") ?? "null") as User | null; } catch {}
    const session = stored;
    queueMicrotask(() => {setUser(session);setPathname(window.location.pathname);});
  }, []);

  function signOut() {
    localStorage.removeItem("access_token");
    localStorage.removeItem("user");
    location.href = "/login";
  }

  const navigation = navByRole[role];
  return (
    <div className="app-shell">
      <aside className={open ? "sidebar open" : "sidebar"}>
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
      {open && <button className="drawer-overlay" aria-label="Fermer le menu" onClick={() => setOpen(false)} />}
      <div className="shell-main">
        <header className="shell-header">
          <div className="shell-header-start">
            <IconButton label="Ouvrir le menu" className="mobile-menu" onClick={() => setOpen(true)}>
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
