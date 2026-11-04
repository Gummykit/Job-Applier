import { handle, jsonError } from "@/lib/api";
import { prisma } from "@/lib/db";
import { renderResumeHtml } from "@/lib/resume/render";
import { type Resume } from "@/lib/schemas";
import { safeJson } from "@/lib/utils";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };

export const GET = handle(async (_req: Request, { params }: Ctx) => {
  const { id } = await params;
  const row = await prisma.tailoredResume.findUnique({ where: { id } });
  if (!row) return jsonError("Not found.", 404);
  const resume = safeJson<Resume | null>(row.resumeJson, null);
  if (!resume) return jsonError("Corrupt resume data.", 500);
  return new Response(renderResumeHtml(resume), { headers: { "Content-Type": "text/html; charset=utf-8" } });
});
