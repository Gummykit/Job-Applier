import { NextResponse } from "next/server";
import { handle, jsonError } from "@/lib/api";
import { getProfile } from "@/lib/profile";
import { createTailoredResume } from "@/lib/resume/ensure";

export const maxDuration = 600;
type Ctx = { params: Promise<{ id: string }> };

export const POST = handle(async (_req: Request, { params }: Ctx) => {
  const { id } = await params;
  const profile = await getProfile();
  if (!profile) return jsonError("Upload a resume first.");
  const row = await createTailoredResume(id, profile);
  return NextResponse.json({ ok: true, id: row.id, matchScore: row.matchScore });
});
