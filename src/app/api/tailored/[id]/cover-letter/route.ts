import { NextResponse } from "next/server";
import { handle, jsonError } from "@/lib/api";
import { prisma } from "@/lib/db";
import { jobForTailoring } from "@/lib/resume/ensure";
import { generateCoverLetter } from "@/lib/resume/tailor";
import { type Resume } from "@/lib/schemas";
import { safeJson } from "@/lib/utils";

export const maxDuration = 300;
type Ctx = { params: Promise<{ id: string }> };

export const POST = handle(async (_req: Request, { params }: Ctx) => {
  const { id } = await params;
  const row = await prisma.tailoredResume.findUnique({ where: { id } });
  if (!row) return jsonError("Not found.", 404);
  const resume = safeJson<Resume | null>(row.resumeJson, null);
  if (!resume) return jsonError("Corrupt resume data.", 500);
  const coverLetter = await generateCoverLetter(resume, await jobForTailoring(row.jobId));
  await prisma.tailoredResume.update({ where: { id }, data: { coverLetter } });
  return NextResponse.json({ ok: true, coverLetter });
});
