"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as Icons from "lucide-react";
import { cn } from "@/lib/utils";
import { initials } from "@/lib/format";
import type { NavSection } from "./nav-config";
import { CommandPalette } from "./command-palette";
import { LogoFull, LogoMark } from "./logo";
import { signOut } from "@/lib/actions/session";

function Icon({ name, size = 17 }: { name: string; size?: number }) {
  const C = (Icons as unknown as Record<string, React.ComponentType<{ size?: number }>>)[name];
  return C ? <C size={size} /> : null;
}

export function Shell({
  nav,
  user,
  churchName,
  children,
}: {
  nav: NavSection[];
  user: { name: string; role: string };
  churchName: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [paletteOpen, setPaletteOpen] = React.useState(false);
  const [theme, setTheme] = React.useState<"light" | "dark" | null>(null);

  // Reading the saved theme has to happen after mount: localStorage does not
  // exist while the server renders, and seeding the initial state from it
  // would make the server and the browser disagree. The lint rule cannot see
  // the difference between this and a cascading render, so it is silenced
  // here and nowhere else.
  React.useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    const stored = (() => {
      try {
        return localStorage.getItem("vic-theme") as "light" | "dark" | null;
      } catch {
        return null;
      }
    })();
    if (stored) {
      setTheme(stored);
      document.documentElement.dataset.theme = stored;
    }
    const c = (() => {
      try {
        return localStorage.getItem("vic-collapsed") === "1";
      } catch {
        return false;
      }
    })();
    setCollapsed(c);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  // Close the drawer when the route changes. Adjusting state during render is
  // the pattern React asks for here: an effect would paint the new page with
  // the old menu still over it, which on a phone is a flash of the wrong thing
  // on every single navigation.
  const [lastPath, setLastPath] = React.useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setMobileOpen(false);
  }

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("vic-theme", next);
    } catch {}
  }

  function toggleCollapsed() {
    setCollapsed((v) => {
      try {
        localStorage.setItem("vic-collapsed", v ? "0" : "1");
      } catch {}
      return !v;
    });
  }

  const allItems = nav.flatMap((s) => s.items);

  return (
    <div className="flex min-h-screen">
      {/* sidebar */}
      <nav
        data-app-nav
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex flex-col border-r bg-[var(--sidebar)] transition-[width,transform] duration-200 lg:static lg:translate-x-0",
          collapsed ? "w-16" : "w-60",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {/* Expanded, there is room for the real lockup; collapsed, only the
            mark fits. Neither needs the church's name set in type beside it —
            the artwork carries it. */}
        <div
          className={cn(
            "flex flex-col justify-center gap-1 border-b px-3 py-3",
            collapsed ? "h-14 items-center px-0" : "min-h-14",
          )}
        >
          {/* The logo is drawn for white paper, so in dark mode it sits on a
              light plate instead of being recoloured. In light mode the
              sidebar is already white and the plate is invisible. */}
          <span className="inline-flex items-center justify-center rounded-xl bg-white px-2 py-1.5">
            {collapsed ? (
              <LogoMark size={28} className="shrink-0" />
            ) : (
              <LogoFull width={116} alt={churchName} />
            )}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto px-2 py-3">
          {nav.map((section, si) => (
            <div key={si} className={cn(si > 0 && "mt-4")}>
              {section.label && !collapsed ? (
                <p className="mb-1 px-2.5 text-[11px] font-semibold tracking-wider text-[var(--text-muted)] uppercase">
                  {section.label}
                </p>
              ) : null}
              {section.label && collapsed && si > 0 ? (
                <div className="mx-3 mb-2 border-t" />
              ) : null}
              <ul className="space-y-0.5">
                {section.items.map((item) => {
                  const active =
                    item.href === "/"
                      ? pathname === "/"
                      : pathname.startsWith(item.href);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        title={collapsed ? item.label : undefined}
                        className={cn(
                          "relative flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-[13.5px] transition-colors",
                          collapsed && "justify-center px-0",
                          active
                            ? "bg-bronze-600/10 font-medium text-bronze-700 dark:text-bronze-300"
                            : "text-[var(--text-muted)] hover:bg-sand-100 hover:text-[var(--text)] dark:hover:bg-sand-800",
                        )}
                      >
                        {active ? (
                          <span className="absolute top-1.5 bottom-1.5 -left-2 w-[3px] rounded-r bg-bronze-600 dark:bg-bronze-300" />
                        ) : null}
                        <Icon name={item.icon} />
                        {!collapsed && <span className="truncate">{item.label}</span>}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t p-2">
          <button
            onClick={toggleCollapsed}
            className="hidden h-8 w-full items-center justify-center gap-2 rounded-lg text-[13px] text-[var(--text-muted)] hover:bg-sand-100 lg:flex dark:hover:bg-sand-800"
          >
            {collapsed ? <Icons.ChevronsRight size={16} /> : (
              <>
                <Icons.ChevronsLeft size={16} />
                <span>Collapse</span>
              </>
            )}
          </button>
        </div>
      </nav>

      {mobileOpen ? (
        <div
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      ) : null}

      {/* main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header
          data-app-header
          className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b bg-[var(--surface)]/85 px-4 backdrop-blur-md"
        >
          <button
            onClick={() => setMobileOpen(true)}
            className="rounded-lg p-1.5 hover:bg-sand-100 lg:hidden dark:hover:bg-sand-800"
            aria-label="Open menu"
          >
            <Icons.Menu size={18} />
          </button>

          <button
            onClick={() => setPaletteOpen(true)}
            className="flex h-8 flex-1 max-w-72 items-center gap-2 rounded-lg border bg-[var(--card)] px-2.5 text-[13px] text-[var(--text-muted)] transition-colors hover:border-bronze-300"
          >
            <Icons.Search size={14} />
            <span>Search…</span>
            <kbd className="ml-auto hidden rounded border px-1.5 py-0.5 text-[10.5px] sm:inline">
              ⌘K
            </kbd>
          </button>

          <div className="ml-auto flex items-center gap-1">
            <button
              onClick={toggleTheme}
              className="rounded-lg p-2 text-[var(--text-muted)] hover:bg-sand-100 dark:hover:bg-sand-800"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? <Icons.Sun size={16} /> : <Icons.Moon size={16} />}
            </button>

            <div className="mx-1 hidden h-5 w-px bg-[var(--border)] sm:block" />

            <div className="flex items-center gap-2.5 pl-1">
              <div className="hidden text-right sm:block">
                <p className="text-[13px] leading-tight font-medium">{user.name}</p>
                <p className="text-[11.5px] text-[var(--text-muted)]">{user.role}</p>
              </div>
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-bronze-600 text-[12px] font-semibold text-white">
                {initials(user.name)}
              </div>
            </div>

            <form action={signOut}>
              <button
                className="rounded-lg p-2 text-[var(--text-muted)] hover:bg-sand-100 dark:hover:bg-sand-800"
                aria-label="Sign out"
                title="Sign out"
              >
                <Icons.LogOut size={16} />
              </button>
            </form>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </div>

      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        items={allItems}
      />
    </div>
  );
}
