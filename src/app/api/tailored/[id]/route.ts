import { NextResponse } from "next/server";
import { ownedTailored } from "@/lib/access";
import { handle, jsonError } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { writeResumePdf } from "@/lib/resume/pdf";
import { ResumeSchema } from "@/lib/schemas";

type Ctx = { params: Promise<{ id: string }> };

export const PUT = handle(async (req: Request, { params }: Ctx) => {
  const user = await requireApiUser();
  const { id } = await params;
  const row = await ownedTailored(id, user.id);
  const body = (await req.json()) as { resume?: unknown; coverLetter?: string };
  const data: Record<string, unknown> = {};
  if (body.resume !== undefined) {
    const parsed = ResumeSchema.safeParse(body.resume);
    if (!parsed.success) return jsonError(`Invalid resume: ${parsed.error.issues[0]?.message ?? "schema mismatch"}`);
    data.resumeJson = JSON.stringify(parsed.data);
    data.pdfPath = await writeResumePdf(parsed.data, row.id);
  }
  if (body.coverLetter !== undefined) data.coverLetter = body.coverLetter;
  await prisma.tailoredResume.update({ where: { id: row.id }, data });
  return NextResponse.json({ ok: true });
});

export const DELETE = handle(async (_req: Request, { params }: Ctx) => {
  const user = await requireApiUser();
  const { id } = await params;
  const row = await ownedTailored(id, user.id);
  await prisma.tailoredResume.delete({ where: { id: row.id } });
  return NextResponse.json({ ok: true });
});
