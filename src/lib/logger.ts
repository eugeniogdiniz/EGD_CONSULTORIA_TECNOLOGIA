import { randomUUID } from "node:crypto";

type Meta = Record<string, unknown>;
type Level = "info" | "warn" | "error";

function write(level: Level, msg: string, meta?: Meta) {
  const line = JSON.stringify({ level, msg, ts: new Date().toISOString(), ...meta });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

/** Log estruturado em JSON, uma linha por evento. */
export const logger = {
  info: (msg: string, meta?: Meta) => write("info", msg, meta),
  warn: (msg: string, meta?: Meta) => write("warn", msg, meta),
  error: (msg: string, meta?: Meta) => write("error", msg, meta),
};

/** Id curto para correlacionar um erro exibido ao usuário com o log do servidor. */
export const newCorrelationId = () => randomUUID().slice(0, 8);
