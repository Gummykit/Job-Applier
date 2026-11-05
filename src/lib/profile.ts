import { prisma } from "./db";
import { DEFAULT_PREFERENCES, type Preferences } from "./preferences";
import { emptyResume, type Resume } from "./schemas";
import { safeJson } from "./utils";

export type LoadedProfile = {
  id: string;
  userId: string;
  resume: Resume;
  preferences: Preferences;
  originalFile: string | null;
  originalName: string | null;
  updatedAt: Date;
};

export async function getProfile(userId: string): Promise<LoadedProfile | null> {
  const p = await prisma.profile.findUnique({ where: { userId } });
  if (!p) return null;
  return {
    id: p.id,
    userId: p.userId,
    resume: safeJson<Resume>(p.resumeJson, emptyResume()),
    preferences: { ...DEFAULT_PREFERENCES, ...safeJson<Partial<Preferences>>(p.preferences, {}) },
    originalFile: p.originalFile,
    originalName: p.originalName,
    updatedAt: p.updatedAt,
  };
}
