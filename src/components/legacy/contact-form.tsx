"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { submitContact, type ContactState } from "@/modules/leads/actions";
import { Arrow } from "./ui";

const INTERESTS = [
  "Desenvolvimento",
  "Automação",
  "Data & BI",
  "Agentes de IA",
  "Governança",
  "Projetos Ágeis",
];
const BUDGETS: [string, string][] = [
  ["<50k", "até 50 mil"],
  ["50-200k", "50–200 mil"],
  ["200-500k", "200–500 mil"],
  [">500k", "acima de 500 mil"],
  ["?", "ainda não sei"],
];

/** Formulário original de contato, ligado ao sistema (grava lead e avisa por e-mail). */
export function ContactForm() {
  const [state, action, pending] = useActionState<ContactState, FormData>(
    submitContact,
    null,
  );
  const [budget, setBudget] = useState("50-200k");
  const [interest, setInterest] = useState<string[]>([]);
  const toggleInterest = (v: string) =>
    setInterest((arr) =>
      arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v],
    );
  const fe = state && !state.ok ? state.fieldErrors : undefined;

  // Áreas e investimento entram no início da mensagem (o sistema guarda um texto só).
  const prefix = [
    interest.length ? `Áreas de interesse: ${interest.join(", ")}` : null,
    `Investimento previsto: ${BUDGETS.find((b) => b[0] === budget)?.[1] ?? budget}`,
  ]
    .filter(Boolean)
    .join("\n");

  return (
    <div className="form-card reveal">
      <form
        action={action}
        noValidate
        onSubmit={(e) => {
          const ta = e.currentTarget.querySelector<HTMLTextAreaElement>(
            'textarea[name="message"]',
          );
          if (
            ta &&
            !ta.value.startsWith("Áreas de interesse") &&
            !ta.value.startsWith("Investimento previsto")
          )
            ta.value = `${prefix}\n\n${ta.value}`;
        }}
      >
        <input
          type="text"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          className="hidden"
          aria-hidden="true"
          style={{ display: "none" }}
        />
        <div className="form-row split">
          <div>
            <label htmlFor="name">Nome</label>
            <input
              id="name"
              name="name"
              type="text"
              placeholder="Seu nome completo"
              required
            />
            {fe?.name && <span className="form-error">{fe.name[0]}</span>}
          </div>
          <div>
            <label htmlFor="company">Empresa</label>
            <input
              id="company"
              name="company"
              type="text"
              placeholder="Nome da empresa"
            />
          </div>
        </div>
        <div className="form-row split">
          <div>
            <label htmlFor="email">E-mail</label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="voce@empresa.com"
              required
            />
            {fe?.email && <span className="form-error">{fe.email[0]}</span>}
          </div>
          <div>
            <label htmlFor="phone">Telefone</label>
            <input
              id="phone"
              name="phone"
              type="tel"
              placeholder="(11) 99999-0000"
            />
          </div>
        </div>

        <div className="form-row">
          <label>Áreas de interesse</label>
          <div className="budget-pills">
            {INTERESTS.map((opt) => (
              <button
                type="button"
                key={opt}
                className={`budget-pill ${interest.includes(opt) ? "active" : ""}`}
                onClick={() => toggleInterest(opt)}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>

        <div className="form-row">
          <label>Investimento previsto (R$)</label>
          <div className="budget-pills">
            {BUDGETS.map(([k, v]) => (
              <button
                type="button"
                key={k}
                className={`budget-pill ${budget === k ? "active" : ""}`}
                onClick={() => setBudget(k)}
              >
                {v}
              </button>
            ))}
          </div>
        </div>

        <div className="form-row">
          <label htmlFor="message">Conta o desafio</label>
          <textarea
            id="message"
            name="message"
            placeholder="Contexto, problema atual, resultado esperado, prazo aproximado..."
          ></textarea>
          {fe?.message && <span className="form-error">{fe.message[0]}</span>}
        </div>

        {state && !state.ok && !fe && (
          <p className="form-error" role="alert" style={{ marginBottom: 12 }}>
            {state.error}
          </p>
        )}

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: 8,
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <span
            style={{
              fontFamily: "var(--mono)",
              fontSize: 11,
              color: "var(--fg-mute)",
              letterSpacing: "0.05em",
            }}
          >
            🔒 SEUS DADOS SOMENTE PARA O CONTATO INICIAL
          </span>
          <button type="submit" className="btn btn-primary" disabled={pending}>
            {pending ? "Enviando…" : "Enviar mensagem"} <Arrow />
          </button>
        </div>
      </form>

      {state?.ok && (
        <div className="form-success show" role="status">
          <div>
            <div className="check">
              <svg
                viewBox="0 0 24 24"
                width="28"
                height="28"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M5 12l5 5 9-12" />
              </svg>
            </div>
            <h3 style={{ fontSize: 24, marginBottom: 10 }}>
              Mensagem recebida.
            </h3>
            <p style={{ maxWidth: 360 }}>
              Em até 48h um de nós retorna. Enquanto isso, você pode dar uma
              olhada nos nossos serviços ou produtos.
            </p>
            <div
              style={{
                display: "flex",
                gap: 10,
                justifyContent: "center",
                marginTop: 24,
              }}
            >
              <Link href="/servicos" className="btn btn-ghost btn-sm">
                Ver serviços
              </Link>
              <Link href="/produtos" className="btn btn-sm">
                Ver produtos
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
