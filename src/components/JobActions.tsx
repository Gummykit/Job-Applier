"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "./ui";

export function JobActions({ id, status, redirectAfterDelete }: { id: string; status: string; redirectAfterDelete?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function retry() {
    setBusy(true);
    await fetch(`/api/jobs/${id}/retry`, { method: "POST" });
    setBusy(false);
    router.refresh();
  }
  async function remove() {
    if (!confirm("Delete this job and its tailored resumes and application logs?")) return;
    setBusy(true);
    await fetch(`/api/jobs/${id}`, { method: "DELETE" });
    setBusy(false);
    if (redirectAfterDelete) router.push(redirectAfterDelete);
    router.refresh();
  }

  return (
    <div className="inline-flex gap-2">
      {status === "failed" && (
        <Button size="sm" variant="secondary" onClick={retry} disabled={busy}>
          Retry import
        </Button>
      )}
      <Button size="sm" variant="danger" onClick={remove} disabled={busy}>
        Delete
      </Button>
    </div>
  );
}
