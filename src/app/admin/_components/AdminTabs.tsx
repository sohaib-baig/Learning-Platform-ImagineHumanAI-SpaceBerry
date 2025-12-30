"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/clubs", label: "Clubs" },
  { href: "/admin/revenue", label: "Revenue" },
  { href: "/admin/customers", label: "Customers" },
];

/**
 * Client-side sidebar nav to highlight the active admin section.
 */
export function AdminTabs() {
  const pathname = usePathname() || "";

  return (
    <nav aria-label="Admin navigation">
      <ul className="flex flex-col gap-2">
        {tabs.map((tab) => {
          const isActive =
            pathname === tab.href || pathname.startsWith(`${tab.href}/`);

          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                aria-current={isActive ? "page" : undefined}
                className={`group relative flex items-center gap-3 rounded-xl border px-4 py-3 text-sm font-medium transition backdrop-blur ${
                  isActive
                    ? "border-white/30 bg-white/15 text-white shadow-[0_15px_45px_rgba(0,0,0,0.25)] ring-1 ring-white/40"
                    : "border-white/10 bg-white/5 text-white/80 hover:-translate-y-0.5 hover:border-white/25 hover:bg-white/10 hover:text-white"
                }`}
              >
                <span
                  className={`h-2.5 w-2.5 rounded-full transition ${
                    isActive
                      ? "bg-emerald-300 shadow-[0_0_0_6px_rgba(16,185,129,0.18)]"
                      : "bg-white/40 group-hover:bg-white"
                  }`}
                />
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
