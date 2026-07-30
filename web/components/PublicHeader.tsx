"use client";

import Link from "next/link";
import {Menu, X} from "lucide-react";
import {useEffect, useState} from "react";
import {Brand} from "@/components/Brand";
import {ThemeToggle} from "@/components/ThemeToggle";
import type {User} from "@/lib/api";

function dashboardHref(role: User["role"]) {
  if (role === "ADMIN") return "/admin/formateurs";
  if (role === "FORMATEUR") return "/formateur/formations";
  return "/profile";
}

export function PublicHeader() {
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("user") ?? "null") as User | null;
      queueMicrotask(() => setUser(stored));
    } catch {
      queueMicrotask(() => setUser(null));
    }
  }, []);

  return (
    <header className="public-header">
      <div className="container header-inner">
        <Brand />
        <nav className={open ? "public-nav open" : "public-nav"} aria-label="Navigation principale">
          <Link href="/" onClick={() => setOpen(false)}>Accueil</Link>
          <Link href="/catalogue" onClick={() => setOpen(false)}>Catalogue</Link>
          <Link href="/#fonctionnement" onClick={() => setOpen(false)}>Fonctionnement</Link>
          <Link href="/register/formateur" onClick={() => setOpen(false)}>Devenir formateur</Link>
          <div className="mobile-nav-actions">
            {user ? (
              <Link className="btn btn-primary" href={dashboardHref(user.role)}>Mon espace</Link>
            ) : (
              <>
                <Link className="btn btn-ghost" href="/login">Connexion</Link>
                <Link className="btn btn-primary" href="/register/participant">S’inscrire</Link>
              </>
            )}
          </div>
        </nav>
        <div className="header-actions">
          <ThemeToggle />
          {user ? (
            <Link className="btn btn-primary desktop-action" href={dashboardHref(user.role)}>Mon espace</Link>
          ) : (
            <>
              <Link className="btn btn-ghost desktop-action" href="/login">Connexion</Link>
              <Link className="btn btn-primary desktop-action" href="/register/participant">S’inscrire</Link>
            </>
          )}
          <button
            className="menu-toggle"
            aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
            aria-expanded={open}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>
    </header>
  );
}
