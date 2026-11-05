import { NextResponse } from "next/server";
import { handle } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { saveSettings } from "@/lib/settings";

export const PUT = handle(async (req: Request) => {
  const user = await requireApiUser();
  const body = (await req.json()) as { model?: string; headless?: boolean; autoSubmit?: boolean };
  const settings = await saveSettings(user.id, body);
  return NextResponse.json(settings);
});
