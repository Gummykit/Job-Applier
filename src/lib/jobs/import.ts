import { prisma } from "../db";
import { errorMessage } from "../utils";
import { extractJob, fetchPageText } from "./extract";

const g = globalThis as unknown as { aaImportQueue?: string[]; aaImportRunning?: boolean };
g.aaImportQueue ??= [];

export function enqueueImport(jobId: string): void {
  g.aaImportQueue!.push(jobId);
  void drain();
}

async function drain(): Promise<void> {
  if (g.aaImportRunning) return;
  g.aaImportRunning = true;
  try {
    while (g.aaImportQueue!.length) {
      const id = g.aaImportQueue!.shift()!;
      await importJob(id);
    }
  } finally {
    g.aaImportRunning = false;
  }
}

export async function importJob(id: string): Promise<void> {
  const job = await prisma.job.findUnique({ where: { id } });
  if (!job) return;
  await prisma.job.update({ where: { id }, data: { status: "importing", error: null } });
  try {
    let text = job.sourceText ?? "";
    let pageTitle = "";
    if (!text.trim() && job.url) {
      const fetched = await fetchPageText(job.url);
      text = fetched.text;
      pageTitle = fetched.title;
    }
    if (!text.trim()) throw new Error("No text could be read from the page.");
    const ex = await extractJob(text, job.url);
    if (!ex.isJobPosting) throw new Error(`This does not look like a job posting. ${ex.description.slice(0, 300)}`);
    await prisma.job.update({
      where: { id },
      data: {
        status: "ready",
        title: ex.title || pageTitle || "Untitled role",
        company: ex.company,
        location: ex.location,
        description: ex.description,
        details: JSON.stringify({
          remote: ex.remote,
          employmentType: ex.employmentType,
          salary: ex.salary,
          requirements: ex.requirements,
          niceToHave: ex.niceToHave,
          keywords: ex.keywords,
          applyUrl: ex.applyUrl,
        }),
      },
    });
  } catch (e) {
    await prisma.job.update({ where: { id }, data: { status: "failed", error: errorMessage(e) } });
  }
}
