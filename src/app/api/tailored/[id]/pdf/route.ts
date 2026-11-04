import fs from "node:fs";
import path from "node:path";
import { handle, jsonError } from "@/lib/api";
import { prisma } from "@/lib/db";
import { writeResumePdf } from "@/lib/resume/pdf";
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
  let pdfPath = row.pdfPath;
  if (!pdfPath || !fs.existsSync(pdfPath)) {
    pdfPath = await writeResumePdf(resume, id);
    await prisma.tailoredResume.update({ where: { id }, data: { pdfPath } });
  }
  const bytes = await fs.promises.readFile(pdfPath);
  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${path.basename(pdfPath)}"`,
    },
  });
});
