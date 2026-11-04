import Link from "next/link";
import { apiKeyConfigured } from "@/lib/ai";
import { browserStatus } from "@/lib/browser/context";
import { prisma } from "@/lib/db";
import { getProfile } from "@/lib/profile";
import { formatDate } from "@/lib/utils";
import { AutoRefresh } from "@/components/AutoRefresh";
import { Badge, Card, LinkButton, PageHeader, Stat } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const [profile, jobs, recent, counts] = await Promise.all([
    getProfile(),
    prisma.job.findMany({ select: { status: true } }),
    prisma.application.findMany({ orderBy: { createdAt: "desc" }, take: 8, include: { job: { select: { title: true, company: true } } } }),
    prisma.application.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);
  const count = (s: string) => counts.find((c) => c.status === s)?._count._all ?? 0;
  const jobsReady = jobs.filter((j) => j.status === "ready").length;
  const jobsImporting = jobs.filter((j) => j.status === "importing").length;
  const browser = browserStatus();
  const keyOk = apiKeyConfigured();
  const active = count("running") + count("queued") > 0 || jobsImporting > 0;

  const steps = [
    { done: keyOk, label: "Add your Anthropic API key", detail: keyOk ? "Detected in the environment." : "Set ANTHROPIC_API_KEY in .env (or run `ant auth login`), then restart the dev server.", href: "/settings" },
    { done: !!profile, label: "Upload your resume", detail: profile ? `Parsed for ${profile.resume.basics.name}.` : "PDF, DOCX or text. The AI turns it into an editable profile.", href: "/profile" },
    { done: jobsReady > 0, label: "Add the jobs you want", detail: jobsReady ? `${jobsReady} ready to apply.` : "Paste job URLs; each is imported and summarised.", href: "/jobs" },
    { done: count("submitted") > 0, label: "Let the agent apply", detail: count("submitted") ? `${count("submitted")} submitted so far.` : "The agent tailors your resume, fills the form, and submits.", href: "/jobs" },
  ];

  return (
    <>
      <AutoRefresh active={active} />
      <PageHeader title="Dashboard" description="Your resume, target jobs and the agent's applications at a glance." />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Jobs ready" value={jobsReady} hint={jobsImporting ? `${jobsImporting} importing` : undefined} />
        <Stat label="Submitted" value={count("submitted")} />
        <Stat label="Needs your review" value={count("needs_review")} />
        <Stat label="In progress" value={count("running") + count("queued")} hint={count("failed") ? `${count("failed")} failed` : undefined} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        <Card title="Getting started" className="lg:col-span-2">
          <ol className="space-y-3">
            {steps.map((s, i) => (
              <li key={s.label} className="flex gap-3">
                <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${s.done ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-700"}`}>
                  {s.done ? "✓" : i + 1}
                </span>
                <div>
                  <Link href={s.href} className="text-sm font-medium text-slate-900 hover:underline">
                    {s.label}
                  </Link>
                  <div className="text-xs text-slate-500">{s.detail}</div>
                </div>
              </li>
            ))}
          </ol>
          <div className="mt-4 rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-600">
            Browser: {browser.open ? `open (${browser.pages} tab${browser.pages === 1 ? "" : "s"}, ${browser.headless ? "headless" : "visible"})` : "closed, launches on demand"}
          </div>
        </Card>

        <Card title="Recent applications" className="lg:col-span-3" actions={<LinkButton href="/applications" size="sm">View all</LinkButton>}>
          {recent.length === 0 ? (
            <p className="text-sm text-slate-500">No applications yet. Open a job and press “Apply with AI”.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {recent.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <Link href={`/applications/${a.id}`} className="block truncate text-sm font-medium text-slate-900 hover:underline">
                      {a.job.title ?? "Untitled role"}
                      {a.job.company && <span className="font-normal text-slate-500"> · {a.job.company}</span>}
                    </Link>
                    <div className="text-xs text-slate-500">{formatDate(a.createdAt)}</div>
                  </div>
                  <Badge status={a.status} />
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
