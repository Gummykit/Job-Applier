import fs from "node:fs";
import { prisma } from "../db";
import { EMPTY_DETAILS, type JobDetails } from "../jobs/extract";
import type { LoadedProfile } from "../profile";
import type { Resume } from "../schemas";
import { safeJson } from "../utils";
import { writeCoverLetterPdf, writeResumePdf } from "./pdf";
import { generateCoverLetter, tailorResume, type JobForTailoring } from "./tailor";

export async function jobForTailoring(jobId: string): Promise<JobForTailoring> {
  const job = await prisma.job.findUniqueOrThrow({ where: { id: jobId } });
  if (job.status !== "ready") throw new Error("The job has not been imported successfully yet.");
  const details = { ...EMPTY_DETAILS, ...safeJson<Partial<JobDetails>>(job.details, {}) };
  return {
    title: job.title ?? "",
    company: job.company,
    location: job.location,
    description: job.description ?? "",
    requirements: details.requirements,
    niceToHave: details.niceToHave,
    keywords: details.keywords,
  };
}

/** Runs the AI tailoring + cover letter, renders the PDF, and stores a new TailoredResume row. */
export async function createTailoredResume(jobId: string, profile: LoadedProfile) {
  const job = await jobForTailoring(jobId);
  const [tailored, coverLetter] = await Promise.all([
    tailorResume(profile.resume, job, profile.userId),
    generateCoverLetter(profile.resume, job, profile.userId).catch(() => null),
  ]);
  const row = await prisma.tailoredResume.create({
    data: {
      jobId,
      resumeJson: JSON.stringify(tailored.resume),
      coverLetter,
      changes: JSON.stringify(tailored.changes),
      matchScore: Math.max(0, Math.min(100, Math.round(tailored.matchScore))),
      missingKeywords: JSON.stringify(tailored.missingKeywords),
    },
  });
  const pdfPath = await writeResumePdf(tailored.resume, row.id);
  return prisma.tailoredResume.update({ where: { id: row.id }, data: { pdfPath } });
}

export type ReadyFiles = {
  tailoredId: string;
  resume: Resume;
  coverLetter: string | null;
  resumePdf: string;
  coverLetterPdf: string | null;
};

/** Returns the latest tailored resume for the job (creating one if needed) with its files on disk. */
export async function ensureTailoredResume(jobId: string, profile: LoadedProfile): Promise<ReadyFiles> {
  let row = await prisma.tailoredResume.findFirst({ where: { jobId }, orderBy: { createdAt: "desc" } });
  if (!row) row = await createTailoredResume(jobId, profile);
  const resume = safeJson<Resume>(row.resumeJson, profile.resume);
  let resumePdf = row.pdfPath;
  if (!resumePdf || !fs.existsSync(resumePdf)) {
    resumePdf = await writeResumePdf(resume, row.id);
    await prisma.tailoredResume.update({ where: { id: row.id }, data: { pdfPath: resumePdf } });
  }
  const coverLetterPdf = row.coverLetter ? await writeCoverLetterPdf(row.coverLetter, resume.basics.name, row.id) : null;
  return { tailoredId: row.id, resume, coverLetter: row.coverLetter, resumePdf, coverLetterPdf };
}
