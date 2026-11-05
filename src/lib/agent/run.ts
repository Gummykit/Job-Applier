import path from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import type { Page } from "playwright";
import { ai } from "../ai";
import * as act from "../browser/actions";
import { getBrowserContext } from "../browser/context";
import { prisma } from "../db";
import { EMPTY_DETAILS, type JobDetails } from "../jobs/extract";
import { applicationDir } from "../paths";
import { getProfile } from "../profile";
import { ensureTailoredResume } from "../resume/ensure";
import { getSettings } from "../settings";
import { errorMessage, safeJson, truncate } from "../utils";
import { buildSystemPrompt } from "./prompt";
import { TOOLS, ToolInputs, type ToolName } from "./tools";

export type LogEntry = {
  t: string;
  type: "info" | "action" | "result" | "error" | "assistant";
  text: string;
  screenshot?: string;
};

export type FinalStatus = "submitted" | "needs_review" | "failed" | "skipped" | "cancelled";

const MAX_TURNS = 80;

type ToolOutcome = {
  content: Anthropic.Beta.BetaToolResultBlockParam["content"];
  isError?: boolean;
  finish?: { status: string; summary: string };
};

export async function runApplication(appId: string): Promise<void> {
  const app = await prisma.application.findUnique({ where: { id: appId }, include: { job: true } });
  if (!app || app.status !== "queued") return;

  const log: LogEntry[] = safeJson<LogEntry[]>(app.log, []);
  const dir = applicationDir(appId);
  let shots = 0;
  let inputTokens = 0;
  let outputTokens = 0;

  const persist = (patch: Record<string, unknown> = {}) =>
    prisma.application.update({ where: { id: appId }, data: { log: JSON.stringify(log), inputTokens, outputTokens, ...patch } });
  const push = async (entry: Omit<LogEntry, "t">) => {
    log.push({ t: new Date().toISOString(), ...entry });
    await persist();
  };

  await persist({ status: "running", startedAt: new Date() });

  let page: Page | null = null;
  let active: Page | null = null;
  let finalStatus: FinalStatus = "failed";
  let summary = "";
  const ctx = await getBrowserContext(app.userId);
  const onNewPage = async (p: Page) => {
    try {
      await p.waitForLoadState("domcontentloaded", { timeout: 15000 });
    } catch {
      /* fine */
    }
    active = p;
    await push({ type: "info", text: `A new tab opened: ${p.url()}` });
  };

  try {
    const profile = await getProfile(app.userId);
    if (!profile) throw new Error("No resume uploaded yet. Add one on the Profile page first.");
    const job = app.job;
    if (job.status !== "ready" || !job.url) throw new Error("The job must be imported from a URL before applying.");
    const details = { ...EMPTY_DETAILS, ...safeJson<Partial<JobDetails>>(job.details, {}) };

    await push({ type: "info", text: "Preparing the tailored resume and cover letter…" });
    const files = await ensureTailoredResume(job.id, profile);
    await push({ type: "info", text: `Using ${path.basename(files.resumePdf)}${files.coverLetterPdf ? " and a cover letter" : ""}.` });

    const settings = await getSettings(app.userId);
    page = await ctx.newPage();
    active = page;
    ctx.on("page", onNewPage);

    const current = (): Page => {
      if (active && !active.isClosed()) return active;
      if (page && !page.isClosed()) return (active = page);
      throw new Error("The browser tab was closed.");
    };
    const screenshot = async (): Promise<string | undefined> => {
      try {
        const name = `step-${String(++shots).padStart(3, "0")}.jpg`;
        await current().screenshot({ path: path.join(dir, name), type: "jpeg", quality: 55 });
        return name;
      } catch {
        return undefined;
      }
    };

    await push({ type: "action", text: `Opening ${job.url}` });
    await act.navigate(current(), job.url);
    const firstState = await act.describePage(current());
    await push({ type: "result", text: `Loaded ${current().url()}`, screenshot: await screenshot() });

    const system = buildSystemPrompt({
      resume: profile.resume,
      preferences: profile.preferences,
      job,
      details,
      coverLetter: files.coverLetter,
      hasCoverLetterFile: !!files.coverLetterPdf,
      resumeFileName: path.basename(files.resumePdf),
      autoSubmit: app.autoSubmit,
    });

    const messages: Anthropic.Beta.BetaMessageParam[] = [
      {
        role: "user",
        content: `Apply to this job now. The job page is already open. Current page state:\n\n${firstState}`,
      },
    ];

    let jsonRetries = 0;
    let finished = false;

    for (let turn = 0; turn < MAX_TURNS && !finished; turn++) {
      const fresh = await prisma.application.findUnique({ where: { id: appId }, select: { cancelRequested: true } });
      if (fresh?.cancelRequested) {
        finalStatus = "cancelled";
        summary = "Cancelled by the user.";
        finished = true;
        break;
      }

      const stream = ai().beta.messages.stream({
        model: settings.model,
        max_tokens: 16000,
        betas: ["server-side-fallback-2026-07-01", "context-management-2025-06-27"],
        fallbacks: "default",
        context_management: { edits: [{ type: "clear_tool_uses_20250919" }] },
        output_config: { effort: "high" },
        system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
        tools: TOOLS,
        messages,
      });

      let msg: Anthropic.Beta.BetaMessage;
      try {
        msg = await stream.finalMessage();
        jsonRetries = 0;
      } catch (err) {
        if (err instanceof Anthropic.APIError || jsonRetries++ >= 2) throw err;
        await push({ type: "error", text: "A tool call arrived as unparseable JSON; retrying the turn." });
        continue;
      }

      inputTokens += (msg.usage.input_tokens ?? 0) + (msg.usage.cache_read_input_tokens ?? 0) + (msg.usage.cache_creation_input_tokens ?? 0);
      outputTokens += msg.usage.output_tokens ?? 0;

      if (msg.stop_reason === "refusal") {
        throw new Error(`The model declined to continue${msg.stop_details?.explanation ? `: ${msg.stop_details.explanation}` : "."}`);
      }

      messages.push({ role: "assistant", content: msg.content });

      const text = msg.content
        .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
        .map((b) => b.text)
        .join("\n")
        .trim();
      if (text) await push({ type: "assistant", text });

      const toolUses = msg.content.filter((b): b is Anthropic.Beta.BetaToolUseBlock => b.type === "tool_use");

      if (msg.stop_reason === "max_tokens") {
        throw new Error("The model's turn was cut off (max_tokens).");
      }
      if (toolUses.length === 0) {
        if (msg.stop_reason === "end_turn") {
          messages.push({
            role: "user",
            content: "You stopped without calling finish. Continue the application, or call finish with the appropriate status.",
          });
          continue;
        }
        throw new Error(`The model stopped unexpectedly (${msg.stop_reason}).`);
      }

      const results: Anthropic.Beta.BetaToolResultBlockParam[] = [];
      for (const tu of toolUses) {
        if (finished) {
          results.push({ type: "tool_result", tool_use_id: tu.id, content: "Skipped: finish was already called." });
          continue;
        }
        const outcome = await executeTool(tu, current, files, push);
        results.push({ type: "tool_result", tool_use_id: tu.id, content: outcome.content, ...(outcome.isError ? { is_error: true } : {}) });
        if (outcome.finish) {
          finished = true;
          summary = outcome.finish.summary;
          finalStatus = mapStatus(outcome.finish.status);
        }
      }
      const shot = await screenshot();
      if (shot && log.length) {
        log[log.length - 1].screenshot = shot;
        await persist();
      }
      messages.push({ role: "user", content: results });
    }

    if (!finished) {
      finalStatus = "failed";
      summary = `Stopped after ${MAX_TURNS} turns without finishing. Check the log and the open browser tab.`;
    }
  } catch (e) {
    finalStatus = "failed";
    summary = errorMessage(e);
    await push({ type: "error", text: summary });
  } finally {
    ctx.off("page", onNewPage);
    await persist({ status: finalStatus, summary, finishedAt: new Date() });
    const keepOpen = finalStatus === "needs_review";
    if (!keepOpen) {
      for (const p of [active, page]) {
        if (p && !p.isClosed()) await p.close().catch(() => {});
      }
    }
  }
}

function mapStatus(s: string): FinalStatus {
  switch (s) {
    case "submitted":
      return "submitted";
    case "ready_for_review":
    case "needs_human":
      return "needs_review";
    case "skipped":
      return "skipped";
    default:
      return "failed";
  }
}

function describeAction(name: ToolName, input: Record<string, unknown>): string {
  switch (name) {
    case "get_page_state":
      return "Reading the page";
    case "navigate":
      return `Navigating to ${input.url}`;
    case "click":
      return `Clicking [${input.id}]`;
    case "fill":
      return `Filling [${input.id}] with "${truncate(String(input.value), 120)}"`;
    case "select_option":
      return `Selecting "${input.option}" in [${input.id}]`;
    case "set_checkbox":
      return `${input.checked ? "Checking" : "Unchecking"} [${input.id}]`;
    case "upload_file":
      return `Uploading ${input.file === "resume" ? "resume" : "cover letter"} to [${input.id}]`;
    case "press_key":
      return `Pressing ${input.key}`;
    case "scroll":
      return `Scrolling ${input.direction}`;
    case "wait":
      return `Waiting ${input.seconds}s`;
    case "look_at_screenshot":
      return "Looking at a screenshot";
    case "finish":
      return `Finishing with status "${input.status}"`;
  }
}

async function executeTool(
  tu: Anthropic.Beta.BetaToolUseBlock,
  current: () => Page,
  files: { resumePdf: string; coverLetterPdf: string | null },
  push: (e: Omit<LogEntry, "t">) => Promise<void>,
): Promise<ToolOutcome> {
  const name = tu.name as ToolName;
  const schema = ToolInputs[name];
  if (!schema) return { content: `Unknown tool "${tu.name}".`, isError: true };
  const parsed = schema.safeParse(tu.input);
  if (!parsed.success) {
    return { content: JSON.stringify({ INVALID_JSON: JSON.stringify(tu.input) }), isError: true };
  }
  const input = parsed.data as Record<string, unknown>;
  await push({ type: "action", text: describeAction(name, input) });

  const withState = async (prefix: string) => `${prefix}\n\n${await act.describePage(current())}`;
  try {
    let outcome: ToolOutcome;
    switch (name) {
      case "get_page_state":
        outcome = { content: await act.describePage(current()) };
        break;
      case "navigate":
        outcome = { content: await withState(await act.navigate(current(), input.url as string)) };
        break;
      case "click":
        outcome = { content: await withState(await act.clickElement(current(), input.id as number)) };
        break;
      case "fill":
        outcome = { content: await act.fillField(current(), input.id as number, input.value as string) };
        break;
      case "select_option":
        outcome = { content: await act.selectOption(current(), input.id as number, input.option as string) };
        break;
      case "set_checkbox":
        outcome = { content: await act.setCheckbox(current(), input.id as number, input.checked as boolean) };
        break;
      case "upload_file": {
        const file = input.file === "resume" ? files.resumePdf : files.coverLetterPdf;
        if (!file) {
          outcome = { content: "No cover letter file is available for this application.", isError: true };
          break;
        }
        outcome = { content: await act.uploadFile(current(), input.id as number, file) };
        break;
      }
      case "press_key":
        outcome = { content: await withState(await act.pressKey(current(), input.key as string)) };
        break;
      case "scroll":
        outcome = { content: await withState(await act.scrollPage(current(), input.direction as "up" | "down")) };
        break;
      case "wait": {
        const s = Math.max(0, Math.min(15, Number(input.seconds)));
        await current().waitForTimeout(s * 1000);
        outcome = { content: await withState(`Waited ${s}s`) };
        break;
      }
      case "look_at_screenshot": {
        const buf = await current().screenshot({ type: "jpeg", quality: 60 });
        outcome = {
          content: [
            { type: "image", source: { type: "base64", media_type: "image/jpeg", data: buf.toString("base64") } },
            { type: "text", text: `Screenshot of ${current().url()}` },
          ],
        };
        break;
      }
      case "finish":
        outcome = { content: "Acknowledged.", finish: { status: input.status as string, summary: input.summary as string } };
        break;
    }
    const preview = typeof outcome.content === "string" ? outcome.content.split("\n")[0] : "(image)";
    await push({ type: outcome.isError ? "error" : "result", text: truncate(preview, 300) });
    return outcome;
  } catch (e) {
    const text = `Error: ${errorMessage(e)}`;
    await push({ type: "error", text: truncate(text, 400) });
    return { content: text, isError: true };
  }
}
