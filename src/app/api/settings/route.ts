import { NextResponse } from "next/server";
import { handle } from "@/lib/api";
import { saveSettings } from "@/lib/settings";

export const PUT = handle(async (req: Request) => {
  const body = (await req.json()) as { model?: string; headless?: boolean; autoSubmit?: boolean };
  const settings = await saveSettings(body);
  return NextResponse.json(settings);
});
