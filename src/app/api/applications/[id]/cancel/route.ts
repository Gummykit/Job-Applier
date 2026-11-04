import { NextResponse } from "next/server";
import { handle, jsonError } from "@/lib/api";
import { prisma } from "@/lib/db";

type Ctx = { params: Promise<{ id: string }> };

export const POST = handle(async (_req: Request, { params }: Ctx) => {
  const { id } = await params;
  const app = await prisma.application.findUnique({ where: { id } });
  if (!app) return jsonError("Not found.", 404);
  if (app.status === "queued") {
    await prisma.application.update({
      where: { id },
      data: { status: "cancelled", cancelRequested: true, summary: "Cancelled before it started.", finishedAt: new Date() },
    });
  } else if (app.status === "running") {
    await prisma.application.update({ where: { id }, data: { cancelRequested: true } });
  }
  return NextResponse.json({ ok: true });
});
