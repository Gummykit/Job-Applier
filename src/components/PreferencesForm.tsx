"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PREFERENCE_FIELDS, type Preferences } from "@/lib/preferences";
import { Alert, Button, inputClass, labelClass } from "./ui";

export function PreferencesForm({ initial }: { initial: Preferences }) {
  const router = useRouter();
  const [prefs, setPrefs] = useState<Preferences>(initial);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  async function save() {
    setSaving(true);
    setMsg(null);
    const res = await fetch("/api/profile", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ preferences: prefs }) });
    setSaving(false);
    if (!res.ok) {
      setMsg({ kind: "error", text: (await res.json().catch(() => ({}))).error ?? "Could not save." });
      return;
    }
    setMsg({ kind: "success", text: "Screening answers saved." });
    router.refresh();
  }

  return (
    <div>
      <p className="mb-4 text-sm text-slate-500">The agent uses these to answer application questions it cannot infer from your resume. Leave anything blank to let it answer truthfully from context.</p>
      <div className="grid gap-4 sm:grid-cols-2">
        {PREFERENCE_FIELDS.map((f) => (
          <div key={f.key} className={f.multiline ? "sm:col-span-2" : ""}>
            <label className={labelClass}>{f.label}</label>
            {f.multiline ? (
              <textarea className={`${inputClass} min-h-24`} value={prefs[f.key]} placeholder={f.hint} onChange={(e) => setPrefs({ ...prefs, [f.key]: e.target.value })} />
            ) : (
              <input className={inputClass} value={prefs[f.key]} placeholder={f.hint} onChange={(e) => setPrefs({ ...prefs, [f.key]: e.target.value })} />
            )}
          </div>
        ))}
      </div>
      {msg && <div className="mt-4"><Alert kind={msg.kind}>{msg.text}</Alert></div>}
      <div className="mt-4">
        <Button onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save answers"}
        </Button>
      </div>
    </div>
  );
}
