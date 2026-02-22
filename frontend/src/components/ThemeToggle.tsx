"use client";

import { Moon, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";

const THEME_STORAGE_KEY = "documind-theme";

function applyTheme(theme: "light" | "dark") {
  if (typeof window === "undefined") {
    return;
  }

  document.documentElement.classList.toggle("dark", theme === "dark");
  window.localStorage.setItem(THEME_STORAGE_KEY, theme);
}

export function ThemeToggle() {
  const toggleTheme = () => {
    const isDark = document.documentElement.classList.contains("dark");
    const nextTheme = isDark ? "light" : "dark";
    applyTheme(nextTheme);
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={toggleTheme}
      aria-label="Toggle theme"
    >
      <Sun className="size-4 dark:hidden" />
      <Moon className="hidden size-4 dark:block" />
      <span className="hidden sm:inline">Theme</span>
    </Button>
  );
}
