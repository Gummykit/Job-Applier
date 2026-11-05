import path from "node:path";
import { chromium, type BrowserContext } from "playwright";
import { BROWSER_PROFILE_DIR, ensureDirs } from "../paths";
import { getSettings } from "../settings";

type Registry = {
  contexts: Map<string, BrowserContext>;
  launching: Map<string, Promise<BrowserContext>>;
  headless: Map<string, boolean>;
};

const g = globalThis as unknown as { aaBrowsers?: Registry };
const registry: Registry = (g.aaBrowsers ??= { contexts: new Map(), launching: new Map(), headless: new Map() });

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

async function launch(profileDir: string, headless: boolean): Promise<BrowserContext> {
  ensureDirs();
  const options = {
    headless,
    viewport: { width: 1280, height: 900 },
    userAgent: USER_AGENT,
    locale: "en-US",
    acceptDownloads: true,
  };
  // Prefer the installed Google Chrome (works best with real logins); fall back to bundled Chromium.
  try {
    return await chromium.launchPersistentContext(profileDir, { ...options, channel: "chrome" });
  } catch {
    return await chromium.launchPersistentContext(profileDir, options);
  }
}

/** One persistent browser profile per user, shared by their sign-ins, job imports and application runs. */
export async function getBrowserContext(userId: string): Promise<BrowserContext> {
  const existing = registry.contexts.get(userId);
  if (existing) return existing;
  const pending = registry.launching.get(userId);
  if (pending) return pending;
  const promise = (async () => {
    const { headless } = await getSettings(userId);
    const ctx = await launch(path.join(BROWSER_PROFILE_DIR, userId), headless);
    registry.headless.set(userId, headless);
    ctx.on("close", () => {
      if (registry.contexts.get(userId) === ctx) registry.contexts.delete(userId);
    });
    registry.contexts.set(userId, ctx);
    registry.launching.delete(userId);
    return ctx;
  })();
  registry.launching.set(userId, promise);
  promise.catch(() => registry.launching.delete(userId));
  return promise;
}

export async function closeBrowser(userId: string): Promise<void> {
  const ctx = registry.contexts.get(userId);
  registry.contexts.delete(userId);
  if (ctx) {
    try {
      await ctx.close();
    } catch {
      /* already closed */
    }
  }
}

export function browserStatus(userId: string): { open: boolean; headless: boolean | null; pages: number } {
  const ctx = registry.contexts.get(userId);
  return { open: !!ctx, headless: ctx ? (registry.headless.get(userId) ?? null) : null, pages: ctx ? ctx.pages().length : 0 };
}
