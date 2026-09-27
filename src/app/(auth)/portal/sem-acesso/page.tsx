import { redirect } from "next/navigation";
import { getSessionUser } from "@/modules/auth/context";
import { signOutAction } from "@/modules/auth/actions";
import { Button } from "@/components/ui/button";
import { SITE } from "@/content/site";

export const metadata = { title: "Sem acesso", robots: { index: false } };

/** Fora do layout do portal de propósito: requirePortal() redireciona para cá quando não há organização ativa. */
export default async function SemAcessoPage() {
  const user = await getSessionUser();
  if (!user) redirect("/entrar");
  return (
    <>
      <h1 className="type-h3 mt-5 leading-tight">Sua conta não está vinculada a nenhuma organização ativa.</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Fale com a EGD em{" "}
        <a href={`mailto:${SITE.email}`} className="font-medium text-link underline decoration-1 underline-offset-[3px]">
          {SITE.email}
        </a>{" "}
        para regularizar o acesso.
      </p>
      <form action={signOutAction} className="mt-6">
        <Button type="submit" variant="outline">
          Sair
        </Button>
      </form>
    </>
  );
}
