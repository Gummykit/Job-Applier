"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button, Card, inputClass, labelClass } from "./ui";

export function AddJobsForm() {
  const router = useRouter();
  const [mode, setMode] = useState<"urls" | "paste">("urls");
  const [urls, setUrls] = useState("");
  const [url, setUrl] = useState("");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  async function submit() {
    setBusy(true);
    setMsg(null);
    const body = mode === "urls" ? { urls: urls.split(/\s+/).filter(Boolean) } : { url, text };
    const res = await fetch("/api/jobs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setMsg({ kind: "error", text: data.error ?? "Could not add jobs." });
      return;
    }
    setMsg({ kind: "success", text: `Added ${data.ids.length} job${data.ids.length === 1 ? "" : "s"}. Importing in the background…` });
    setUrls("");
    setText("");
    setUrl("");
    router.refresh();
  }

  return (
    <Card
      title="Add jobs"
      actions={
        <div className="flex rounded-md border border-slate-300 p-0.5 text-xs">
          {(["urls", "paste"] as const).map((m) => (
            <button key={m} type="button" onClick={() => setMode(m)} className={`rounded px-2.5 py-1 font-medium ${mode === m ? "bg-slate-900 text-white" : "text-slate-600"}`}>
              {m === "urls" ? "Job URLs" : "Paste description"}
            </button>
          ))}
        </div>
      }
    >
      {mode === "urls" ? (
        <div>
          <label className={labelClass}>Job posting URLs (one per line)</label>
          <textarea className={`${inputClass} min-h-28 font-mono text-xs`} placeholder={"https://www.linkedin.com/jobs/view/…\nhttps://boards.greenhouse.io/…/jobs/…\nhttps://jobs.lever.co/…"} value={urls} onChange={(e) => setUrls(e.target.value)} />
        </div>
      ) : (
        <div className="space-y-3">
          <div>
            <label className={labelClass}>Posting URL (needed to apply)</label>
            <input className={inputClass} placeholder="https://…" value={url} onChange={(e) => setUrl(e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>Job description text</label>
            <textarea className={`${inputClass} min-h-40`} placeholder="Paste the full job description…" value={text} onChange={(e) => setText(e.target.value)} />
          </div>
        </div>
      )}
      {msg && <div className="mt-3"><Alert kind={msg.kind}>{msg.text}</Alert></div>}
      <div className="mt-3">
        <Button onClick={submit} disabled={busy || (mode === "urls" ? !urls.trim() : !text.trim())}>
          {busy ? "Adding…" : "Add & import"}
        </Button>
      </div>
    </Card>
  );
}
