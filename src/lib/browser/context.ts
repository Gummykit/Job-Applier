import { chromium, type BrowserContext } from "playwright";
import { BROWSER_PROFILE_DIR, ensureDirs } from "../paths";
import { getSettings } from "../settings";

const g = globalThis as unknown as {
  aaContext?: BrowserContext | null;
  aaLaunching?: Promise<BrowserContext> | null;
  aaHeadless?: boolean;
};

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

async function launch(headless: boolean): Promise<BrowserContext> {
  ensureDirs();
  const options = {
    headless,
    viewport: { width: 1280, height: 900 },
    userAgent: USER_AGENT,
    locale: "en-US",
    acceptDownloads: true,
  };
  // Prefer the user's installed Google Chrome (works best with real logins); fall back to bundled Chromium.
  try {
    return await chromium.launchPersistentContext(BROWSER_PROFILE_DIR, { ...options, channel: "chrome" });
  } catch {
    return await chromium.launchPersistentContext(BROWSER_PROFILE_DIR, options);
  }
}

/** One persistent browser profile shared by sign-ins, job imports and application runs. */
export async function getBrowserContext(): Promise<BrowserContext> {
  if (g.aaContext) return g.aaContext;
  if (g.aaLaunching) return g.aaLaunching;
  g.aaLaunching = (async () => {
    const { headless } = await getSettings();
    const ctx = await launch(headless);
    g.aaHeadless = headless;
    ctx.on("close", () => {
      g.aaContext = null;
    });
    g.aaContext = ctx;
    g.aaLaunching = null;
    return ctx;
  })();
  return g.aaLaunching;
}

export async function closeBrowser(): Promise<void> {
  const ctx = g.aaContext;
  g.aaContext = null;
  if (ctx) {
    try {
      await ctx.close();
    } catch {
      /* already closed */
    }
  }
}

export function browserStatus(): { open: boolean; headless: boolean | null; pages: number } {
  const ctx = g.aaContext;
  return { open: !!ctx, headless: ctx ? (g.aaHeadless ?? null) : null, pages: ctx ? ctx.pages().length : 0 };
}
