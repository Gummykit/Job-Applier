import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { handle, jsonError } from "@/lib/api";
import { createSession, hashPassword, normalizeEmail, signupAllowed } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const POST = handle(async (req: Request) => {
  if (!signupAllowed()) return jsonError("Sign-ups are disabled on this server.", 403);
  const body = (await req.json().catch(() => ({}))) as { email?: string; password?: string; name?: string };
  const email = normalizeEmail(body.email ?? "");
  const password = body.password ?? "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return jsonError("Enter a valid email address.");
  if (password.length < 8) return jsonError("Use a password of at least 8 characters.");
  try {
    const user = await prisma.user.create({
      data: { email, name: body.name?.trim() || null, passwordHash: await hashPassword(password) },
    });
    await createSession(user.id);
    return NextResponse.json({ ok: true, user: { id: user.id, email: user.email, name: user.name } });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return jsonError("An account with that email already exists. Sign in instead.", 409);
    }
    throw e;
  }
});
