/** Primeira mensagem de erro de um campo, anunciada como alerta. */
export function FieldError({ errors, id }: { errors?: string[]; id?: string }) {
  if (!errors?.length) return null;
  return (
    <p id={id} className="type-micro text-danger" role="alert">
      {errors[0]}
    </p>
  );
}
