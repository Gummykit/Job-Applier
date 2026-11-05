import { NextResponse } from "next/server";
import { ownedApplication } from "@/lib/access";
import { handle } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { safeJson } from "@/lib/utils";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };

export const GET = handle(async (_req: Request, { params }: Ctx) => {
  const user = await requireApiUser();
  const { id } = await params;
  await ownedApplication(id, user.id);
  const app = await prisma.application.findUniqueOrThrow({
    where: { id },
    include: { job: { select: { id: true, title: true, company: true, url: true } } },
  });
  return NextResponse.json({ ...app, log: safeJson(app.log, []) });
});

export const DELETE = handle(async (_req: Request, { params }: Ctx) => {
  const user = await requireApiUser();
  const { id } = await params;
  await ownedApplication(id, user.id);
  await prisma.application.delete({ where: { id } });
  return NextResponse.json({ ok: true });
});
