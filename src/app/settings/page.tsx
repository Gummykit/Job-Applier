import { apiKeyConfigured } from "@/lib/ai";
import { browserStatus } from "@/lib/browser/context";
import { getSettings } from "@/lib/settings";
import { SettingsForm } from "@/components/SettingsForm";
import { BrowserPanel } from "@/components/BrowserPanel";
import { Alert, Card, PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const settings = await getSettings();
  const browser = browserStatus();
  const keyOk = apiKeyConfigured();
  return (
    <>
      <PageHeader title="Settings" description="Model, browser behaviour and sign-ins for the job sites you use." />
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <Card title="Anthropic API">
            {keyOk ? (
              <Alert kind="success">An API key was found in the environment.</Alert>
            ) : (
              <Alert kind="warning">
                No <code>ANTHROPIC_API_KEY</code> in the environment. Add it to <code>.env</code> and restart the server, or sign in with the Anthropic CLI (<code>ant auth login</code>), which the SDK picks up automatically.
              </Alert>
            )}
          </Card>
          <Card title="Agent" description="Applies to every new tailoring and application run.">
            <SettingsForm initial={settings} />
          </Card>
        </div>
        <Card title="Browser & sign-ins" description="The agent uses one persistent browser profile. Sign in to LinkedIn, Indeed, Workday and other sites once; the sessions are reused.">
          <BrowserPanel status={browser} headless={settings.headless} />
        </Card>
      </div>
    </>
  );
}
