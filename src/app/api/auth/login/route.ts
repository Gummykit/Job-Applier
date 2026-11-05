import { NextResponse } from "next/server";
import { handle, jsonError } from "@/lib/api";
import { createSession, normalizeEmail, verifyPassword } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const POST = handle(async (req: Request) => {
  const body = (await req.json().catch(() => ({}))) as { email?: string; password?: string };
  const email = normalizeEmail(body.email ?? "");
  const user = await prisma.user.findUnique({ where: { email } });
  const ok = user ? await verifyPassword(body.password ?? "", user.passwordHash) : false;
  if (!user || !ok) return jsonError("Incorrect email or password.", 401);
  await createSession(user.id);
  return NextResponse.json({ ok: true, user: { id: user.id, email: user.email, name: user.name } });
});
