import { NextResponse } from "next/server";
import { ownedApplication } from "@/lib/access";
import { handle } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

type Ctx = { params: Promise<{ id: string }> };

export const POST = handle(async (_req: Request, { params }: Ctx) => {
  const user = await requireApiUser();
  const { id } = await params;
  const app = await ownedApplication(id, user.id);
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
