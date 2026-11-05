import { ownedTailored } from "@/lib/access";
import { handle, jsonError } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { renderResumeHtml } from "@/lib/resume/render";
import { type Resume } from "@/lib/schemas";
import { safeJson } from "@/lib/utils";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };

export const GET = handle(async (_req: Request, { params }: Ctx) => {
  const user = await requireApiUser();
  const { id } = await params;
  const row = await ownedTailored(id, user.id);
  const resume = safeJson<Resume | null>(row.resumeJson, null);
  if (!resume) return jsonError("Corrupt resume data.", 500);
  return new Response(renderResumeHtml(resume), { headers: { "Content-Type": "text/html; charset=utf-8" } });
});
