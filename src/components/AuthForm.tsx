"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert, Button, inputClass, labelClass } from "./ui";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isRegister = mode === "register";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (isRegister && password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setBusy(true);
    const res = await fetch(`/api/auth/${mode}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(isRegister ? { name, email, password } : { email, password }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "Something went wrong.");
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <div className="w-full max-w-sm">
      <div className="mb-6 text-center">
        <div className="text-2xl font-semibold tracking-tight text-slate-900">AutoApply</div>
        <div className="mt-1 text-sm text-slate-500">{isRegister ? "Create your account" : "Sign in to your account"}</div>
      </div>
      <form onSubmit={submit} className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        {isRegister && (
          <div>
            <label className={labelClass}>Name</label>
            <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" placeholder="Jane Doe" />
          </div>
        )}
        <div>
          <label className={labelClass}>Email</label>
          <input className={inputClass} type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
        </div>
        <div>
          <label className={labelClass}>Password</label>
          <input className={inputClass} type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={isRegister ? "new-password" : "current-password"} />
          {isRegister && <p className="mt-1 text-xs text-slate-500">At least 8 characters.</p>}
        </div>
        {isRegister && (
          <div>
            <label className={labelClass}>Confirm password</label>
            <input className={inputClass} type="password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" />
          </div>
        )}
        {error && <Alert kind="error">{error}</Alert>}
        <Button type="submit" className="w-full" disabled={busy}>
          {busy ? "Please wait…" : isRegister ? "Create account" : "Sign in"}
        </Button>
        <p className="text-center text-sm text-slate-500">
          {isRegister ? (
            <>
              Already have an account?{" "}
              <Link href="/login" className="font-medium text-slate-900 underline">
                Sign in
              </Link>
            </>
          ) : (
            <>
              New here?{" "}
              <Link href="/register" className="font-medium text-slate-900 underline">
                Create an account
              </Link>
            </>
          )}
        </p>
      </form>
    </div>
  );
}
