import type { Metadata } from "next";
import Link from "next/link";
import { ResetForm } from "@/modules/auth/components/reset-form";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Definir nova senha", robots: { index: false } };

export default async function RedefinirSenhaPage({ searchParams }: PageProps<"/redefinir-senha">) {
  const sp = await searchParams;
  const token = typeof sp.token === "string" ? sp.token : "";
  const error = typeof sp.error === "string" ? sp.error : "";

  if (!token || error) {
    return (
      <>
        <h1 className="type-h3 mt-5">Este link não é mais válido.</h1>
        <p className="mt-2 text-sm text-muted-foreground">Links de redefinição valem por 1 hora e só podem ser usados uma vez.</p>
        <div className="mt-6">
          <Button render={<Link href="/recuperar-senha" />}>Pedir um novo link</Button>
        </div>
      </>
    );
  }
  return <ResetForm token={token} />;
}
