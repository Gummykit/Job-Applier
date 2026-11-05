import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/utils";
import { AddJobsForm } from "@/components/AddJobsForm";
import { AutoRefresh } from "@/components/AutoRefresh";
import { JobActions } from "@/components/JobActions";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function JobsPage() {
  const user = await requireUser();
  const jobs = await prisma.job.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: {
      tailored: { orderBy: { createdAt: "desc" }, take: 1, select: { matchScore: true } },
      applications: { orderBy: { createdAt: "desc" }, take: 1, select: { id: true, status: true } },
    },
  });
  const importing = jobs.some((j) => j.status === "importing");

  return (
    <>
      <AutoRefresh active={importing} intervalMs={3000} />
      <PageHeader title="Jobs" description="Add every posting you want to apply to. Each one is imported, summarised and scored against your resume." />
      <div className="space-y-6">
        <AddJobsForm />
        {jobs.length === 0 ? (
          <EmptyState title="No jobs yet" description="Paste one or more job URLs above. LinkedIn, Indeed, Greenhouse, Lever, Workday and company career pages all work." />
        ) : (
          <Card className="overflow-hidden" title={`${jobs.length} job${jobs.length === 1 ? "" : "s"}`}>
            <div className="-mx-5 -my-4 overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-5 py-2.5 font-medium">Role</th>
                    <th className="px-3 py-2.5 font-medium">Location</th>
                    <th className="px-3 py-2.5 font-medium">Import</th>
                    <th className="px-3 py-2.5 font-medium">Fit</th>
                    <th className="px-3 py-2.5 font-medium">Application</th>
                    <th className="px-3 py-2.5 font-medium">Added</th>
                    <th className="px-5 py-2.5 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {jobs.map((j) => {
                    const app = j.applications[0];
                    const score = j.tailored[0]?.matchScore;
                    return (
                      <tr key={j.id} className="hover:bg-slate-50/60">
                        <td className="max-w-sm px-5 py-3">
                          <Link href={`/jobs/${j.id}`} className="block truncate font-medium text-slate-900 hover:underline">
                            {j.title ?? (j.status === "importing" ? "Importing…" : "Untitled role")}
                          </Link>
                          <div className="truncate text-xs text-slate-500">{j.company ?? j.url ?? "Pasted description"}</div>
                          {j.status === "failed" && j.error && <div className="mt-0.5 truncate text-xs text-red-600">{j.error}</div>}
                        </td>
                        <td className="px-3 py-3 text-slate-600">{j.location ?? "—"}</td>
                        <td className="px-3 py-3">
                          <Badge status={j.status} />
                        </td>
                        <td className="px-3 py-3 text-slate-700">{score != null ? `${score}%` : "—"}</td>
                        <td className="px-3 py-3">
                          {app ? (
                            <Link href={`/applications/${app.id}`}>
                              <Badge status={app.status} />
                            </Link>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-3 py-3 text-xs text-slate-500">{formatDate(j.createdAt)}</td>
                        <td className="px-5 py-3 text-right">
                          <JobActions id={j.id} status={j.status} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </>
  );
}
