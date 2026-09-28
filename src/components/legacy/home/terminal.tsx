"use client";

import { useEffect, useState } from "react";

type Line =
  | { type: "prompt"; txt: string; input?: string; isCursor?: boolean }
  | { type: "out"; txt: string; tail?: string; tailCls?: string; em?: string; emCls?: string; txt2?: string; em2?: string; em2Cls?: string }
  | { type: "spacer" };

const TERM_LINES: Line[] = [
  { type: "prompt", txt: "egd@stack:~$ ", input: "deploy --env=prod --pipeline=customer-360" },
  { type: "out", txt: "→ Validating manifests ............ ", tail: "OK", tailCls: "ok" },
  { type: "out", txt: "→ Building containers (3/3) ....... ", tail: "OK", tailCls: "ok" },
  { type: "out", txt: "→ Pushing to ECR + ACR ............ ", tail: "OK", tailCls: "ok" },
  { type: "out", txt: "→ Apache Airflow DAG sync ......... ", tail: "OK", tailCls: "ok" },
  { type: "out", txt: "→ Kafka topics provisioned ........ ", tail: "OK", tailCls: "ok" },
  { type: "out", txt: "→ Power BI dataset refresh ........ ", tail: "OK", tailCls: "ok" },
  { type: "out", txt: "→ Smoke tests (42 passed) ......... ", tail: "OK", tailCls: "ok" },
  { type: "spacer" },
  { type: "out", txt: "✓ pipeline ", em: "customer-360", emCls: "key", txt2: " live em ", em2: "1m 47s", em2Cls: "num" },
  { type: "out", txt: "  ↳ throughput: ", em: "12.4k events/s", emCls: "num", txt2: " · latência p99: ", em2: "84ms", em2Cls: "num" },
  { type: "spacer" },
  { type: "prompt", txt: "egd@stack:~$ ", input: "_", isCursor: true },
];

/** Terminal animado do hero (portado do original). */
export function Terminal() {
  const [shown, setShown] = useState(0);
  const [typing, setTyping] = useState("");

  useEffect(() => {
    if (shown >= TERM_LINES.length) return;
    const line = TERM_LINES[shown];
    if (line.type === "prompt" && line.input && !line.isCursor) {
      let i = 0;
      const input = line.input;
      const t = setInterval(() => {
        i++;
        setTyping(input.slice(0, i));
        if (i >= input.length) {
          clearInterval(t);
          setTimeout(() => {
            setShown((s) => s + 1);
            setTyping("");
          }, 360);
        }
      }, 28);
      return () => clearInterval(t);
    }
    const delay = line.type === "spacer" ? 80 : 180;
    const t = setTimeout(() => setShown((s) => s + 1), delay);
    return () => clearTimeout(t);
  }, [shown]);

  useEffect(() => {
    if (shown >= TERM_LINES.length) {
      const t = setTimeout(() => setShown(0), 6000);
      return () => clearTimeout(t);
    }
  }, [shown]);

  const current = TERM_LINES[shown];

  return (
    <div className="terminal">
      <div className="term-head">
        <div className="term-dots"><i></i><i></i><i></i></div>
        <div className="term-title">~ /egd/ops/deploy.log</div>
        <div className="term-meta">zsh · 132×24</div>
      </div>
      <div className="term-body" style={{ minHeight: 420 }}>
        {TERM_LINES.slice(0, shown).map((l, i) => {
          if (l.type === "spacer") return <div key={i} style={{ height: 8 }}></div>;
          if (l.type === "prompt") {
            return (
              <div className="ln" key={i}>
                <span className="lno">{String(i + 1).padStart(2, "0")}</span>
                <div>
                  <span className="prompt">{l.txt}</span>
                  <span>{l.input}</span>
                </div>
              </div>
            );
          }
          return (
            <div className="ln" key={i}>
              <span className="lno">{String(i + 1).padStart(2, "0")}</span>
              <div>
                <span className="out">{l.txt}</span>
                {l.em && <span className={l.emCls}>{l.em}</span>}
                {l.txt2 && <span className="out">{l.txt2}</span>}
                {l.em2 && <span className={l.em2Cls}>{l.em2}</span>}
                {l.tail && <span className={l.tailCls}>[ {l.tail} ]</span>}
              </div>
            </div>
          );
        })}
        {current && current.type === "prompt" && current.input && !current.isCursor && (
          <div className="ln">
            <span className="lno">{String(shown + 1).padStart(2, "0")}</span>
            <div>
              <span className="prompt">{current.txt}</span>
              <span className="cur">{typing}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
