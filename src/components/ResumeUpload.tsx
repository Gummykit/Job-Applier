"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button, Card } from "./ui";

export function ResumeUpload({ hasProfile, originalName, updatedAt }: { hasProfile: boolean; originalName: string | null; updatedAt: string | null }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  async function upload() {
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setError("Choose a file first.");
      return;
    }
    setBusy(true);
    setError(null);
    setOk(null);
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/profile/resume", { method: "POST", body: form });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "Upload failed.");
      return;
    }
    setOk(`Parsed resume for ${data.name}.`);
    if (fileRef.current) fileRef.current.value = "";
    router.refresh();
  }

  return (
    <Card title={hasProfile ? "Replace resume" : "Upload your resume"} description={hasProfile ? `Current: ${originalName ?? "unknown file"} · updated ${updatedAt}` : "PDF, DOCX, TXT or Markdown. Claude reads it and builds an editable profile."}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <input ref={fileRef} type="file" accept=".pdf,.docx,.txt,.md" className="text-sm file:mr-3 file:rounded-md file:border file:border-slate-300 file:bg-white file:px-3 file:py-1.5 file:text-sm file:font-medium hover:file:bg-slate-50" />
        <Button onClick={upload} disabled={busy}>
          {busy ? "Reading with AI…" : hasProfile ? "Replace & re-parse" : "Upload & parse"}
        </Button>
      </div>
      {hasProfile && <p className="mt-2 text-xs text-slate-500">Replacing the resume overwrites the parsed profile below (your screening answers are kept).</p>}
      {error && <div className="mt-3"><Alert kind="error">{error}</Alert></div>}
      {ok && <div className="mt-3"><Alert kind="success">{ok}</Alert></div>}
    </Card>
  );
}
