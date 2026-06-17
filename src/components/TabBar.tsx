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
    <nav className="glass sticky bottom-0 z-40 mx-auto flex w-full max-w-md items-center justify-around rounded-t-2xl px-2 py-2">
      {tabs.map((t) => {
        const active = t.href === "/" ? path === "/" : path.startsWith(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`flex flex-1 flex-col items-center gap-0.5 rounded-xl py-1.5 text-[11px] transition ${
              active ? "text-foreground" : "text-muted"
            }`}
          >
            <span className={`text-lg ${active ? "halo-text" : ""}`}>{t.icon}</span>
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
