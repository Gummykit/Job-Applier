import fs from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { handle, jsonError } from "@/lib/api";
import { prisma } from "@/lib/db";
import { UPLOADS_DIR, ensureDirs } from "@/lib/paths";
import { PROFILE_ID } from "@/lib/profile";
import { extractResumeContent, parseResume } from "@/lib/resume/parse";

export const maxDuration = 300;

export const POST = handle(async (req: Request) => {
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return jsonError("Attach a resume file.");
  if (file.size > 20 * 1024 * 1024) return jsonError("File is larger than 20 MB.");

  ensureDirs();
  const buffer = Buffer.from(await file.arrayBuffer());
  const safeName = path.basename(file.name).replace(/[^A-Za-z0-9._-]+/g, "_");
  const stored = path.join(UPLOADS_DIR, `${Date.now()}-${safeName}`);
  await fs.writeFile(stored, buffer);

  const content = await extractResumeContent(buffer, file.name);
  const resume = await parseResume(content);
  const fields = {
    fullName: resume.basics.name,
    email: resume.basics.email,
    phone: resume.basics.phone,
    location: resume.basics.location,
    resumeJson: JSON.stringify(resume),
    rawText: content.kind === "text" ? content.text : null,
    originalFile: stored,
    originalName: file.name,
  };
  const profile = await prisma.profile.upsert({
    where: { id: PROFILE_ID },
    create: { id: PROFILE_ID, ...fields },
    update: fields,
  });
  return NextResponse.json({ ok: true, profileId: profile.id, name: resume.basics.name });
});
