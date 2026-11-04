import fs from "node:fs";
import path from "node:path";
import { handle, jsonError } from "@/lib/api";
import { APPLICATIONS_DIR } from "@/lib/paths";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string; file: string }> };

export const GET = handle(async (_req: Request, { params }: Ctx) => {
  const { id, file } = await params;
  if (!/^[A-Za-z0-9_-]+$/.test(id) || !/^[A-Za-z0-9_-]+\.jpg$/.test(file)) return jsonError("Bad path.");
  const full = path.join(APPLICATIONS_DIR, id, file);
  if (!fs.existsSync(full)) return jsonError("Not found.", 404);
  const bytes = await fs.promises.readFile(full);
  return new Response(new Uint8Array(bytes), {
    headers: { "Content-Type": "image/jpeg", "Cache-Control": "private, max-age=3600" },
  });
});
