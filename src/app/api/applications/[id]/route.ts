import { NextResponse } from "next/server";
import { handle, jsonError } from "@/lib/api";
import { prisma } from "@/lib/db";
import { safeJson } from "@/lib/utils";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };

export const GET = handle(async (_req: Request, { params }: Ctx) => {
  const { id } = await params;
  const app = await prisma.application.findUnique({
    where: { id },
    include: { job: { select: { id: true, title: true, company: true, url: true } } },
  });
  if (!app) return jsonError("Not found.", 404);
  return NextResponse.json({ ...app, log: safeJson(app.log, []) });
});

export const DELETE = handle(async (_req: Request, { params }: Ctx) => {
  const { id } = await params;
  await prisma.application.delete({ where: { id } });
  return NextResponse.json({ ok: true });
});
