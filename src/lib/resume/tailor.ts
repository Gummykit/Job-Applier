import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { ai, refusalError } from "../ai";
import { getSettings } from "../settings";
import { TailorSchema, type Resume, type TailorResult } from "../schemas";

export type JobForTailoring = {
  title: string;
  company: string | null;
  location: string | null;
  description: string;
  requirements: string[];
  niceToHave: string[];
  keywords: string[];
};

function jobBlock(job: JobForTailoring): string {
  return `<job>
Title: ${job.title}
Company: ${job.company ?? "unknown"}
Location: ${job.location ?? "unknown"}

Requirements:
${job.requirements.map((r) => `- ${r}`).join("\n") || "- (none listed)"}

Nice to have:
${job.niceToHave.map((r) => `- ${r}`).join("\n") || "- (none listed)"}

ATS keywords: ${job.keywords.join(", ") || "(none)"}

Description:
${job.description}
</job>`;
}

const TAILOR_SYSTEM = `You are an expert resume writer and technical recruiter. Rewrite the candidate's resume so it targets a specific job, while staying completely truthful.

Rules:
- Never invent employers, titles, dates, degrees, certifications, metrics, tools, or skills the candidate does not evidence. You may rephrase, reorder, emphasize, condense, merge, and drop less relevant bullets.
- Mirror the job's terminology where the candidate's experience genuinely matches it, so an ATS keyword scan picks it up.
- Write a targeted headline and a 2-4 sentence summary aimed at this role.
- Order skill categories and items by relevance to the job. Order experience bullets so the most relevant come first.
- Bullets: one line each, start with a strong verb, keep the candidate's real numbers.
- Keep contact details, links, education, certifications and languages factually unchanged (reordering is fine).
- changes: list each concrete edit you made. missingKeywords: important requirements the candidate does not evidence (do not add them to the resume). matchScore: an honest 0-100 estimate of fit.`;

export async function tailorResume(resume: Resume, job: JobForTailoring, userId: string): Promise<TailorResult> {
  const { model } = await getSettings(userId);
  const res = await ai().messages.parse({
    model,
    max_tokens: 16000,
    system: TAILOR_SYSTEM,
    output_config: { effort: "high", format: zodOutputFormat(TailorSchema) },
    messages: [
      {
        role: "user",
        content: `${jobBlock(job)}\n\n<resume_json>\n${JSON.stringify(resume, null, 1)}\n</resume_json>\n\nProduce the tailored resume for this job.`,
      },
    ],
  });
  const err = refusalError(res);
  if (err) throw err;
  if (!res.parsed_output) throw new Error("The tailored resume could not be generated.");
  return res.parsed_output;
}

const COVER_SYSTEM = `You write concise, specific cover letters (180-280 words) in the candidate's voice. Plain text, no markdown, no placeholders, no address block. Open with a direct statement of interest in the role and company, give two or three concrete examples from the resume that map to the job's requirements, and close with a short confident paragraph. Never claim anything not supported by the resume. Sign off with the candidate's name.`;

export async function generateCoverLetter(resume: Resume, job: JobForTailoring, userId: string): Promise<string> {
  const { model } = await getSettings(userId);
  const stream = ai().messages.stream({
    model,
    max_tokens: 4000,
    system: COVER_SYSTEM,
    output_config: { effort: "medium" },
    messages: [
      {
        role: "user",
        content: `${jobBlock(job)}\n\n<resume_json>\n${JSON.stringify(resume, null, 1)}\n</resume_json>\n\nWrite the cover letter.`,
      },
    ],
  });
  const msg = await stream.finalMessage();
  const err = refusalError(msg);
  if (err) throw err;
  return msg.content
    .filter((b): b is Extract<typeof b, { type: "text" }> => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();
}
