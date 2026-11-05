import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/utils";
import { AutoRefresh } from "@/components/AutoRefresh";
import { Badge, Card, EmptyState, LinkButton, PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function ApplicationsPage() {
  const user = await requireUser();
  const apps = await prisma.application.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, include: { job: { select: { id: true, title: true, company: true } } } });
  const active = apps.some((a) => a.status === "running" || a.status === "queued");
  return (
    <>
      <AutoRefresh active={active} intervalMs={3000} />
      <PageHeader title="Applications" description="Every run of the agent, with its outcome and a step-by-step log." />
      {apps.length === 0 ? (
        <EmptyState title="No applications yet" description="Open a job and press “Apply with AI”." action={<LinkButton href="/jobs" variant="primary">Go to jobs</LinkButton>} />
      ) : (
        <Card className="overflow-hidden">
          <div className="-mx-5 -my-4 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-2.5 font-medium">Role</th>
                  <th className="px-3 py-2.5 font-medium">Status</th>
                  <th className="px-3 py-2.5 font-medium">Mode</th>
                  <th className="px-3 py-2.5 font-medium">Summary</th>
                  <th className="px-5 py-2.5 font-medium">Started</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {apps.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50/60">
                    <td className="max-w-xs px-5 py-3">
                      <Link href={`/applications/${a.id}`} className="block truncate font-medium text-slate-900 hover:underline">
                        {a.job.title ?? "Untitled role"}
                      </Link>
                      <div className="truncate text-xs text-slate-500">{a.job.company ?? ""}</div>
                    </td>
                    <td className="px-3 py-3">
                      <Badge status={a.status} />
                    </td>
                    <td className="px-3 py-3 text-xs text-slate-600">{a.autoSubmit ? "Auto-submit" : "Review first"}</td>
                    <td className="max-w-md px-3 py-3">
                      <div className="line-clamp-2 text-xs text-slate-600">{a.summary ?? "—"}</div>
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 text-xs text-slate-500">{formatDate(a.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </>
  );
}
