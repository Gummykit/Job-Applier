import fs from "node:fs";
import path from "node:path";
import { ownedTailored } from "@/lib/access";
import { handle, jsonError } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { writeResumePdf } from "@/lib/resume/pdf";
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
  let pdfPath = row.pdfPath;
  if (!pdfPath || !fs.existsSync(pdfPath)) {
    pdfPath = await writeResumePdf(resume, row.id);
    await prisma.tailoredResume.update({ where: { id: row.id }, data: { pdfPath } });
  }
  const bytes = await fs.promises.readFile(pdfPath);
  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${path.basename(pdfPath)}"`,
    },
  });
});
