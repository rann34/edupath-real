"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "@/app/components/theme-provider";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const isDark = theme === "dark";

  const switchLabel = !mounted ? "Theme" : isDark ? "Switch to Light" : "Switch to Dark";
  const accessibilityLabel = !mounted ? "Toggle theme" : isDark ? "Switch to light mode" : "Switch to dark mode";
  const switchStateClass = !mounted ? "theme-toggle__switch--dark" : isDark ? "theme-toggle__switch--dark" : "theme-toggle__switch--light";
  const iconActiveClass = mounted && isDark ? "theme-toggle__icon--active" : "";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="theme-toggle fixed right-4 top-4 z-50 inline-flex items-center gap-3 rounded-full px-2.5 py-2 text-sm font-semibold shadow-lg backdrop-blur md:right-6 md:top-6"
      aria-label={accessibilityLabel}
      title={accessibilityLabel}
    >
      <span className="theme-toggle__label">
        {switchLabel}
      </span>
      <span className={`theme-toggle__switch ${switchStateClass}`} aria-hidden="true">
        <span className="theme-toggle__thumb">
          <span className={`theme-toggle__icon ${iconActiveClass}`}>
            <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5" stroke="currentColor" strokeWidth="1.8">
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2v2.2M12 19.8V22M4.93 4.93l1.56 1.56M17.51 17.51l1.56 1.56M2 12h2.2M19.8 12H22M4.93 19.07l1.56-1.56M17.51 6.49l1.56-1.56" />
            </svg>
          </span>
        </span>
        <span className="theme-toggle__track-icon theme-toggle__track-icon--left">
          <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5" stroke="currentColor" strokeWidth="1.8">
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2.2M12 19.8V22M4.93 4.93l1.56 1.56M17.51 17.51l1.56 1.56M2 12h2.2M19.8 12H22M4.93 19.07l1.56-1.56M17.51 6.49l1.56-1.56" />
          </svg>
        </span>
        <span className="theme-toggle__track-icon theme-toggle__track-icon--right">
          <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5" stroke="currentColor" strokeWidth="1.8">
            <path d="M21 12.79A9 9 0 1111.21 3c-.02.2-.03.4-.03.6A7.8 7.8 0 0019 11.4c0 .47-.04.93-.12 1.39Z" />
          </svg>
        </span>
      </span>
    </button>
  );
}
