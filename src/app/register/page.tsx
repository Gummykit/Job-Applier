import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser, signupAllowed } from "@/lib/auth";
import { AuthForm } from "@/components/AuthForm";
import { Alert } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function RegisterPage() {
  if (await getCurrentUser()) redirect("/");
  if (!signupAllowed()) {
    return (
      <div className="w-full max-w-sm space-y-4">
        <Alert kind="warning">Sign-ups are disabled on this server. Ask whoever runs it for an account.</Alert>
        <Link href="/login" className="block text-center text-sm font-medium text-slate-900 underline">
          Back to sign in
        </Link>
      </div>
    );
  }
  return <AuthForm mode="register" />;
}
