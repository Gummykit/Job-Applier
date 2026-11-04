import fs from "node:fs";
import path from "node:path";

export const DATA_DIR = path.resolve(process.cwd(), ".data");
export const UPLOADS_DIR = path.join(DATA_DIR, "uploads");
export const RESUMES_DIR = path.join(DATA_DIR, "resumes");
export const APPLICATIONS_DIR = path.join(DATA_DIR, "applications");
export const BROWSER_PROFILE_DIR = path.join(DATA_DIR, "browser-profile");

export function ensureDirs() {
  for (const dir of [DATA_DIR, UPLOADS_DIR, RESUMES_DIR, APPLICATIONS_DIR, BROWSER_PROFILE_DIR]) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export function applicationDir(id: string) {
  const dir = path.join(APPLICATIONS_DIR, id);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}
