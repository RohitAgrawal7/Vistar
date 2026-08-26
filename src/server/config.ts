/** Server-only kitchen settings. Prefer these over NEXT_PUBLIC_* in production. */

function envString(raw: string | undefined, fallback: string) {
  const trimmed = raw?.trim();
  return trimmed ? trimmed : fallback;
}

function envNumber(raw: string | undefined, fallback: number) {
  const trimmed = raw?.trim();
  if (!trimmed) return fallback;
  const value = Number(trimmed);
  return Number.isFinite(value) ? value : fallback;
}

export const serverConfig = {
  resumeSecret: envString(
    process.env.RESUME_SECRET ?? process.env.NEXT_PUBLIC_RESUME_SECRET,
    "vistar-resume-demo",
  ),
  // GST disabled — menu prices are final.
  taxRate: 0,
  sessionIdleMinutes: envNumber(
    process.env.SESSION_IDLE_MINUTES ?? process.env.NEXT_PUBLIC_SESSION_IDLE_MINUTES,
    15,
  ),
  corsOrigin: process.env.CORS_ORIGIN?.trim() ?? "",
} as const;
