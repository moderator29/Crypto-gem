import type { Metadata } from "next";
import { LoginForm } from "@/components/pay/LoginForm";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <div className="mx-auto max-w-md pt-8">
      <LoginForm next={next && next.startsWith("/") && !next.startsWith("//") ? next : "/"} />
    </div>
  );
}
