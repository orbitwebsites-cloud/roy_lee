"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/", label: "Scan", icon: "✦" },
  { href: "/progress", label: "Progress", icon: "↗" },
  { href: "/closer", label: "Closer", icon: "♥" },
  { href: "/me", label: "Me", icon: "◉" },
];

export default function TabBar() {
  const path = usePathname();
  return (
    <nav className="glass sticky bottom-0 z-40 mx-auto flex w-full max-w-md items-center justify-around rounded-t-3xl px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2">
      {tabs.map((t) => {
        const active = t.href === "/" ? path === "/" : path.startsWith(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            className="group relative flex flex-1 flex-col items-center gap-1 py-1.5"
          >
            {active && (
              <span className="halo-bg absolute -top-2 h-1 w-7 rounded-full" />
            )}
            <span
              className={`text-lg transition ${
                active ? "halo-text" : "text-faint group-hover:text-muted"
              }`}
            >
              {t.icon}
            </span>
            <span
              className={`text-[10px] font-medium tracking-wide transition ${
                active ? "text-foreground" : "text-faint"
              }`}
            >
              {t.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
