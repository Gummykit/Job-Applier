import { NextResponse } from "next/server";
import { handle, jsonError } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ResumeSchema } from "@/lib/schemas";

export const PUT = handle(async (req: Request) => {
  const user = await requireApiUser();
  const body = (await req.json()) as { resume?: unknown; preferences?: Record<string, string> };
  const existing = await prisma.profile.findUnique({ where: { userId: user.id } });
  if (!existing) return jsonError("Upload a resume first.", 404);

  const data: Record<string, unknown> = {};
  if (body.resume !== undefined) {
    const parsed = ResumeSchema.safeParse(body.resume);
    if (!parsed.success) return jsonError(`Invalid resume: ${parsed.error.issues[0]?.message ?? "schema mismatch"}`);
    data.resumeJson = JSON.stringify(parsed.data);
    data.fullName = parsed.data.basics.name;
    data.email = parsed.data.basics.email;
    data.phone = parsed.data.basics.phone;
    data.location = parsed.data.basics.location;
  }
  if (body.preferences !== undefined) data.preferences = JSON.stringify(body.preferences);
  await prisma.profile.update({ where: { userId: user.id }, data });
  return NextResponse.json({ ok: true });
});
