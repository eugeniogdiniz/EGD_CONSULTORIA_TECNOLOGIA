/**
 * Agendador em processo: um tique por minuto confere, para cada automação
 * ligada, se o período corrente está devido e ainda não foi executado.
 * Estado em `globalThis` para sobreviver ao HMR do dev e nunca duplicar o
 * intervalo; `unref()` para não segurar o processo em testes e builds.
 */
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { JOBS } from "./registry";
import { applyOverride, isDue } from "./schedule";
import { claimAndRun } from "./runner";
import { listJobSettings } from "./queries";
import { processWebhookDeliveries } from "@/modules/webhooks/deliver";

export const TICK_MS = 60_000;
const FIRST_TICK_MS = 30_000;

type State = { timer: NodeJS.Timeout | null; enabled: boolean; ticking: boolean; lastTickAt: Date | null; startedAt: Date | null };
const g = globalThis as unknown as { __egdScheduler?: State };
const state: State = (g.__egdScheduler ??= { timer: null, enabled: false, ticking: false, lastTickAt: null, startedAt: null });

/** `JOBS_ENABLED` explícito manda; sem ele, só produção. */
export const jobsEnabled = () => (env.JOBS_ENABLED ? env.JOBS_ENABLED === "1" : env.NODE_ENV === "production");

export async function tick(now = new Date()): Promise<void> {
  if (state.ticking) return;
  state.ticking = true;
  try {
    state.lastTickAt = now;
    const settings = await listJobSettings();
    for (const job of JOBS) {
      const s = settings.get(job.key);
      if (s?.enabled === false || !isDue(applyOverride(job.schedule, s), now)) continue;
      await claimAndRun(job, now, applyOverride(job.schedule, s));
    }
    // webhooks de saída (Fase 21): entregas pendentes com nova tentativa devida
    await processWebhookDeliveries(now);
  } catch (err) {
    logger.error("scheduler.tick_failed", { err: String(err) });
  } finally {
    state.ticking = false;
  }
}

export function startSchedulerIfEnabled(): boolean {
  if (!jobsEnabled()) {
    logger.info("scheduler.disabled", { JOBS_ENABLED: env.JOBS_ENABLED ?? null, NODE_ENV: env.NODE_ENV });
    return false;
  }
  if (state.timer) return true;
  state.enabled = true;
  state.startedAt = new Date();
  const first = setTimeout(() => void tick(), FIRST_TICK_MS);
  first.unref();
  state.timer = setInterval(() => void tick(), TICK_MS);
  state.timer.unref();
  logger.info("scheduler.started", { jobs: JOBS.map((j) => j.key) });
  return true;
}

export function getSchedulerState() {
  return { enabled: state.enabled, lastTickAt: state.lastTickAt, startedAt: state.startedAt };
}
