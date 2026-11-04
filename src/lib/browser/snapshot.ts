export type SnapshotElement = {
  id: number;
  kind: string;
  label?: string;
  text?: string;
  value?: string;
  placeholder?: string;
  options?: string[];
  optionCount?: number;
  required?: boolean;
  checked?: boolean;
  expanded?: boolean;
  group?: string;
  disabled?: boolean;
  href?: string;
};

export type Snapshot = {
  url: string;
  title: string;
  elements: SnapshotElement[];
  text: string;
  frames: string[];
  errors: string[];
  dialogOpen: boolean;
};

/**
 * Runs inside the page. Tags every interactive element with data-aa-id and returns a compact description.
 * Kept as a plain string so bundlers never rewrite it.
 */
export const SNAPSHOT_SCRIPT = String.raw`(() => {
  const MAX_ELEMENTS = 220;
  const clean = (t) => (t || '').replace(/\s+/g, ' ').trim();
  const textOf = (el) => clean(el.innerText || el.textContent || '');
  const isVisible = (el) => {
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) return false;
    const s = window.getComputedStyle(el);
    if (s.visibility === 'hidden' || s.display === 'none' || s.opacity === '0') return false;
    return true;
  };
  const hasInteractive = (el) => !!el.querySelector('input,select,textarea,button,a,[role="button"]');
  const labelFor = (el, selfLabelled) => {
    const aria = el.getAttribute('aria-label');
    if (aria) return clean(aria);
    const by = el.getAttribute('aria-labelledby');
    if (by) {
      const parts = by.split(/\s+/).map((id) => { const n = document.getElementById(id); return n ? textOf(n) : ''; }).filter(Boolean);
      if (parts.length) return parts.join(' ');
    }
    if (el.id) {
      try { const l = document.querySelector('label[for="' + CSS.escape(el.id) + '"]'); if (l) return textOf(l); } catch (e) {}
    }
    const wrap = el.closest('label');
    if (wrap) return textOf(wrap);
    if (selfLabelled) return clean(el.getAttribute('title') || '');
    let node = el;
    for (let depth = 0; depth < 3 && node; depth++) {
      let sib = node.previousElementSibling; let hops = 0;
      while (sib && hops < 3) {
        if (!sib.matches('input,select,textarea,button,a,form,fieldset,table,ul,ol,nav,header') && !hasInteractive(sib)) {
          const t = textOf(sib);
          if (t && t.length <= 120) return t;
        }
        sib = sib.previousElementSibling; hops++;
      }
      node = node.parentElement;
      if (node && node.matches('form,fieldset,main,body,[role="dialog"]')) break;
    }
    const fs = el.closest('fieldset');
    if (fs) { const lg = fs.querySelector('legend'); if (lg) return textOf(lg); }
    return clean(el.getAttribute('placeholder') || el.getAttribute('name') || el.getAttribute('title') || '');
  };
  const SEL = 'input, textarea, select, button, a[href], [role="button"], [role="combobox"], [role="listbox"], [role="option"], [role="checkbox"], [role="radio"], [role="switch"], [role="textbox"], [role="link"], [role="tab"], [role="menuitem"], [contenteditable="true"]';
  const applyish = /apply|submit|next|continue|save|review|upload|attach|sign|log ?in|register|start|finish|done|confirm|agree|accept|easy/i;
  const nodes = Array.from(document.querySelectorAll(SEL));
  const elements = []; const links = []; let n = 0;
  for (const el of nodes) {
    const tag = el.tagName.toLowerCase();
    const type = (el.getAttribute('type') || '').toLowerCase();
    if (tag === 'input' && type === 'hidden') continue;
    const isFile = tag === 'input' && type === 'file';
    if (!isFile && !isVisible(el)) continue;
    const role = el.getAttribute('role') || '';
    let kind = tag;
    if (tag === 'input') kind = type && type !== 'text' ? 'input[' + type + ']' : 'input';
    if (tag === 'a') kind = 'link';
    if (role && tag !== 'select' && tag !== 'textarea' && !(tag === 'input' && (type === 'checkbox' || type === 'radio' || type === 'file'))) kind = role;
    if (tag === 'input' && (type === 'checkbox' || type === 'radio')) kind = type;
    if (el.getAttribute('contenteditable') === 'true') kind = 'contenteditable';
    if (kind === 'button' && el.getAttribute('aria-haspopup') === 'listbox') kind = 'dropdown';
    const item = { kind: kind };
    const selfLabelled = tag === 'button' || tag === 'a' || ['button', 'link', 'tab', 'menuitem', 'option'].includes(role);
    const label = labelFor(el, selfLabelled);
    if (label) item.label = label.slice(0, 140);
    if (tag !== 'input' && tag !== 'select' && tag !== 'textarea') {
      const t = textOf(el);
      if (t) item.text = t.slice(0, 100);
    }
    if (tag === 'input' || tag === 'textarea') {
      const v = el.value;
      if (v && !isFile && type !== 'password' && type !== 'checkbox' && type !== 'radio') item.value = String(v).slice(0, 120);
    }
    if (kind === 'contenteditable' || (role === 'textbox' && tag !== 'input' && tag !== 'textarea')) {
      const t = textOf(el);
      if (t) item.value = t.slice(0, 120);
    }
    if (tag === 'select') {
      const opts = Array.from(el.options);
      item.options = opts.map((o) => clean(o.text)).filter(Boolean).slice(0, 25);
      item.optionCount = opts.length;
      const so = el.options[el.selectedIndex];
      if (so && so.value) item.value = clean(so.text);
    }
    if (el.required || el.getAttribute('aria-required') === 'true') item.required = true;
    if (type === 'checkbox' || type === 'radio' || role === 'checkbox' || role === 'radio' || role === 'switch') {
      item.checked = !!(el.checked || el.getAttribute('aria-checked') === 'true');
    }
    const exp = el.getAttribute('aria-expanded');
    if (exp) item.expanded = exp === 'true';
    if (type === 'radio' || type === 'checkbox') { const nm = el.getAttribute('name'); if (nm) item.group = nm; }
    const ph = el.getAttribute('placeholder');
    if (ph && clean(ph) !== item.label) item.placeholder = clean(ph).slice(0, 80);
    if (el.disabled || el.getAttribute('aria-disabled') === 'true') item.disabled = true;
    if (tag === 'a') {
      const href = el.getAttribute('href') || '';
      if (href && !href.startsWith('#') && !href.startsWith('javascript:')) item.href = String(el.href).slice(0, 200);
      if (!item.text && !item.label) continue;
      links.push({ el: el, item: item, priority: applyish.test(item.text || item.label || '') ? 0 : 1 });
      continue;
    }
    n++; el.setAttribute('data-aa-id', String(n)); item.id = n; elements.push(item);
    if (elements.length >= MAX_ELEMENTS) break;
  }
  links.sort((a, b) => a.priority - b.priority);
  for (const l of links.slice(0, 40)) {
    if (elements.length >= MAX_ELEMENTS) break;
    n++; l.el.setAttribute('data-aa-id', String(n)); l.item.id = n; elements.push(l.item);
  }
  const dialogs = Array.from(document.querySelectorAll('[role="dialog"], [aria-modal="true"]')).filter(isVisible);
  const dialog = dialogs.length ? dialogs[dialogs.length - 1] : null;
  const textRoot = dialog || document.querySelector('main') || document.body;
  const text = clean(textRoot ? textRoot.innerText : '').slice(0, 7000);
  const frames = Array.from(document.querySelectorAll('iframe')).filter(isVisible).map((f) => f.src).filter((s) => s && s.startsWith('http')).slice(0, 5);
  const errors = Array.from(document.querySelectorAll('[role="alert"], [aria-invalid="true"], .error, .field-error, .invalid-feedback, .helper-text--error')).filter(isVisible).map((e) => textOf(e)).filter(Boolean).slice(0, 10);
  return { url: location.href, title: document.title, elements: elements, text: text, frames: frames, errors: errors, dialogOpen: !!dialog };
})()`;

export function formatSnapshot(s: Snapshot): string {
  const lines: string[] = [];
  lines.push(`URL: ${s.url}`);
  lines.push(`TITLE: ${s.title}`);
  if (s.dialogOpen) lines.push("NOTE: a modal dialog is open; its content is shown below.");
  if (s.errors.length) lines.push(`VALIDATION/ALERTS: ${s.errors.join(" | ")}`);
  if (s.frames.length) lines.push(`IFRAMES (if the application form lives inside one, navigate to its URL directly): ${s.frames.join(" , ")}`);
  lines.push("", "--- INTERACTIVE ELEMENTS (ids are only valid for this snapshot) ---");
  for (const el of s.elements) {
    const parts: string[] = [`[${el.id}]`, el.kind];
    if (el.label) parts.push(`"${el.label}"`);
    if (el.text && el.text !== el.label) parts.push(`text="${el.text}"`);
    if (el.placeholder) parts.push(`placeholder="${el.placeholder}"`);
    if (el.value !== undefined) parts.push(`value="${el.value}"`);
    if (el.checked !== undefined) parts.push(`checked=${el.checked}`);
    if (el.group) parts.push(`group=${el.group}`);
    if (el.required) parts.push("required");
    if (el.disabled) parts.push("disabled");
    if (el.expanded !== undefined) parts.push(`expanded=${el.expanded}`);
    if (el.options) parts.push(`options: ${el.options.join(" | ")}${el.optionCount && el.optionCount > el.options.length ? ` … (${el.optionCount} total)` : ""}`);
    if (el.href) parts.push(`-> ${el.href}`);
    lines.push(parts.join(" "));
  }
  lines.push("", "--- VISIBLE TEXT (truncated) ---", s.text);
  return lines.join("\n");
}
