import { SearchIcon } from "lucide-react";

/** Caixa de busca do topo do admin: formulário GET para /admin/busca. */
export function SearchBox({ defaultValue = "" }: { defaultValue?: string }) {
  return (
    <form action="/admin/busca" method="get" role="search" className="hidden items-center gap-2 rounded-sm border border-input bg-card px-2 md:flex">
      <SearchIcon className="size-4 text-faint" aria-hidden />
      <label htmlFor="busca-global" className="sr-only">Buscar no sistema</label>
      <input id="busca-global" name="q" type="search" defaultValue={defaultValue} placeholder="Buscar…" minLength={2} className="h-8 w-44 bg-transparent text-sm outline-none placeholder:text-faint lg:w-64" />
    </form>
  );
}
