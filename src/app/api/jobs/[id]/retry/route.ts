import { NextResponse } from "next/server";
import { handle, jsonError } from "@/lib/api";
import { prisma } from "@/lib/db";
import { enqueueImport } from "@/lib/jobs/import";

type Ctx = { params: Promise<{ id: string }> };

export const POST = handle(async (_req: Request, { params }: Ctx) => {
  const { id } = await params;
  const job = await prisma.job.findUnique({ where: { id } });
  if (!job) return jsonError("Job not found.", 404);
  await prisma.job.update({ where: { id }, data: { status: "importing", error: null } });
  enqueueImport(id);
  return NextResponse.json({ ok: true });
});
