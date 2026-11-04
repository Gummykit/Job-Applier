"use client";

import { useState } from "react";
import type { Preferences } from "@/lib/preferences";
import type { Resume } from "@/lib/schemas";
import { PreferencesForm } from "./PreferencesForm";
import { ResumeEditor } from "./ResumeEditor";
import { ResumeView } from "./ResumeView";
import { Card } from "./ui";

const TABS = ["Resume", "Edit resume", "Screening answers"] as const;

export function ProfilePanels({ resume, preferences }: { resume: Resume; preferences: Preferences }) {
  const [tab, setTab] = useState<(typeof TABS)[number]>("Resume");
  return (
    <Card>
      <div className="mb-4 flex gap-1 border-b border-slate-200">
        {TABS.map((t) => (
          <button key={t} type="button" onClick={() => setTab(t)} className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium ${tab === t ? "border-slate-900 text-slate-900" : "border-transparent text-slate-500 hover:text-slate-800"}`}>
            {t}
          </button>
        ))}
      </div>
      {tab === "Resume" && <ResumeView resume={resume} />}
      {tab === "Edit resume" && <ResumeEditor key={JSON.stringify(resume).length} initial={resume} saveUrl="/api/profile" />}
      {tab === "Screening answers" && <PreferencesForm initial={preferences} />}
    </Card>
  );
}
