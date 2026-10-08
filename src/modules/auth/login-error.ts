/**
 * A mensagem que o formulário de login mostra para um erro do Better Auth.
 *
 * Só senha errada (401) vira "E-mail ou senha incorretos". Antes, qualquer erro
 * caía nessa frase: em 08/10/2026 o login pelo www.egdsystem.com.br era recusado
 * por origem (403 INVALID_ORIGIN) e a tela dizia que a senha estava errada, com a
 * senha certa. Erro de outro tipo diz o que é, com o código para o suporte.
 */
export type LoginError = { status?: number; code?: string; message?: string };

export function loginErrorMessage(error: LoginError): string {
  if (error.status === 429) return error.message || "Muitas tentativas. Aguarde 15 minutos.";
  if (error.status === 401) return "E-mail ou senha incorretos.";
  if (error.code === "INVALID_ORIGIN" || error.code === "MISSING_OR_NULL_ORIGIN") {
    return "Este endereço não está autorizado a entrar. Acesse pelo endereço oficial do sistema.";
  }
  const codigo = error.code || (error.status ? `HTTP ${error.status}` : "sem resposta");
  return `Não foi possível entrar agora (${codigo}). Tente de novo em instantes; se continuar, fale com o suporte.`;
}
