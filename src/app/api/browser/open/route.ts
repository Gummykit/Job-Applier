import { NextResponse } from "next/server";
import { handle, jsonError } from "@/lib/api";
import { getBrowserContext } from "@/lib/browser/context";
import { getSettings } from "@/lib/settings";

export const POST = handle(async (req: Request) => {
  const body = (await req.json().catch(() => ({}))) as { url?: string };
  const url = (body.url ?? "").trim();
  if (!/^https?:\/\//i.test(url)) return jsonError("Enter a full URL starting with https://");
  const { headless } = await getSettings();
  if (headless) return jsonError("The browser is in headless mode. Turn off headless in Settings, restart the browser, and try again.");
  const ctx = await getBrowserContext();
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 }).catch(() => {});
  return NextResponse.json({ ok: true });
});
