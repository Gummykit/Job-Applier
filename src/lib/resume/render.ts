import type { Resume } from "../schemas";
import { escapeHtml as e } from "../utils";

function dates(start: string | null, end: string | null) {
  if (!start && !end) return "";
  return `${start ?? ""}${start && end ? " – " : ""}${end ?? ""}`;
}

export function renderResumeHtml(r: Resume, opts: { forPrint?: boolean } = {}): string {
  const b = r.basics;
  const contact = [b.email, b.phone, b.location, ...b.links.map((l) => l.url.replace(/^https?:\/\//, ""))]
    .filter(Boolean)
    .map((x) => e(x as string))
    .join(" &nbsp;·&nbsp; ");

  const section = (title: string, body: string) => (body.trim() ? `<section><h2>${e(title)}</h2>${body}</section>` : "");

  const experience = r.experience
    .map(
      (x) => `
      <div class="item">
        <div class="row"><span class="strong">${e(x.title)}</span>, ${e(x.company)}${x.location ? `<span class="muted"> · ${e(x.location)}</span>` : ""}<span class="right">${e(dates(x.start, x.end))}</span></div>
        ${x.bullets.length ? `<ul>${x.bullets.map((bl) => `<li>${e(bl)}</li>`).join("")}</ul>` : ""}
      </div>`,
    )
    .join("");

  const education = r.education
    .map(
      (x) => `
      <div class="item">
        <div class="row"><span class="strong">${e(x.institution)}</span>${x.degree || x.field ? `, ${e([x.degree, x.field].filter(Boolean).join(" in "))}` : ""}<span class="right">${e(dates(x.start, x.end))}</span></div>
        ${x.details ? `<div class="muted">${e(x.details)}</div>` : ""}
      </div>`,
    )
    .join("");

  const skills = r.skills.map((s) => `<div class="skill"><span class="strong">${e(s.category)}:</span> ${e(s.items.join(", "))}</div>`).join("");

  const projects = r.projects
    .map(
      (p) => `
      <div class="item">
        <div class="row"><span class="strong">${e(p.name)}</span>${p.url ? `<span class="muted"> · ${e(p.url.replace(/^https?:\/\//, ""))}</span>` : ""}</div>
        ${p.description ? `<div>${e(p.description)}</div>` : ""}
        ${p.bullets.length ? `<ul>${p.bullets.map((bl) => `<li>${e(bl)}</li>`).join("")}</ul>` : ""}
      </div>`,
    )
    .join("");

  const certs = r.certifications.map((c) => `<div>${e(c.name)}${c.issuer ? ` — ${e(c.issuer)}` : ""}${c.date ? ` (${e(c.date)})` : ""}</div>`).join("");
  const langs = r.languages.map((l) => `${e(l.language)}${l.level ? ` (${e(l.level)})` : ""}`).join(", ");

  return `<!doctype html>
<html><head><meta charset="utf-8"><title>${e(b.name || "Resume")}</title>
<style>
  @page { margin: 0; }
  * { box-sizing: border-box; }
  body { font-family: "Helvetica Neue", Helvetica, Arial, sans-serif; color: #111; font-size: 10.5pt; line-height: 1.38; margin: 0; padding: ${opts.forPrint ? "0" : "0.55in 0.6in"}; }
  h1 { font-size: 20pt; margin: 0 0 2px; letter-spacing: 0.2px; }
  h2 { font-size: 10.5pt; text-transform: uppercase; letter-spacing: 1px; border-bottom: 1px solid #222; padding-bottom: 2px; margin: 14px 0 6px; }
  .headline { font-size: 11.5pt; color: #333; margin: 0 0 4px; }
  .contact { font-size: 9.5pt; color: #333; }
  .item { margin-bottom: 8px; }
  .row { display: flex; justify-content: space-between; gap: 12px; }
  .right { white-space: nowrap; color: #333; }
  .strong { font-weight: 600; }
  .muted { color: #555; }
  ul { margin: 3px 0 0; padding-left: 16px; }
  li { margin: 1px 0; }
  .skill { margin: 2px 0; }
  p { margin: 0; }
</style></head>
<body>
  <header>
    <h1>${e(b.name)}</h1>
    ${b.headline ? `<p class="headline">${e(b.headline)}</p>` : ""}
    <div class="contact">${contact}</div>
  </header>
  ${section("Summary", b.summary ? `<p>${e(b.summary)}</p>` : "")}
  ${section("Experience", experience)}
  ${section("Skills", skills)}
  ${section("Projects", projects)}
  ${section("Education", education)}
  ${section("Certifications", certs)}
  ${section("Languages", langs ? `<p>${langs}</p>` : "")}
</body></html>`;
}

export function resumeToPlainText(r: Resume): string {
  const b = r.basics;
  const lines: string[] = [];
  lines.push(b.name, [b.headline].filter(Boolean).join(""), [b.email, b.phone, b.location].filter(Boolean).join(" | "));
  for (const l of b.links) lines.push(`${l.label}: ${l.url}`);
  if (b.summary) lines.push("", "SUMMARY", b.summary);
  if (r.experience.length) {
    lines.push("", "EXPERIENCE");
    for (const x of r.experience) {
      lines.push(`${x.title} — ${x.company}${x.location ? ` (${x.location})` : ""} ${dates(x.start, x.end)}`);
      for (const bl of x.bullets) lines.push(`- ${bl}`);
    }
  }
  if (r.skills.length) {
    lines.push("", "SKILLS");
    for (const s of r.skills) lines.push(`${s.category}: ${s.items.join(", ")}`);
  }
  if (r.projects.length) {
    lines.push("", "PROJECTS");
    for (const p of r.projects) {
      lines.push(`${p.name}${p.url ? ` (${p.url})` : ""}${p.description ? ` — ${p.description}` : ""}`);
      for (const bl of p.bullets) lines.push(`- ${bl}`);
    }
  }
  if (r.education.length) {
    lines.push("", "EDUCATION");
    for (const x of r.education) lines.push(`${x.institution} — ${[x.degree, x.field].filter(Boolean).join(" in ")} ${dates(x.start, x.end)}${x.details ? ` (${x.details})` : ""}`);
  }
  if (r.certifications.length) {
    lines.push("", "CERTIFICATIONS");
    for (const c of r.certifications) lines.push(`${c.name}${c.issuer ? ` — ${c.issuer}` : ""}${c.date ? ` (${c.date})` : ""}`);
  }
  if (r.languages.length) lines.push("", "LANGUAGES", r.languages.map((l) => `${l.language}${l.level ? ` (${l.level})` : ""}`).join(", "));
  return lines.filter((l) => l !== undefined).join("\n");
}
