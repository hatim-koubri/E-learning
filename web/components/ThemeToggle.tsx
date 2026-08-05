"use client";

import {Moon, Sun} from "lucide-react";
import {useEffect, useState} from "react";
import {IconButton} from "@/components/ui";

type Theme = "light" | "dark";

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    let active = true;
    const media = typeof window.matchMedia === "function"
      ? window.matchMedia("(prefers-color-scheme: dark)")
      : null;
    const resolveTheme = (): Theme => {
      const saved = localStorage.getItem("theme");
      if (saved === "light" || saved === "dark") return saved;
      return media?.matches ? "dark" : "light";
    };
    const sync = () => {
      if (active) setTheme(resolveTheme());
    };
    queueMicrotask(sync);
    media?.addEventListener("change", sync);
    return () => {
      active = false;
      media?.removeEventListener("change", sync);
    };
  }, []);

  function toggle() {
    const current = document.documentElement.dataset.theme === "dark" ? "dark" : "light";
    const next = current === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    localStorage.setItem("theme", next);
    setTheme(next);
  }

  return (
    <IconButton label={theme === "dark" ? "Activer le thème clair" : "Activer le thème sombre"} onClick={toggle}>
      {theme === "dark" ? <Sun size={19} /> : <Moon size={19} />}
    </IconButton>
  );
}
