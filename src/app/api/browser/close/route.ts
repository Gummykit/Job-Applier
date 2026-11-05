import { NextResponse } from "next/server";
import { handle } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { closeBrowser } from "@/lib/browser/context";

export const POST = handle(async () => {
  const user = await requireApiUser();
  await closeBrowser(user.id);
  return NextResponse.json({ ok: true });
});
