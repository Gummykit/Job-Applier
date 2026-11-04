"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/", label: "Dashboard" },
  { href: "/profile", label: "Profile & resume" },
  { href: "/jobs", label: "Jobs" },
  { href: "/applications", label: "Applications" },
  { href: "/settings", label: "Settings" },
];

export function Sidebar() {
  const path = usePathname();
  const isActive = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));
  return (
    <>
      <aside className="hidden w-60 shrink-0 border-r border-slate-200 bg-white md:flex md:flex-col">
        <div className="border-b border-slate-200 px-5 py-5">
          <div className="text-lg font-semibold tracking-tight">AutoApply</div>
          <div className="text-xs text-slate-500">AI job application agent</div>
        </div>
        <nav className="space-y-1 p-3">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={`block rounded-md px-3 py-2 text-sm font-medium transition ${
                isActive(n.href) ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100"
              }`}
            >
              {n.label}
            </Link>
          ))}
        </nav>
      </aside>
      <div className="flex items-center gap-1 overflow-x-auto border-b border-slate-200 bg-white px-3 py-2 md:hidden">
        <span className="mr-2 text-sm font-semibold">AutoApply</span>
        {NAV.map((n) => (
          <Link
            key={n.href}
            href={n.href}
            className={`whitespace-nowrap rounded-md px-2.5 py-1.5 text-xs font-medium ${
              isActive(n.href) ? "bg-slate-900 text-white" : "text-slate-700"
            }`}
          >
            {n.label}
          </Link>
        ))}
      </div>
    </>
  );
}
