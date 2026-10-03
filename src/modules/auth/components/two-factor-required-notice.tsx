/** Faixa de Minha conta quando o 2FA é obrigatório para o papel e ainda está desligado. */
export function TwoFactorRequiredNotice() {
  return (
    <p role="alert" data-testid="2fa-obrigatorio" className="rounded-r-md border-l-[3px] border-warning bg-warning-soft px-4 py-3 text-sm">
      <strong>Ative a verificação em duas etapas para continuar.</strong> A EGD exige o segundo fator para o seu acesso: as demais páginas
      ficam bloqueadas até você concluir a ativação abaixo.
    </p>
  );
}
