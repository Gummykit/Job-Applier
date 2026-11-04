import type { Resume } from "@/lib/schemas";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-6">
      <h3 className="mb-2 border-b border-slate-200 pb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</h3>
      {children}
    </section>
  );
}

const dates = (s: string | null, e: string | null) => [s, e].filter(Boolean).join(" – ");

export function ResumeView({ resume: r }: { resume: Resume }) {
  const b = r.basics;
  return (
    <div className="text-sm text-slate-800">
      <div className="mb-6">
        <div className="text-xl font-semibold text-slate-900">{b.name}</div>
        {b.headline && <div className="text-slate-600">{b.headline}</div>}
        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
          {[b.email, b.phone, b.location].filter(Boolean).map((x) => (
            <span key={x as string}>{x}</span>
          ))}
          {b.links.map((l) => (
            <a key={l.url} href={l.url} target="_blank" rel="noreferrer" className="text-slate-700 underline">
              {l.label || l.url}
            </a>
          ))}
        </div>
      </div>
      {b.summary && (
        <Section title="Summary">
          <p>{b.summary}</p>
        </Section>
      )}
      {r.experience.length > 0 && (
        <Section title="Experience">
          <div className="space-y-4">
            {r.experience.map((x, i) => (
              <div key={i}>
                <div className="flex flex-wrap justify-between gap-2">
                  <div>
                    <span className="font-medium text-slate-900">{x.title}</span>, {x.company}
                    {x.location && <span className="text-slate-500"> · {x.location}</span>}
                  </div>
                  <div className="text-slate-500">{dates(x.start, x.end)}</div>
                </div>
                <ul className="mt-1 list-disc space-y-0.5 pl-5">
                  {x.bullets.map((bl, j) => (
                    <li key={j}>{bl}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Section>
      )}
      {r.skills.length > 0 && (
        <Section title="Skills">
          {r.skills.map((s, i) => (
            <div key={i}>
              <span className="font-medium text-slate-900">{s.category}:</span> {s.items.join(", ")}
            </div>
          ))}
        </Section>
      )}
      {r.projects.length > 0 && (
        <Section title="Projects">
          <div className="space-y-3">
            {r.projects.map((p, i) => (
              <div key={i}>
                <span className="font-medium text-slate-900">{p.name}</span>
                {p.url && (
                  <a href={p.url} className="ml-2 text-xs text-slate-500 underline" target="_blank" rel="noreferrer">
                    {p.url}
                  </a>
                )}
                {p.description && <div>{p.description}</div>}
                {p.bullets.length > 0 && (
                  <ul className="mt-1 list-disc pl-5">
                    {p.bullets.map((bl, j) => (
                      <li key={j}>{bl}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}
      {r.education.length > 0 && (
        <Section title="Education">
          {r.education.map((x, i) => (
            <div key={i} className="flex flex-wrap justify-between gap-2">
              <div>
                <span className="font-medium text-slate-900">{x.institution}</span>
                {(x.degree || x.field) && <span>, {[x.degree, x.field].filter(Boolean).join(" in ")}</span>}
                {x.details && <span className="text-slate-500"> · {x.details}</span>}
              </div>
              <div className="text-slate-500">{dates(x.start, x.end)}</div>
            </div>
          ))}
        </Section>
      )}
      {r.certifications.length > 0 && (
        <Section title="Certifications">
          {r.certifications.map((c, i) => (
            <div key={i}>
              {c.name}
              {c.issuer && <span className="text-slate-500"> — {c.issuer}</span>}
              {c.date && <span className="text-slate-500"> ({c.date})</span>}
            </div>
          ))}
        </Section>
      )}
      {r.languages.length > 0 && (
        <Section title="Languages">
          <div>{r.languages.map((l) => `${l.language}${l.level ? ` (${l.level})` : ""}`).join(", ")}</div>
        </Section>
      )}
    </div>
  );
}
