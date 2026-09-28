"use client";

import { Button } from "@/components/ui/button";

/** Tela de erro compartilhada por site e portais. O digest é o código de referência do log. */
export function ErrorView({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto w-full max-w-[1180px] px-5 py-24 sm:px-6">
      <h1 className="type-h1">Algo deu errado.</h1>
      <p className="type-lead mt-4 max-w-[44rem] text-muted-foreground">
        Já registramos o problema. Se precisar de ajuda, informe o código{" "}
        <span className="type-data">{error.digest ?? "sem-codigo"}</span>.
      </p>
      <div className="mt-8">
        <Button onClick={reset}>Tentar de novo</Button>
      </div>
    </div>
  );
}
