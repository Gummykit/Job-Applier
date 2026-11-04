import Anthropic from "@anthropic-ai/sdk";

const g = globalThis as unknown as { anthropic?: Anthropic };

/** Shared client. Credentials come from ANTHROPIC_API_KEY, ANTHROPIC_AUTH_TOKEN or an `ant auth login` profile. */
export function ai(): Anthropic {
  if (!g.anthropic) g.anthropic = new Anthropic();
  return g.anthropic;
}

export function apiKeyConfigured(): boolean {
  return !!(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
}

type StopInfo = {
  stop_reason: string | null;
  stop_details?: { category?: string | null; explanation?: string | null } | null;
};

/** Returns an Error when the response cannot be used (refusal or truncation), else null. */
export function refusalError(res: StopInfo): Error | null {
  if (res.stop_reason === "refusal") {
    const d = res.stop_details;
    return new Error(
      `The model declined this request${d?.category ? ` (${d.category})` : ""}${d?.explanation ? `: ${d.explanation}` : "."}`,
    );
  }
  if (res.stop_reason === "max_tokens") return new Error("The model's response was cut off before it finished. Try again.");
  return null;
}
