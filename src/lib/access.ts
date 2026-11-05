import { prisma } from "./db";
import { HttpError } from "./errors";

/** Ownership checks: every lookup is scoped to the signed-in user, so other users' ids look like 404s. */

export async function ownedJob(id: string, userId: string) {
  const job = await prisma.job.findFirst({ where: { id, userId } });
  if (!job) throw new HttpError(404, "Job not found.");
  return job;
}

export async function ownedTailored(id: string, userId: string) {
  const row = await prisma.tailoredResume.findFirst({ where: { id, job: { userId } } });
  if (!row) throw new HttpError(404, "Tailored resume not found.");
  return row;
}

export async function ownedApplication(id: string, userId: string) {
  const app = await prisma.application.findFirst({ where: { id, userId } });
  if (!app) throw new HttpError(404, "Application not found.");
  return app;
}
