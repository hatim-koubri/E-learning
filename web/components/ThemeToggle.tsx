"use client";

import {Moon, Sun} from "lucide-react";
import {useEffect, useState} from "react";
import {IconButton} from "@/components/ui";

type Theme = "light" | "dark";

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const current = document.documentElement.dataset.theme === "dark" ? "dark" : "light";
    queueMicrotask(() => setTheme(current));
  }, []);

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
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
