export type RequestStatus = "open" | "in_progress" | "resolved";

export const STATUS_LABEL: Record<RequestStatus, string> = {
  open: "Aberta",
  in_progress: "Em andamento",
  resolved: "Resolvida",
};

export const STATUS_STYLE: Record<RequestStatus, string> = {
  open: "border-warning bg-warning-soft text-warning",
  in_progress: "border-link bg-link-soft text-link",
  resolved: "border-success bg-success-soft text-success",
};

export const isRequestStatus = (s: string): s is RequestStatus => s in STATUS_LABEL;

/**
 * Status depois de uma resposta. A equipe respondendo uma aberta a coloca em
 * andamento; o cliente respondendo uma resolvida a reabre. Nos demais casos não muda.
 */
export function statusAfterReply(current: RequestStatus, author: "team" | "client"): RequestStatus {
  if (author === "team" && current === "open") return "in_progress";
  if (author === "client" && current === "resolved") return "open";
  return current;
}

export const canClientResolve = (status: RequestStatus) => status !== "resolved";
