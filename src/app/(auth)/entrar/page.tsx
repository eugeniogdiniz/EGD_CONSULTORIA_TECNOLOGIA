import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "@/modules/auth/components/login-form";

export const metadata: Metadata = { title: "Entrar", robots: { index: false } };

export default function EntrarPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
