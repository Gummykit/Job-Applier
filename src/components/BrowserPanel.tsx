"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button, inputClass, labelClass } from "./ui";

type Status = { open: boolean; headless: boolean | null; pages: number };

const QUICK = [
  { label: "LinkedIn", url: "https://www.linkedin.com/login" },
  { label: "Indeed", url: "https://secure.indeed.com/auth" },
  { label: "Glassdoor", url: "https://www.glassdoor.com/profile/login_input.htm" },
];

export function BrowserPanel({ status, headless }: { status: Status; headless: boolean }) {
  const router = useRouter();
  const [url, setUrl] = useState("https://www.linkedin.com/login");
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  async function call(path: string, body?: unknown, label = path) {
    setBusy(label);
    setMsg(null);
    const res = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
    const data = await res.json().catch(() => ({}));
    setBusy(null);
    if (!res.ok) setMsg({ kind: "error", text: data.error ?? "Request failed." });
    else setMsg({ kind: "success", text: label === "open" ? "Opened. Sign in in the browser window, then come back here." : "Browser closed." });
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-700">
        Status: {status.open ? `open with ${status.pages} tab${status.pages === 1 ? "" : "s"} (${status.headless ? "headless" : "visible"})` : "closed (launches when needed)"}
      </div>
      {headless && <Alert kind="warning">Headless mode is on, so you cannot sign in interactively. Turn it off in Agent settings and restart the browser.</Alert>}
      <div>
        <label className={labelClass}>Open a sign-in page</label>
        <div className="flex gap-2">
          <input className={inputClass} value={url} onChange={(e) => setUrl(e.target.value)} />
          <Button onClick={() => call("/api/browser/open", { url }, "open")} disabled={busy !== null || headless}>
            {busy === "open" ? "Opening…" : "Open"}
          </Button>
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          {QUICK.map((q) => (
            <button key={q.url} type="button" className="rounded-full border border-slate-300 px-2.5 py-0.5 text-xs text-slate-700 hover:bg-slate-100" onClick={() => setUrl(q.url)}>
              {q.label}
            </button>
          ))}
        </div>
      </div>
      {msg && <Alert kind={msg.kind}>{msg.text}</Alert>}
      <div className="flex gap-2">
        <Button variant="secondary" onClick={() => call("/api/browser/close", undefined, "close")} disabled={busy !== null || !status.open}>
          {busy === "close" ? "Closing…" : "Restart / close browser"}
        </Button>
      </div>
      <p className="text-xs text-slate-500">Cookies and sessions are stored locally in <code>.data/browser-profile</code>. Nothing is sent anywhere except the pages the agent fills in and the text snapshots sent to the model.</p>
    </div>
  );
}
