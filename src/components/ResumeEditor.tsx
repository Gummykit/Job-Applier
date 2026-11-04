"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Resume } from "@/lib/schemas";
import { Alert, Button, inputClass, labelClass } from "./ui";

type ListKey = "experience" | "education" | "skills" | "projects" | "certifications" | "languages";
type Item<K extends ListKey> = Resume[K][number];

const BLANK: { [K in ListKey]: Item<K> } = {
  experience: { company: "", title: "", location: null, start: null, end: null, bullets: [] },
  education: { institution: "", degree: null, field: null, start: null, end: null, details: null },
  skills: { category: "", items: [] },
  projects: { name: "", description: null, url: null, bullets: [] },
  certifications: { name: "", issuer: null, date: null },
  languages: { language: "", level: null },
};

const nn = (v: string) => (v.trim() ? v : null);
const lines = (v: string) => v.split("\n");
const cleanLines = (a: string[]) => a.map((s) => s.trim()).filter(Boolean);

function Field({ label, value, onChange, placeholder, multiline }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; multiline?: boolean }) {
  return (
    <div>
      <label className={labelClass}>{label}</label>
      {multiline ? (
        <textarea className={`${inputClass} min-h-28 font-mono text-xs`} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input className={inputClass} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
      )}
    </div>
  );
}

function Block({ title, onRemove, children }: { title: string; onRemove: () => void; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-sm font-medium text-slate-700">{title}</div>
        <button type="button" onClick={onRemove} className="text-xs text-red-600 hover:underline">
          Remove
        </button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">{children}</div>
    </div>
  );
}

function SectionHeader({ title, onAdd }: { title: string; onAdd: () => void }) {
  return (
    <div className="mb-3 flex items-center justify-between border-b border-slate-200 pb-1">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</h3>
      <button type="button" onClick={onAdd} className="text-xs font-medium text-slate-700 hover:underline">
        + Add
      </button>
    </div>
  );
}

export function ResumeEditor({ initial, saveUrl, onSaved }: { initial: Resume; saveUrl: string; onSaved?: () => void }) {
  const router = useRouter();
  const [r, setR] = useState<Resume>(initial);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  const basics = (patch: Partial<Resume["basics"]>) => setR((p) => ({ ...p, basics: { ...p.basics, ...patch } }));
  function setItem<K extends ListKey>(key: K, i: number, patch: Partial<Item<K>>) {
    setR((p) => {
      const list = (p[key] as Item<K>[]).slice();
      list[i] = { ...list[i], ...patch };
      return { ...p, [key]: list } as Resume;
    });
  }
  function addItem<K extends ListKey>(key: K) {
    setR((p) => ({ ...p, [key]: [...(p[key] as Item<K>[]), { ...BLANK[key] }] }) as Resume);
  }
  function removeItem<K extends ListKey>(key: K, i: number) {
    setR((p) => ({ ...p, [key]: (p[key] as Item<K>[]).filter((_, j) => j !== i) }) as Resume);
  }

  async function save() {
    setSaving(true);
    setMsg(null);
    const cleaned: Resume = {
      ...r,
      basics: { ...r.basics, links: r.basics.links.filter((l) => l.url.trim()) },
      experience: r.experience.map((x) => ({ ...x, bullets: cleanLines(x.bullets) })),
      projects: r.projects.map((x) => ({ ...x, bullets: cleanLines(x.bullets) })),
      skills: r.skills.map((s) => ({ ...s, items: cleanLines(s.items) })).filter((s) => s.category.trim() || s.items.length),
    };
    const res = await fetch(saveUrl, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ resume: cleaned }) });
    setSaving(false);
    if (!res.ok) {
      setMsg({ kind: "error", text: (await res.json().catch(() => ({}))).error ?? "Could not save." });
      return;
    }
    setR(cleaned);
    setMsg({ kind: "success", text: "Saved." });
    router.refresh();
    onSaved?.();
  }

  const linksText = r.basics.links.map((l) => `${l.label} | ${l.url}`).join("\n");

  return (
    <div className="space-y-8">
      <div>
        <SectionHeader title="Basics" onAdd={() => {}} />
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Full name" value={r.basics.name} onChange={(v) => basics({ name: v })} />
          <Field label="Headline" value={r.basics.headline ?? ""} onChange={(v) => basics({ headline: nn(v) })} placeholder="Senior Software Engineer" />
          <Field label="Email" value={r.basics.email ?? ""} onChange={(v) => basics({ email: nn(v) })} />
          <Field label="Phone" value={r.basics.phone ?? ""} onChange={(v) => basics({ phone: nn(v) })} />
          <Field label="Location" value={r.basics.location ?? ""} onChange={(v) => basics({ location: nn(v) })} />
          <Field
            label="Links (one per line: label | url)"
            value={linksText}
            multiline
            onChange={(v) =>
              basics({
                links: lines(v).map((ln) => {
                  const [label, ...rest] = ln.split("|");
                  return rest.length ? { label: label.trim(), url: rest.join("|").trim() } : { label: "", url: label.trim() };
                }),
              })
            }
          />
          <div className="sm:col-span-2">
            <Field label="Summary" value={r.basics.summary ?? ""} multiline onChange={(v) => basics({ summary: nn(v) })} />
          </div>
        </div>
      </div>

      <div>
        <SectionHeader title="Experience" onAdd={() => addItem("experience")} />
        <div className="space-y-3">
          {r.experience.map((x, i) => (
            <Block key={i} title={x.title || x.company || `Role ${i + 1}`} onRemove={() => removeItem("experience", i)}>
              <Field label="Title" value={x.title} onChange={(v) => setItem("experience", i, { title: v })} />
              <Field label="Company" value={x.company} onChange={(v) => setItem("experience", i, { company: v })} />
              <Field label="Location" value={x.location ?? ""} onChange={(v) => setItem("experience", i, { location: nn(v) })} />
              <div className="grid grid-cols-2 gap-3">
                <Field label="Start" value={x.start ?? ""} onChange={(v) => setItem("experience", i, { start: nn(v) })} />
                <Field label="End" value={x.end ?? ""} onChange={(v) => setItem("experience", i, { end: nn(v) })} placeholder="Present" />
              </div>
              <div className="sm:col-span-2">
                <Field label="Bullets (one per line)" value={x.bullets.join("\n")} multiline onChange={(v) => setItem("experience", i, { bullets: lines(v) })} />
              </div>
            </Block>
          ))}
        </div>
      </div>

      <div>
        <SectionHeader title="Skills" onAdd={() => addItem("skills")} />
        <div className="space-y-3">
          {r.skills.map((s, i) => (
            <Block key={i} title={s.category || `Category ${i + 1}`} onRemove={() => removeItem("skills", i)}>
              <Field label="Category" value={s.category} onChange={(v) => setItem("skills", i, { category: v })} />
              <Field label="Skills (comma-separated)" value={s.items.join(", ")} onChange={(v) => setItem("skills", i, { items: v.split(",") })} />
            </Block>
          ))}
        </div>
      </div>

      <div>
        <SectionHeader title="Projects" onAdd={() => addItem("projects")} />
        <div className="space-y-3">
          {r.projects.map((p, i) => (
            <Block key={i} title={p.name || `Project ${i + 1}`} onRemove={() => removeItem("projects", i)}>
              <Field label="Name" value={p.name} onChange={(v) => setItem("projects", i, { name: v })} />
              <Field label="URL" value={p.url ?? ""} onChange={(v) => setItem("projects", i, { url: nn(v) })} />
              <div className="sm:col-span-2">
                <Field label="Description" value={p.description ?? ""} onChange={(v) => setItem("projects", i, { description: nn(v) })} />
              </div>
              <div className="sm:col-span-2">
                <Field label="Bullets (one per line)" value={p.bullets.join("\n")} multiline onChange={(v) => setItem("projects", i, { bullets: lines(v) })} />
              </div>
            </Block>
          ))}
        </div>
      </div>

      <div>
        <SectionHeader title="Education" onAdd={() => addItem("education")} />
        <div className="space-y-3">
          {r.education.map((x, i) => (
            <Block key={i} title={x.institution || `School ${i + 1}`} onRemove={() => removeItem("education", i)}>
              <Field label="Institution" value={x.institution} onChange={(v) => setItem("education", i, { institution: v })} />
              <Field label="Degree" value={x.degree ?? ""} onChange={(v) => setItem("education", i, { degree: nn(v) })} />
              <Field label="Field of study" value={x.field ?? ""} onChange={(v) => setItem("education", i, { field: nn(v) })} />
              <div className="grid grid-cols-2 gap-3">
                <Field label="Start" value={x.start ?? ""} onChange={(v) => setItem("education", i, { start: nn(v) })} />
                <Field label="End" value={x.end ?? ""} onChange={(v) => setItem("education", i, { end: nn(v) })} />
              </div>
              <div className="sm:col-span-2">
                <Field label="Details" value={x.details ?? ""} onChange={(v) => setItem("education", i, { details: nn(v) })} />
              </div>
            </Block>
          ))}
        </div>
      </div>

      <div>
        <SectionHeader title="Certifications" onAdd={() => addItem("certifications")} />
        <div className="space-y-3">
          {r.certifications.map((c, i) => (
            <Block key={i} title={c.name || `Certification ${i + 1}`} onRemove={() => removeItem("certifications", i)}>
              <Field label="Name" value={c.name} onChange={(v) => setItem("certifications", i, { name: v })} />
              <Field label="Issuer" value={c.issuer ?? ""} onChange={(v) => setItem("certifications", i, { issuer: nn(v) })} />
              <Field label="Date" value={c.date ?? ""} onChange={(v) => setItem("certifications", i, { date: nn(v) })} />
            </Block>
          ))}
        </div>
      </div>

      <div>
        <SectionHeader title="Languages" onAdd={() => addItem("languages")} />
        <div className="space-y-3">
          {r.languages.map((l, i) => (
            <Block key={i} title={l.language || `Language ${i + 1}`} onRemove={() => removeItem("languages", i)}>
              <Field label="Language" value={l.language} onChange={(v) => setItem("languages", i, { language: v })} />
              <Field label="Level" value={l.level ?? ""} onChange={(v) => setItem("languages", i, { level: nn(v) })} />
            </Block>
          ))}
        </div>
      </div>

      {msg && <Alert kind={msg.kind}>{msg.text}</Alert>}
      <div className="sticky bottom-0 -mx-5 border-t border-slate-200 bg-white px-5 py-3">
        <Button onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save resume"}
        </Button>
      </div>
    </div>
  );
}
