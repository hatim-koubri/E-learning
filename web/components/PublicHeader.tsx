"use client";

import Link from "next/link";
import {Menu, X} from "lucide-react";
import {useEffect, useRef, useState} from "react";
import {Brand} from "@/components/Brand";
import {useResolvedSession} from "@/components/GuestOnly";
import {ThemeToggle} from "@/components/ThemeToggle";
import type {User} from "@/lib/api";

function dashboardHref(role: User["role"]) {
  if (role === "ADMIN") return "/admin/formateurs";
  if (role === "FORMATEUR") return "/formateur/formations";
  return "/profile";
}

export function PublicHeader() {
  const [open, setOpen] = useState(false);
  const [pathname, setPathname] = useState("");
  const [scrolled, setScrolled] = useState(false);
  const frameRef = useRef<number | null>(null);
  const navRef = useRef<HTMLElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const {resolved, user} = useResolvedSession();

  useEffect(() => {
    let active = true;
    const syncPath = () => {
      if (active) setPathname(window.location.pathname);
    };
    const syncScroll = () => {
      frameRef.current = null;
      const compact = window.scrollY > 28;
      if (active) setScrolled((current) => current === compact ? current : compact);
    };
    const onScroll = () => {
      if (frameRef.current === null) frameRef.current = requestAnimationFrame(syncScroll);
    };
    queueMicrotask(syncPath);
    syncScroll();
    window.addEventListener("scroll", onScroll, {passive: true});
    return () => {
      active = false;
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    const background = Array.from(document.querySelectorAll<HTMLElement>("main, footer"));
    document.body.style.overflow = "hidden";
    background.forEach((element) => { element.inert = true; });
    const links = Array.from(navRef.current?.querySelectorAll<HTMLElement>("a[href], button:not(:disabled)") ?? []);
    queueMicrotask(() => links[0]?.focus());
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        queueMicrotask(() => menuButtonRef.current?.focus());
        return;
      }
      if (event.key !== "Tab") return;
      const targets = [...links, menuButtonRef.current].filter((item): item is HTMLElement => Boolean(item));
      if (!targets.length) return;
      const first = targets[0];
      const last = targets[targets.length - 1];
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
      background.forEach((element) => { element.inert = false; });
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  const current = (href: string) => href === "/"
    ? pathname === "/"
    : !href.includes("#") && pathname.startsWith(href);

  return (
    <header className={scrolled ? "public-header compact" : "public-header"}>
      <div className="container header-inner">
        <Brand />
        <nav className={open ? "public-nav open" : "public-nav"} aria-label="Navigation principale" id="public-navigation" ref={navRef}>
          <Link className={current("/") ? "active" : ""} aria-current={current("/") ? "page" : undefined} href="/" onClick={() => setOpen(false)}>Accueil</Link>
          <Link className={current("/catalogue") ? "active" : ""} aria-current={current("/catalogue") ? "page" : undefined} href="/catalogue" onClick={() => setOpen(false)}>Catalogue</Link>
          <Link className={current("/orientation") ? "active" : ""} aria-current={current("/orientation") ? "page" : undefined} href="/orientation" onClick={() => setOpen(false)}>Orientation</Link>
          <Link href="/#fonctionnement" onClick={() => setOpen(false)}>Fonctionnement</Link>
          {resolved && !user && (
            <Link href="/register/formateur" onClick={() => setOpen(false)}>Devenir formateur</Link>
          )}
          <div className="mobile-nav-actions">
            {!resolved ? null : user ? (
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
          {!resolved ? null : user ? (
            <Link className="btn btn-primary desktop-action" href={dashboardHref(user.role)}>Mon espace</Link>
          ) : (
            <>
              <Link className="btn btn-ghost desktop-action" href="/login">Connexion</Link>
              <Link className="btn btn-primary desktop-action" href="/register/participant">S’inscrire</Link>
            </>
          )}
          <button
            type="button"
            className="menu-toggle"
            aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
            aria-expanded={open}
            aria-controls="public-navigation"
            ref={menuButtonRef}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>
    </header>
  );
}
