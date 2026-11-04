"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Resume } from "@/lib/schemas";
import { ResumeEditor } from "./ResumeEditor";
import { Alert, Button, Card, buttonClass, inputClass } from "./ui";

export type TailoredDTO = {
  id: string;
  matchScore: number | null;
  changes: string[];
  missingKeywords: string[];
  coverLetter: string | null;
  resume: Resume | null;
  updatedAt: string;
};

const TABS = ["Preview", "Edit", "Cover letter", "What changed"] as const;

export function TailorPanel({ jobId, tailored, canTailor }: { jobId: string; tailored: TailoredDTO | null; canTailor: boolean }) {
  const router = useRouter();
  const [tab, setTab] = useState<(typeof TABS)[number]>("Preview");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cover, setCover] = useState(tailored?.coverLetter ?? "");

  async function tailor() {
    setBusy("tailor");
    setError(null);
    const res = await fetch(`/api/jobs/${jobId}/tailor`, { method: "POST" });
    const data = await res.json().catch(() => ({}));
    setBusy(null);
    if (!res.ok) {
      setError(data.error ?? "Tailoring failed.");
      return;
    }
    router.refresh();
  }

  async function saveCover() {
    if (!tailored) return;
    setBusy("cover");
    setError(null);
    const res = await fetch(`/api/tailored/${tailored.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ coverLetter: cover }) });
    setBusy(null);
    if (!res.ok) setError((await res.json().catch(() => ({}))).error ?? "Could not save.");
    router.refresh();
  }

  async function regenerateCover() {
    if (!tailored) return;
    setBusy("regen");
    setError(null);
    const res = await fetch(`/api/tailored/${tailored.id}/cover-letter`, { method: "POST" });
    const data = await res.json().catch(() => ({}));
    setBusy(null);
    if (!res.ok) {
      setError(data.error ?? "Could not regenerate.");
      return;
    }
    setCover(data.coverLetter);
    router.refresh();
  }

  if (!tailored || !tailored.resume) {
    return (
      <Card title="Tailored resume" description="Claude rewrites your resume for this role: targeted summary, reordered skills, reworded bullets, and a cover letter. Nothing is invented.">
        {error && <div className="mb-3"><Alert kind="error">{error}</Alert></div>}
        <Button onClick={tailor} disabled={busy !== null || !canTailor}>
          {busy === "tailor" ? "Tailoring (about a minute)…" : "Tailor resume with AI"}
        </Button>
        {!canTailor && <p className="mt-2 text-xs text-slate-500">Upload a resume and wait for the job import to finish first.</p>}
        <p className="mt-2 text-xs text-slate-500">If you skip this, the agent tailors the resume automatically when it applies.</p>
      </Card>
    );
  }

  const score = tailored.matchScore ?? 0;
  const scoreColor = score >= 75 ? "text-emerald-700" : score >= 50 ? "text-amber-700" : "text-red-700";

  return (
    <Card
      title="Tailored resume"
      description={`Generated ${tailored.updatedAt}`}
      actions={
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className={`text-2xl font-semibold leading-none ${scoreColor}`}>{score}%</div>
            <div className="text-[10px] uppercase tracking-wide text-slate-500">fit</div>
          </div>
          <a href={`/api/tailored/${tailored.id}/pdf`} target="_blank" rel="noreferrer" className={buttonClass("secondary", "sm")}>
            PDF ↗
          </a>
          <Button size="sm" variant="secondary" onClick={tailor} disabled={busy !== null}>
            {busy === "tailor" ? "Re-tailoring…" : "Re-tailor"}
          </Button>
        </div>
      }
    >
      {error && <div className="mb-3"><Alert kind="error">{error}</Alert></div>}
      <div className="mb-4 flex gap-1 border-b border-slate-200">
        {TABS.map((t) => (
          <button key={t} type="button" onClick={() => setTab(t)} className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium ${tab === t ? "border-slate-900 text-slate-900" : "border-transparent text-slate-500 hover:text-slate-800"}`}>
            {t}
          </button>
        ))}
      </div>

      {tab === "Preview" && (
        <iframe key={tailored.updatedAt} title="Tailored resume preview" src={`/api/tailored/${tailored.id}/html`} className="h-[900px] w-full rounded-md border border-slate-200 bg-white" />
      )}
      {tab === "Edit" && <ResumeEditor key={tailored.id + tailored.updatedAt} initial={tailored.resume} saveUrl={`/api/tailored/${tailored.id}`} />}
      {tab === "Cover letter" && (
        <div className="space-y-3">
          <textarea className={`${inputClass} min-h-80`} value={cover} onChange={(e) => setCover(e.target.value)} placeholder="No cover letter yet. Generate one or write your own." />
          <div className="flex gap-2">
            <Button onClick={saveCover} disabled={busy !== null}>
              {busy === "cover" ? "Saving…" : "Save cover letter"}
            </Button>
            <Button variant="secondary" onClick={regenerateCover} disabled={busy !== null}>
              {busy === "regen" ? "Writing…" : "Regenerate with AI"}
            </Button>
          </div>
        </div>
      )}
      {tab === "What changed" && (
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Edits made</h3>
            {tailored.changes.length ? (
              <ul className="list-disc space-y-1 pl-5 text-sm text-slate-800">
                {tailored.changes.map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500">No changes recorded.</p>
            )}
          </div>
          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Gaps the resume cannot honestly cover</h3>
            {tailored.missingKeywords.length ? (
              <ul className="list-disc space-y-1 pl-5 text-sm text-slate-800">
                {tailored.missingKeywords.map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500">None identified.</p>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}
