import { NextResponse } from "next/server";
import { ownedJob } from "@/lib/access";
import { handle } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

type Ctx = { params: Promise<{ id: string }> };

export const DELETE = handle(async (_req: Request, { params }: Ctx) => {
  const user = await requireApiUser();
  const { id } = await params;
  const job = await ownedJob(id, user.id);
  await prisma.job.delete({ where: { id: job.id } });
  return NextResponse.json({ ok: true });
});
