import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { ai, refusalError } from "../ai";
import { getBrowserContext } from "../browser/context";
import { JobExtractionSchema, type JobExtraction } from "../schemas";
import { getSettings } from "../settings";

export type JobDetails = {
  remote: string;
  employmentType: string | null;
  salary: string | null;
  requirements: string[];
  niceToHave: string[];
  keywords: string[];
  applyUrl: string | null;
};

export const EMPTY_DETAILS: JobDetails = {
  remote: "unknown",
  employmentType: null,
  salary: null,
  requirements: [],
  niceToHave: [],
  keywords: [],
  applyUrl: null,
};

/** Loads the page in the shared (signed-in) browser profile and returns its visible text. */
export async function fetchPageText(url: string, userId: string): Promise<{ title: string; text: string; finalUrl: string }> {
  const ctx = await getBrowserContext(userId);
  const page = await ctx.newPage();
  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
    await page.waitForTimeout(2500);
    for (const name of [/show more/i, /see more/i, /read more/i, /show full description/i]) {
      const btn = page.getByRole("button", { name }).first();
      if (await btn.isVisible().catch(() => false)) {
        await btn.click({ timeout: 3000 }).catch(() => {});
        await page.waitForTimeout(600);
      }
    }
    const title = await page.title();
    const text = (await page.evaluate("document.body ? document.body.innerText : ''")) as string;
    return { title, text, finalUrl: page.url() };
  } finally {
    await page.close().catch(() => {});
  }
}

const SYSTEM = `You extract job postings from raw page text. Reproduce the posting faithfully: keep the full description (about the role, responsibilities, requirements, benefits, compensation) and drop navigation, cookie banners, footers, and other job listings on the page. If the text is not a job posting (login wall, error page, expired listing, search results), set isJobPosting to false and say why in description.`;

export async function extractJob(text: string, url: string | null, userId: string): Promise<JobExtraction> {
  const { model } = await getSettings(userId);
  const MAX = 80_000;
  const body = text.length > MAX ? `${text.slice(0, MAX)}\n[... page text truncated after ${MAX} characters ...]` : text;
  const res = await ai().messages.parse({
    model,
    max_tokens: 16000,
    system: SYSTEM,
    output_config: { effort: "medium", format: zodOutputFormat(JobExtractionSchema) },
    messages: [
      {
        role: "user",
        content: `${url ? `Source URL: ${url}\n\n` : ""}<page_text>\n${body}\n</page_text>\n\nExtract the job posting.`,
      },
    ],
  });
  const err = refusalError(res);
  if (err) throw err;
  if (!res.parsed_output) throw new Error("Could not extract a job posting from this page.");
  return res.parsed_output;
}
