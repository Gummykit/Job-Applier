import path from "node:path";
import mammoth from "mammoth";
import type Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { ai, refusalError } from "../ai";
import { getSettings } from "../settings";
import { ResumeSchema, type Resume } from "../schemas";

export type ResumeContent = { kind: "pdf"; base64: string } | { kind: "text"; text: string };

export async function extractResumeContent(buffer: Buffer, filename: string): Promise<ResumeContent> {
  const ext = path.extname(filename).toLowerCase();
  if (ext === ".pdf") return { kind: "pdf", base64: buffer.toString("base64") };
  if (ext === ".docx") {
    const result = await mammoth.extractRawText({ buffer });
    return { kind: "text", text: result.value };
  }
  if ([".txt", ".md", ".markdown", ""].includes(ext)) return { kind: "text", text: buffer.toString("utf8") };
  throw new Error(`Unsupported file type "${ext}". Upload a PDF, DOCX, TXT or Markdown resume.`);
}

const SYSTEM = `You convert resumes into structured data. Preserve the candidate's wording and facts exactly: never invent, infer, or embellish anything that is not in the document. Keep every bullet point and every role. Use null for anything that is missing. Keep dates as written (e.g. "Jan 2021"). If the resume lists skills without categories, group them into a few sensible categories. Collect LinkedIn, GitHub, portfolio and other URLs into links.`;

export async function parseResume(content: ResumeContent): Promise<Resume> {
  const { model } = await getSettings();
  const instruction = "Extract this resume into the requested structure.";
  const userContent: Anthropic.ContentBlockParam[] =
    content.kind === "pdf"
      ? [
          { type: "document", source: { type: "base64", media_type: "application/pdf", data: content.base64 } },
          { type: "text", text: instruction },
        ]
      : [{ type: "text", text: `<resume>\n${content.text}\n</resume>\n\n${instruction}` }];

  const res = await ai().messages.parse({
    model,
    max_tokens: 16000,
    system: SYSTEM,
    output_config: { effort: "medium", format: zodOutputFormat(ResumeSchema) },
    messages: [{ role: "user", content: userContent }],
  });
  const err = refusalError(res);
  if (err) throw err;
  if (!res.parsed_output) throw new Error("The resume could not be parsed into a structured format.");
  return res.parsed_output;
}
