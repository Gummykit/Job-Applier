import { getProfile } from "@/lib/profile";
import { formatDate } from "@/lib/utils";
import { ProfilePanels } from "@/components/ProfilePanels";
import { ResumeUpload } from "@/components/ResumeUpload";
import { PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const profile = await getProfile();
  return (
    <>
      <PageHeader title="Profile & resume" description="Your master resume and the answers the agent uses for screening questions. Every tailored resume starts from this one." />
      <div className="space-y-6">
        <ResumeUpload hasProfile={!!profile} originalName={profile?.originalName ?? null} updatedAt={profile ? formatDate(profile.updatedAt) : null} />
        {profile && <ProfilePanels resume={profile.resume} preferences={profile.preferences} />}
      </div>
    </>
  );
}
