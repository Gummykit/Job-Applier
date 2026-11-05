"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import type { SessionUser } from "@/lib/auth";

const NAV = [
  { href: "/", label: "Dashboard" },
  { href: "/profile", label: "Profile & resume" },
  { href: "/jobs", label: "Jobs" },
  { href: "/applications", label: "Applications" },
  { href: "/settings", label: "Settings" },
];

export function Sidebar({ user }: { user: SessionUser }) {
  const path = usePathname();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);
  const isActive = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));

  async function signOut() {
    setSigningOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const account = (
    <div className="flex items-center justify-between gap-2">
      <div className="min-w-0">
        <div className="truncate text-sm font-medium text-slate-900">{user.name || user.email}</div>
        {user.name && <div className="truncate text-xs text-slate-500">{user.email}</div>}
      </div>
      <button type="button" onClick={signOut} disabled={signingOut} className="shrink-0 rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50 disabled:opacity-50">
        {signingOut ? "…" : "Sign out"}
      </button>
    </div>
  );

  return (
    <>
      <aside className="hidden w-60 shrink-0 border-r border-slate-200 bg-white md:flex md:flex-col">
        <div className="border-b border-slate-200 px-5 py-5">
          <div className="text-lg font-semibold tracking-tight">AutoApply</div>
          <div className="text-xs text-slate-500">AI job application agent</div>
        </div>
        <nav className="flex-1 space-y-1 p-3">
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
        <div className="border-t border-slate-200 px-4 py-3">{account}</div>
      </aside>
      <div className="border-b border-slate-200 bg-white md:hidden">
        <div className="flex items-center gap-1 overflow-x-auto px-3 py-2">
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
        <div className="border-t border-slate-100 px-3 py-2">{account}</div>
      </div>
    </>
  );
}
