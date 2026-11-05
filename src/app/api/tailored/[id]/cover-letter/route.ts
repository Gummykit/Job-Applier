import { NextResponse } from "next/server";
import { ownedTailored } from "@/lib/access";
import { handle, jsonError } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { jobForTailoring } from "@/lib/resume/ensure";
import { generateCoverLetter } from "@/lib/resume/tailor";
import { type Resume } from "@/lib/schemas";
import { safeJson } from "@/lib/utils";

export const maxDuration = 300;
type Ctx = { params: Promise<{ id: string }> };

export const POST = handle(async (_req: Request, { params }: Ctx) => {
  const user = await requireApiUser();
  const { id } = await params;
  const row = await ownedTailored(id, user.id);
  const resume = safeJson<Resume | null>(row.resumeJson, null);
  if (!resume) return jsonError("Corrupt resume data.", 500);
  const coverLetter = await generateCoverLetter(resume, await jobForTailoring(row.jobId), user.id);
  await prisma.tailoredResume.update({ where: { id: row.id }, data: { coverLetter } });
  return NextResponse.json({ ok: true, coverLetter });
});
