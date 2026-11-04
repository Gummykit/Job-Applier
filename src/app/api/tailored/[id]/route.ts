import { NextResponse } from "next/server";
import { handle, jsonError } from "@/lib/api";
import { prisma } from "@/lib/db";
import { writeResumePdf } from "@/lib/resume/pdf";
import { ResumeSchema } from "@/lib/schemas";

type Ctx = { params: Promise<{ id: string }> };

export const PUT = handle(async (req: Request, { params }: Ctx) => {
  const { id } = await params;
  const body = (await req.json()) as { resume?: unknown; coverLetter?: string };
  const row = await prisma.tailoredResume.findUnique({ where: { id } });
  if (!row) return jsonError("Not found.", 404);
  const data: Record<string, unknown> = {};
  if (body.resume !== undefined) {
    const parsed = ResumeSchema.safeParse(body.resume);
    if (!parsed.success) return jsonError(`Invalid resume: ${parsed.error.issues[0]?.message ?? "schema mismatch"}`);
    data.resumeJson = JSON.stringify(parsed.data);
    data.pdfPath = await writeResumePdf(parsed.data, id);
  }
  if (body.coverLetter !== undefined) data.coverLetter = body.coverLetter;
  await prisma.tailoredResume.update({ where: { id }, data });
  return NextResponse.json({ ok: true });
});

export const DELETE = handle(async (_req: Request, { params }: Ctx) => {
  const { id } = await params;
  await prisma.tailoredResume.delete({ where: { id } });
  return NextResponse.json({ ok: true });
});
