"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { LogEntry } from "@/lib/agent/run";
import { formatDate } from "@/lib/utils";
import { Alert, Badge, Button, Card, LinkButton, PageHeader } from "./ui";

export type ApplicationDTO = {
  id: string;
  status: string;
  summary: string | null;
  autoSubmit: boolean;
  log: LogEntry[];
  inputTokens: number;
  outputTokens: number;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  job: { id: string; title: string | null; company: string | null; url: string | null };
};

const ICON: Record<LogEntry["type"], { glyph: string; cls: string }> = {
  info: { glyph: "i", cls: "bg-slate-200 text-slate-700" },
  action: { glyph: "→", cls: "bg-blue-100 text-blue-800" },
  result: { glyph: "✓", cls: "bg-emerald-100 text-emerald-800" },
  error: { glyph: "!", cls: "bg-red-100 text-red-800" },
  assistant: { glyph: "AI", cls: "bg-violet-100 text-violet-800" },
};

const OUTCOME: Record<string, { kind: "info" | "success" | "warning" | "error"; title: string }> = {
  queued: { kind: "info", title: "Waiting for the agent" },
  running: { kind: "info", title: "The agent is working" },
  submitted: { kind: "success", title: "Application submitted" },
  needs_review: { kind: "warning", title: "Your turn: review in the browser window" },
  failed: { kind: "error", title: "The agent could not finish" },
  skipped: { kind: "info", title: "Skipped" },
  cancelled: { kind: "info", title: "Cancelled" },
};

export function ApplicationLive({ initial }: { initial: ApplicationDTO }) {
  const [app, setApp] = useState(initial);
  const [cancelling, setCancelling] = useState(false);
  const live = app.status === "queued" || app.status === "running";

  useEffect(() => {
    if (!live) return;
    const t = setInterval(async () => {
      const res = await fetch(`/api/applications/${app.id}`, { cache: "no-store" });
      if (res.ok) setApp(await res.json());
    }, 2500);
    return () => clearInterval(t);
  }, [live, app.id]);

  async function cancel() {
    setCancelling(true);
    await fetch(`/api/applications/${app.id}/cancel`, { method: "POST" });
    setCancelling(false);
  }

  const outcome = OUTCOME[app.status] ?? OUTCOME.failed;
  const entries = [...app.log].reverse();

  return (
    <>
      <div className="mb-4 text-sm">
        <Link href={`/jobs/${app.job.id}`} className="text-slate-500 hover:underline">
          ← {app.job.title ?? "Job"}
        </Link>
      </div>
      <PageHeader
        title={app.job.title ?? "Application"}
        description={[app.job.company, app.autoSubmit ? "auto-submit" : "review before submit", `started ${formatDate(app.startedAt ?? app.createdAt)}`].filter(Boolean).join(" · ")}
        actions={
          <>
            <Badge status={app.status} />
            {app.job.url && (
              <LinkButton href={app.job.url} external size="sm">
                Posting ↗
              </LinkButton>
            )}
            {live && (
              <Button size="sm" variant="danger" onClick={cancel} disabled={cancelling}>
                {cancelling ? "Cancelling…" : "Cancel"}
              </Button>
            )}
          </>
        }
      />

      <div className="mb-6">
        <Alert kind={outcome.kind}>
          <div className="font-medium">{outcome.title}</div>
          {app.summary && <div className="mt-0.5 whitespace-pre-wrap">{app.summary}</div>}
          {app.status === "needs_review" && <div className="mt-1 text-xs opacity-80">The tab is still open in the agent&apos;s browser window. Finish it there, then close the tab.</div>}
        </Alert>
      </div>

      <Card title="Activity" description={`${app.log.length} steps · ${(app.inputTokens / 1000).toFixed(0)}k input / ${(app.outputTokens / 1000).toFixed(1)}k output tokens`}>
        {entries.length === 0 ? (
          <p className="text-sm text-slate-500">Waiting to start…</p>
        ) : (
          <ol className="space-y-3">
            {entries.map((e, i) => {
              const icon = ICON[e.type] ?? ICON.info;
              return (
                <li key={`${e.t}-${i}`} className="flex gap-3">
                  <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold ${icon.cls}`}>{icon.glyph}</span>
                  <div className="min-w-0 flex-1">
                    <div className={`whitespace-pre-wrap break-words text-sm ${e.type === "error" ? "text-red-700" : e.type === "assistant" ? "italic text-slate-700" : "text-slate-800"}`}>{e.text}</div>
                    <div className="text-[11px] text-slate-400">{new Date(e.t).toLocaleTimeString()}</div>
                    {e.screenshot && (
                      <a href={`/api/applications/${app.id}/screenshots/${e.screenshot}`} target="_blank" rel="noreferrer" className="mt-1 inline-block">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={`/api/applications/${app.id}/screenshots/${e.screenshot}`} alt="Screenshot" className="h-28 rounded border border-slate-200 object-cover object-top shadow-sm hover:opacity-90" />
                      </a>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </Card>
    </>
  );
}
