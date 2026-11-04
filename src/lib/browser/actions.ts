import path from "node:path";
import type { Locator, Page } from "playwright";
import { escapeRegex } from "../utils";
import { SNAPSHOT_SCRIPT, formatSnapshot, type Snapshot } from "./snapshot";

export async function settle(page: Page, ms = 800): Promise<void> {
  try {
    await page.waitForLoadState("domcontentloaded", { timeout: 8000 });
  } catch {
    /* keep going */
  }
  await page.waitForTimeout(ms);
}

export async function snapshot(page: Page): Promise<Snapshot> {
  await page.waitForTimeout(150);
  return (await page.evaluate(SNAPSHOT_SCRIPT)) as Snapshot;
}

export async function describePage(page: Page): Promise<string> {
  return formatSnapshot(await snapshot(page));
}

async function ensure(page: Page, id: number): Promise<Locator> {
  const loc = page.locator(`[data-aa-id="${id}"]`).first();
  if ((await loc.count()) === 0) {
    throw new Error(`Element [${id}] is not on the current page (the page changed). Call get_page_state to get fresh ids.`);
  }
  return loc;
}

type Info = { tag: string; type: string; role: string; editable: boolean; autocomplete: string; haspopup: string };

async function info(loc: Locator): Promise<Info> {
  return loc.evaluate((e) => ({
    tag: e.tagName.toLowerCase(),
    type: (e.getAttribute("type") || "").toLowerCase(),
    role: e.getAttribute("role") || "",
    editable: e.getAttribute("contenteditable") === "true",
    autocomplete: e.getAttribute("aria-autocomplete") || "",
    haspopup: e.getAttribute("aria-haspopup") || "",
  }));
}

const OPTION_SELECTOR = '[role="option"], [role="menuitem"], li[role="option"], [data-automation-id*="promptOption"], .select__option, .Select-option';

async function chooseFromDropdown(page: Page, loc: Locator, id: number, value: string): Promise<string> {
  await loc.scrollIntoViewIfNeeded();
  await loc.click({ timeout: 5000 });
  await page.waitForTimeout(400);
  const meta = await info(loc);
  const typeable = meta.tag === "input" || meta.editable || meta.role === "combobox";
  if (typeable && meta.tag !== "button") {
    try {
      await loc.fill("");
    } catch {
      /* not fillable */
    }
    await page.keyboard.type(value, { delay: 15 });
    await page.waitForTimeout(700);
  }
  const option = page.locator(OPTION_SELECTOR).filter({ hasText: new RegExp(escapeRegex(value), "i") }).first();
  if (await option.isVisible().catch(() => false)) {
    await option.click({ timeout: 5000 });
    await page.waitForTimeout(300);
    return `Selected "${value}" in [${id}]`;
  }
  const anyOption = page.locator(OPTION_SELECTOR).first();
  if (typeable && (await anyOption.isVisible().catch(() => false))) {
    const first = (await anyOption.innerText().catch(() => "")).trim();
    await anyOption.click({ timeout: 5000 });
    await page.waitForTimeout(300);
    return `No option matched "${value}" exactly in [${id}]; selected the first suggestion "${first}". Verify it with get_page_state and change it if wrong.`;
  }
  await page.keyboard.press("Enter");
  await page.waitForTimeout(300);
  return `Typed "${value}" into [${id}] and pressed Enter. Verify the selection with get_page_state.`;
}

export async function fillField(page: Page, id: number, value: string): Promise<string> {
  const loc = await ensure(page, id);
  const meta = await info(loc);
  if (meta.tag === "select") return selectOption(page, id, value);
  if (meta.tag === "input" && meta.type === "file") throw new Error("That is a file input. Use upload_file instead.");
  if (meta.tag === "input" && (meta.type === "checkbox" || meta.type === "radio")) {
    await loc.check({ timeout: 5000 });
    return `Checked [${id}]`;
  }
  if (meta.role === "combobox" || meta.autocomplete || meta.haspopup === "listbox") {
    return chooseFromDropdown(page, loc, id, value);
  }
  await loc.scrollIntoViewIfNeeded();
  if (meta.editable || (meta.role === "textbox" && meta.tag !== "input" && meta.tag !== "textarea")) {
    await loc.click({ timeout: 5000 });
    await page.keyboard.press(process.platform === "darwin" ? "Meta+A" : "Control+A");
    await page.keyboard.type(value, { delay: 5 });
    return `Typed into [${id}]`;
  }
  await loc.fill(value, { timeout: 5000 });
  await loc.blur().catch(() => {});
  return `Filled [${id}] with "${value}"`;
}

export async function selectOption(page: Page, id: number, option: string): Promise<string> {
  const loc = await ensure(page, id);
  const meta = await info(loc);
  if (meta.tag !== "select") return chooseFromDropdown(page, loc, id, option);
  const options: { label: string; value: string }[] = await loc.evaluate((e) =>
    Array.from((e as HTMLSelectElement).options).map((o) => ({ label: o.text.trim(), value: o.value })),
  );
  const lower = option.toLowerCase();
  const match =
    options.find((o) => o.label.toLowerCase() === lower) ??
    options.find((o) => o.value.toLowerCase() === lower) ??
    options.find((o) => o.label.toLowerCase().includes(lower)) ??
    options.find((o) => lower.includes(o.label.toLowerCase()) && o.label.length > 2);
  if (!match) {
    throw new Error(`No option like "${option}" in [${id}]. Available: ${options.map((o) => o.label).filter(Boolean).slice(0, 40).join(" | ")}`);
  }
  await loc.selectOption({ value: match.value }, { timeout: 5000 });
  await loc.dispatchEvent("change").catch(() => {});
  return `Selected "${match.label}" in [${id}]`;
}

export async function clickElement(page: Page, id: number): Promise<string> {
  const loc = await ensure(page, id);
  const label = (await loc.innerText().catch(() => "")).trim().slice(0, 60);
  await loc.scrollIntoViewIfNeeded().catch(() => {});
  try {
    await loc.click({ timeout: 8000 });
  } catch {
    await loc.click({ timeout: 5000, force: true });
  }
  await settle(page, 1200);
  return `Clicked [${id}]${label ? ` "${label}"` : ""}`;
}

export async function setCheckbox(page: Page, id: number, checked: boolean): Promise<string> {
  const loc = await ensure(page, id);
  const meta = await info(loc);
  if (meta.tag === "input") {
    await loc.setChecked(checked, { timeout: 5000 }).catch(async () => {
      await loc.click({ force: true, timeout: 5000 });
    });
  } else {
    const current = await loc.getAttribute("aria-checked");
    if ((current === "true") !== checked) await loc.click({ timeout: 5000 });
  }
  return `${checked ? "Checked" : "Unchecked"} [${id}]`;
}

export async function uploadFile(page: Page, id: number, filePath: string): Promise<string> {
  const name = path.basename(filePath);
  const loc = await ensure(page, id);
  const meta = await info(loc);
  if (meta.tag === "input" && meta.type === "file") {
    await loc.setInputFiles(filePath);
  } else {
    try {
      const chooserPromise = page.waitForEvent("filechooser", { timeout: 8000 });
      await loc.click({ timeout: 5000 });
      const chooser = await chooserPromise;
      await chooser.setFiles(filePath);
    } catch {
      const fallback = page.locator('input[type="file"]').first();
      if ((await fallback.count()) === 0) throw new Error(`Clicking [${id}] did not open a file chooser and no file input exists on the page.`);
      await fallback.setInputFiles(filePath);
    }
  }
  await page.waitForTimeout(2000);
  return `Uploaded ${name} via [${id}]`;
}

export async function pressKey(page: Page, key: string): Promise<string> {
  await page.keyboard.press(key);
  await settle(page, 600);
  return `Pressed ${key}`;
}

export async function scrollPage(page: Page, direction: "up" | "down"): Promise<string> {
  await page.mouse.wheel(0, direction === "down" ? 700 : -700);
  await page.waitForTimeout(400);
  return `Scrolled ${direction}`;
}

export async function navigate(page: Page, url: string): Promise<string> {
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
  await settle(page, 1500);
  return `Navigated to ${page.url()}`;
}
