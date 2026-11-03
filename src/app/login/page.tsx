import type { Metadata } from "next";
import { LoginPanel } from "@/components/auth/LoginPanel";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <div className="mx-auto max-w-md pt-8">
      <LoginPanel next={next && next.startsWith("/") && !next.startsWith("//") ? next : "/"} />
    </div>
  );
}
