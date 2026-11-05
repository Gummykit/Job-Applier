import type { Metadata } from "next";
import "./globals.css";
import { getCurrentUser } from "@/lib/auth";
import { Sidebar } from "@/components/Sidebar";

export const metadata: Metadata = {
  title: "AutoApply",
  description: "AI agent that tailors your resume and applies to jobs for you",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const user = await getCurrentUser();
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        {user ? (
          <div className="flex min-h-screen flex-col md:flex-row">
            <Sidebar user={user} />
            <main className="min-w-0 flex-1">
              <div className="mx-auto max-w-6xl px-4 py-6 md:px-10 md:py-8">{children}</div>
            </main>
          </div>
        ) : (
          <main className="flex min-h-screen items-center justify-center px-4 py-10">{children}</main>
        )}
      </body>
    </html>
  );
}
