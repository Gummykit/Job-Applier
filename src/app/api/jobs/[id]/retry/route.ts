import { NextResponse } from "next/server";
import { ownedJob } from "@/lib/access";
import { handle } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { enqueueImport } from "@/lib/jobs/import";

type Ctx = { params: Promise<{ id: string }> };

export const POST = handle(async (_req: Request, { params }: Ctx) => {
  const user = await requireApiUser();
  const { id } = await params;
  const job = await ownedJob(id, user.id);
  await prisma.job.update({ where: { id: job.id }, data: { status: "importing", error: null } });
  enqueueImport(job.id);
  return NextResponse.json({ ok: true });
});
