import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import { RESUMES_DIR, ensureDirs } from "../paths";
import type { Resume } from "../schemas";
import { escapeHtml } from "../utils";
import { renderResumeHtml } from "./render";

const PDF_MARGIN = { top: "0.5in", bottom: "0.5in", left: "0.6in", right: "0.6in" };

function fileStem(name: string, suffix: string): string {
  const safe = (name || "Candidate").replace(/[^A-Za-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "Candidate";
  return `${safe}_${suffix}.pdf`;
}

async function htmlToPdf(html: string, outPath: string): Promise<string> {
  ensureDirs();
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "load" });
    await page.pdf({ path: outPath, format: "Letter", printBackground: true, margin: PDF_MARGIN });
  } finally {
    await browser.close();
  }
  return outPath;
}

/** Writes <name>_Resume.pdf under .data/resumes/<folder>/ and returns the absolute path. */
export async function writeResumePdf(resume: Resume, folder: string): Promise<string> {
  const outPath = path.join(RESUMES_DIR, folder, fileStem(resume.basics.name, "Resume"));
  return htmlToPdf(renderResumeHtml(resume, { forPrint: true }), outPath);
}

export async function writeCoverLetterPdf(text: string, candidateName: string, folder: string): Promise<string> {
  const outPath = path.join(RESUMES_DIR, folder, fileStem(candidateName, "Cover_Letter"));
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>
    body { font-family: "Helvetica Neue", Helvetica, Arial, sans-serif; font-size: 11pt; line-height: 1.5; color: #111; margin: 0; }
    p { margin: 0 0 12px; white-space: pre-wrap; }
  </style></head><body>${text
    .split(/\n{2,}/)
    .map((p) => `<p>${escapeHtml(p.trim())}</p>`)
    .join("")}</body></html>`;
  return htmlToPdf(html, outPath);
}
