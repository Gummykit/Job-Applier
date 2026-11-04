import { NextResponse } from "next/server";
import { handle, jsonError } from "@/lib/api";
import { prisma } from "@/lib/db";
import { enqueueImport } from "@/lib/jobs/import";

export const POST = handle(async (req: Request) => {
  const body = (await req.json()) as { urls?: string[]; text?: string; url?: string };
  const created: string[] = [];

  const urls = (body.urls ?? [])
    .map((u) => u.trim())
    .filter(Boolean)
    .map((u) => (/^https?:\/\//i.test(u) ? u : `https://${u}`));
  for (const url of urls) {
    const job = await prisma.job.create({ data: { url, status: "importing" } });
    created.push(job.id);
  }
  if (body.text && body.text.trim()) {
    const job = await prisma.job.create({
      data: { url: body.url?.trim() || null, sourceText: body.text.trim(), status: "importing" },
    });
    created.push(job.id);
  }
  if (!created.length) return jsonError("Provide at least one job URL or a pasted job description.");
  for (const id of created) enqueueImport(id);
  return NextResponse.json({ ok: true, ids: created });
});
