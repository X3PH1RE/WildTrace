"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Binoculars,
  LayoutDashboard,
  Map,
  ShieldAlert,
  Users2,
  ClipboardCheck,
} from "lucide-react";

const links = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/map", label: "Live map", icon: Map },
  { href: "/analytics", label: "Species analytics", icon: Binoculars },
  { href: "/verify", label: "Expert verification", icon: ClipboardCheck },
  { href: "/invasive", label: "Invasive monitoring", icon: ShieldAlert },
  { href: "/contributors", label: "Contributors", icon: Users2 },
];

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen bg-zinc-50 text-zinc-900 dark:bg-black dark:text-zinc-50">
      <aside className="hidden w-64 flex-col border-r border-zinc-200 bg-white p-6 dark:border-zinc-900 dark:bg-zinc-950 md:flex">
        <div className="mb-10 text-xl font-semibold tracking-tight">WildTrace</div>
        <nav className="flex flex-col gap-1">
          {links.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition",
                  active
                    ? "bg-emerald-50 text-emerald-900 dark:bg-emerald-500/10 dark:text-emerald-50"
                    : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-900",
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            );
          })}
        </nav>
        <p className="mt-auto text-xs text-zinc-500">
          Biodiversity intelligence · experts · citizen science
        </p>
      </aside>
      <div className="flex flex-1 flex-col">
        <header className="border-b border-zinc-200 bg-white px-4 py-3 dark:border-zinc-900 dark:bg-zinc-950 md:hidden">
          <div className="text-lg font-semibold">WildTrace</div>
        </header>
        <main className="flex-1 p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
