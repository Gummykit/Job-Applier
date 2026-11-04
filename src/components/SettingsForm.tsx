"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Settings } from "@/lib/settings";
import { Alert, Button, inputClass, labelClass } from "./ui";

const MODELS = [
  { id: "claude-opus-5-5", label: "Claude Opus 5.5 (default, most capable)" },
  { id: "claude-sonnet-5-5", label: "Claude Sonnet 5.5 (faster, cheaper)" },
  { id: "claude-haiku-5-5", label: "Claude Haiku 5.5 (cheapest)" },
];

export function SettingsForm({ initial }: { initial: Settings }) {
  const router = useRouter();
  const [model, setModel] = useState(initial.model);
  const [headless, setHeadless] = useState(initial.headless);
  const [autoSubmit, setAutoSubmit] = useState(initial.autoSubmit);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const custom = !MODELS.some((m) => m.id === model);

  async function save() {
    setSaving(true);
    setMsg(null);
    const res = await fetch("/api/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ model, headless, autoSubmit }) });
    setSaving(false);
    if (!res.ok) {
      setMsg({ kind: "error", text: (await res.json().catch(() => ({}))).error ?? "Could not save." });
      return;
    }
    setMsg({ kind: "success", text: "Saved." });
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div>
        <label className={labelClass}>Model</label>
        <select className={inputClass} value={custom ? "custom" : model} onChange={(e) => setModel(e.target.value === "custom" ? "" : e.target.value)}>
          {MODELS.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
          <option value="custom">Custom model id…</option>
        </select>
        {custom && <input className={`${inputClass} mt-2`} placeholder="claude-…" value={model} onChange={(e) => setModel(e.target.value)} />}
      </div>
      <label className="flex items-start gap-3 text-sm">
        <input type="checkbox" className="mt-1" checked={autoSubmit} onChange={(e) => setAutoSubmit(e.target.checked)} />
        <span>
          <span className="font-medium text-slate-900">Submit applications automatically</span>
          <span className="block text-slate-500">When off, the agent fills everything and stops before the final submit so you can review it in the browser.</span>
        </span>
      </label>
      <label className="flex items-start gap-3 text-sm">
        <input type="checkbox" className="mt-1" checked={headless} onChange={(e) => setHeadless(e.target.checked)} />
        <span>
          <span className="font-medium text-slate-900">Run the browser headless (hidden)</span>
          <span className="block text-slate-500">Keep this off to watch the agent work and to solve CAPTCHAs or log in when it asks. Takes effect after restarting the browser.</span>
        </span>
      </label>
      {msg && <Alert kind={msg.kind}>{msg.text}</Alert>}
      <Button onClick={save} disabled={saving || !model}>
        {saving ? "Saving…" : "Save settings"}
      </Button>
    </div>
  );
}
