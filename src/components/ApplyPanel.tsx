"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button, Card } from "./ui";

export function ApplyPanel({ jobId, defaultAutoSubmit, disabledReason }: { jobId: string; defaultAutoSubmit: boolean; disabledReason: string | null }) {
  const router = useRouter();
  const [autoSubmit, setAutoSubmit] = useState(defaultAutoSubmit);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function apply() {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/jobs/${jobId}/apply`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ autoSubmit }) });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "Could not start the application.");
      return;
    }
    router.push(`/applications/${data.id}`);
  }

  return (
    <Card title="Apply with AI" description="The agent opens the posting in the browser, tailors your resume if needed, fills the form and answers screening questions.">
      <label className="flex items-start gap-3 text-sm">
        <input type="checkbox" className="mt-1" checked={autoSubmit} onChange={(e) => setAutoSubmit(e.target.checked)} />
        <span>
          <span className="font-medium text-slate-900">Submit automatically</span>
          <span className="block text-slate-500">Uncheck to have the agent stop right before the final submit so you can review it in the browser window.</span>
        </span>
      </label>
      {disabledReason && <div className="mt-3"><Alert kind="warning">{disabledReason}</Alert></div>}
      {error && <div className="mt-3"><Alert kind="error">{error}</Alert></div>}
      <div className="mt-4">
        <Button onClick={apply} disabled={busy || !!disabledReason} className="w-full">
          {busy ? "Starting…" : autoSubmit ? "Apply & submit" : "Fill application for review"}
        </Button>
      </div>
    </Card>
  );
}
