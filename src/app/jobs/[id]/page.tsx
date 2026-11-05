import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { EMPTY_DETAILS, type JobDetails } from "@/lib/jobs/extract";
import { getProfile } from "@/lib/profile";
import { type Resume } from "@/lib/schemas";
import { getSettings } from "@/lib/settings";
import { formatDate, safeJson } from "@/lib/utils";
import { ApplyPanel } from "@/components/ApplyPanel";
import { AutoRefresh } from "@/components/AutoRefresh";
import { JobActions } from "@/components/JobActions";
import { TailorPanel } from "@/components/TailorPanel";
import { Alert, Badge, Card, LinkButton, PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function JobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const [job, profile, settings] = await Promise.all([
    prisma.job.findFirst({
      where: { id, userId: user.id },
      include: {
        tailored: { orderBy: { createdAt: "desc" }, take: 1 },
        applications: { orderBy: { createdAt: "desc" } },
      },
    }),
    getProfile(user.id),
    getSettings(user.id),
  ]);
  if (!job) notFound();

  const details = { ...EMPTY_DETAILS, ...safeJson<Partial<JobDetails>>(job.details, {}) };
  const t = job.tailored[0];
  const tailored = t
    ? {
        id: t.id,
        matchScore: t.matchScore,
        changes: safeJson<string[]>(t.changes, []),
        missingKeywords: safeJson<string[]>(t.missingKeywords, []),
        coverLetter: t.coverLetter,
        resume: safeJson<Resume | null>(t.resumeJson, null),
        updatedAt: formatDate(t.updatedAt),
      }
    : null;
  const activeApp = job.applications.find((a) => a.status === "queued" || a.status === "running");
  const reason = !profile ? "Upload a resume first." : job.status !== "ready" ? "Wait for the import to finish." : !job.url ? "This job has no URL. Re-add it with the posting link." : activeApp ? "An application is already in progress." : null;

  return (
    <>
      <AutoRefresh active={job.status === "importing" || !!activeApp} intervalMs={3000} />
      <div className="mb-4 text-sm">
        <Link href="/jobs" className="text-slate-500 hover:underline">
          ← All jobs
        </Link>
      </div>
      <PageHeader
        title={job.title ?? (job.status === "importing" ? "Importing…" : "Untitled role")}
        description={[job.company, job.location, details.employmentType, details.remote !== "unknown" ? details.remote : null, details.salary].filter(Boolean).join(" · ")}
        actions={
          <>
            {job.url && (
              <LinkButton href={job.url} external size="sm">
                Open posting ↗
              </LinkButton>
            )}
            <JobActions id={job.id} status={job.status} redirectAfterDelete="/jobs" />
          </>
        }
      />

      {job.status === "failed" && <div className="mb-6"><Alert kind="error">Import failed: {job.error}</Alert></div>}
      {job.status === "importing" && <div className="mb-6"><Alert kind="info">Importing the posting and extracting its requirements…</Alert></div>}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <TailorPanel jobId={job.id} tailored={tailored} canTailor={!!profile && job.status === "ready"} />
          <Card title="Job description">
            {details.requirements.length > 0 && (
              <div className="mb-4">
                <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Requirements</h3>
                <ul className="list-disc space-y-0.5 pl-5 text-sm text-slate-800">
                  {details.requirements.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </div>
            )}
            {details.niceToHave.length > 0 && (
              <div className="mb-4">
                <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Nice to have</h3>
                <ul className="list-disc space-y-0.5 pl-5 text-sm text-slate-800">
                  {details.niceToHave.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </div>
            )}
            {details.keywords.length > 0 && (
              <div className="mb-4 flex flex-wrap gap-1.5">
                {details.keywords.map((k) => (
                  <span key={k} className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700">
                    {k}
                  </span>
                ))}
              </div>
            )}
            <div className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{job.description ?? "—"}</div>
          </Card>
        </div>

        <div className="space-y-6">
          <ApplyPanel jobId={job.id} defaultAutoSubmit={settings.autoSubmit} disabledReason={reason} />
          <Card title="Applications">
            {job.applications.length === 0 ? (
              <p className="text-sm text-slate-500">None yet.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {job.applications.map((a) => (
                  <li key={a.id} className="py-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <Link href={`/applications/${a.id}`} className="text-sm font-medium text-slate-900 hover:underline">
                        {formatDate(a.createdAt)}
                      </Link>
                      <Badge status={a.status} />
                    </div>
                    {a.summary && <div className="mt-0.5 line-clamp-2 text-xs text-slate-500">{a.summary}</div>}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
