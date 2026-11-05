import { prisma } from "./db";

export type Settings = {
  model: string;
  headless: boolean;
  autoSubmit: boolean;
};

export const DEFAULT_MODEL = "claude-opus-5-5";

export async function getSettings(userId: string): Promise<Settings> {
  const s = await prisma.setting.findUnique({ where: { userId } });
  return {
    model: s?.model || process.env.AUTOAPPLY_MODEL || DEFAULT_MODEL,
    headless: s?.headless ?? false,
    autoSubmit: s?.autoSubmit ?? true,
  };
}

export async function saveSettings(userId: string, input: Partial<Settings>): Promise<Settings> {
  await prisma.setting.upsert({
    where: { userId },
    create: { userId, model: input.model || null, headless: input.headless ?? false, autoSubmit: input.autoSubmit ?? true },
    update: {
      ...(input.model !== undefined ? { model: input.model || null } : {}),
      ...(input.headless !== undefined ? { headless: input.headless } : {}),
      ...(input.autoSubmit !== undefined ? { autoSubmit: input.autoSubmit } : {}),
    },
  });
  return getSettings(userId);
}
