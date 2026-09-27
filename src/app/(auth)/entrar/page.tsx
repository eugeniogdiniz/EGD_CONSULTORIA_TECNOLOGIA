import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/modules/auth/context";
import { LoginForm } from "@/modules/auth/components/login-form";

export const metadata: Metadata = { title: "Entrar", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function EntrarPage() {
  // Sessão válida não precisa da tela de login (cookie inválido/revogado cai aqui normalmente).
  const user = await getSessionUser();
  if (user) redirect(user.role === "admin" ? "/admin" : "/portal");
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
