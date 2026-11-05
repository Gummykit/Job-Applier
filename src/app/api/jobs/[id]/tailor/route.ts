import { NextResponse } from "next/server";
import { ownedJob } from "@/lib/access";
import { handle, jsonError } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { getProfile } from "@/lib/profile";
import { createTailoredResume } from "@/lib/resume/ensure";

export const maxDuration = 600;
type Ctx = { params: Promise<{ id: string }> };

export const POST = handle(async (_req: Request, { params }: Ctx) => {
  const user = await requireApiUser();
  const { id } = await params;
  const job = await ownedJob(id, user.id);
  const profile = await getProfile(user.id);
  if (!profile) return jsonError("Upload a resume first.");
  const row = await createTailoredResume(job.id, profile);
  return NextResponse.json({ ok: true, id: row.id, matchScore: row.matchScore });
});
