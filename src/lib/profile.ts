import { prisma } from "./db";
import { DEFAULT_PREFERENCES, type Preferences } from "./preferences";
import { emptyResume, type Resume } from "./schemas";
import { safeJson } from "./utils";

export const PROFILE_ID = "default";

export type LoadedProfile = {
  id: string;
  resume: Resume;
  preferences: Preferences;
  originalFile: string | null;
  originalName: string | null;
  updatedAt: Date;
};

export async function getProfile(): Promise<LoadedProfile | null> {
  const p = await prisma.profile.findUnique({ where: { id: PROFILE_ID } });
  if (!p) return null;
  return {
    id: p.id,
    resume: safeJson<Resume>(p.resumeJson, emptyResume()),
    preferences: { ...DEFAULT_PREFERENCES, ...safeJson<Partial<Preferences>>(p.preferences, {}) },
    originalFile: p.originalFile,
    originalName: p.originalName,
    updatedAt: p.updatedAt,
  };
}
