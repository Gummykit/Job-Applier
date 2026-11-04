import { NextResponse } from "next/server";
import { enqueueApplication } from "@/lib/agent/queue";
import { handle, jsonError } from "@/lib/api";
import { prisma } from "@/lib/db";
import { getProfile } from "@/lib/profile";
import { getSettings } from "@/lib/settings";

type Ctx = { params: Promise<{ id: string }> };

export const POST = handle(async (req: Request, { params }: Ctx) => {
  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as { autoSubmit?: boolean };
  const job = await prisma.job.findUnique({ where: { id } });
  if (!job) return jsonError("Job not found.", 404);
  if (job.status !== "ready") return jsonError("The job has not finished importing.");
  if (!job.url) return jsonError("This job has no URL to apply at. Add it again with its posting URL.");
  if (!(await getProfile())) return jsonError("Upload a resume first.");

  const active = await prisma.application.findFirst({ where: { jobId: id, status: { in: ["queued", "running"] } } });
  if (active) return NextResponse.json({ ok: true, id: active.id, existing: true });

  const settings = await getSettings();
  const app = await prisma.application.create({
    data: { jobId: id, autoSubmit: body.autoSubmit ?? settings.autoSubmit, status: "queued" },
  });
  enqueueApplication(app.id);
  return NextResponse.json({ ok: true, id: app.id });
});
