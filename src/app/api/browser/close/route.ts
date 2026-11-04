import { NextResponse } from "next/server";
import { handle } from "@/lib/api";
import { closeBrowser } from "@/lib/browser/context";

export const POST = handle(async () => {
  await closeBrowser();
  return NextResponse.json({ ok: true });
});
