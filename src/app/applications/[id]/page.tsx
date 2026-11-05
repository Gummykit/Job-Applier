import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { LogEntry } from "@/lib/agent/run";
import { safeJson } from "@/lib/utils";
import { ApplicationLive } from "@/components/ApplicationLive";

export const dynamic = "force-dynamic";

export default async function ApplicationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const app = await prisma.application.findFirst({ where: { id, userId: user.id }, include: { job: { select: { id: true, title: true, company: true, url: true } } } });
  if (!app) notFound();
  return (
    <ApplicationLive
      initial={{
        id: app.id,
        status: app.status,
        summary: app.summary,
        autoSubmit: app.autoSubmit,
        log: safeJson<LogEntry[]>(app.log, []),
        inputTokens: app.inputTokens,
        outputTokens: app.outputTokens,
        createdAt: app.createdAt.toISOString(),
        startedAt: app.startedAt?.toISOString() ?? null,
        finishedAt: app.finishedAt?.toISOString() ?? null,
        job: app.job,
      }}
    />
  );
}
