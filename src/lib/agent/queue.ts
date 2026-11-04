import { prisma } from "../db";
import { errorMessage } from "../utils";
import { runApplication } from "./run";

const g = globalThis as unknown as { aaApplyQueue?: string[]; aaApplyRunning?: string | null };
g.aaApplyQueue ??= [];
g.aaApplyRunning ??= null;

/** Applications run one at a time: a single browser profile, one form at a time. */
export function enqueueApplication(id: string): void {
  if (!g.aaApplyQueue!.includes(id)) g.aaApplyQueue!.push(id);
  void drain();
}

export function queueStatus(): { running: string | null; pending: string[] } {
  return { running: g.aaApplyRunning ?? null, pending: [...g.aaApplyQueue!] };
}

async function drain(): Promise<void> {
  if (g.aaApplyRunning) return;
  while (g.aaApplyQueue!.length) {
    const id = g.aaApplyQueue!.shift()!;
    g.aaApplyRunning = id;
    try {
      await runApplication(id);
    } catch (e) {
      await prisma.application
        .update({ where: { id }, data: { status: "failed", summary: errorMessage(e), finishedAt: new Date() } })
        .catch(() => {});
    } finally {
      g.aaApplyRunning = null;
    }
  }
}
