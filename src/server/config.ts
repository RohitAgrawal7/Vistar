/** Server-only kitchen settings. Prefer these over NEXT_PUBLIC_* in production. */
export const serverConfig = {
  staffPin: process.env.STAFF_PIN ?? process.env.NEXT_PUBLIC_STAFF_PIN ?? "2468",
  resumeSecret:
    process.env.RESUME_SECRET ?? process.env.NEXT_PUBLIC_RESUME_SECRET ?? "vistar-resume-demo",
  taxRate: Number(process.env.TAX_RATE ?? process.env.NEXT_PUBLIC_TAX_RATE ?? "0.05"),
  sessionIdleMinutes: Number(
    process.env.SESSION_IDLE_MINUTES ?? process.env.NEXT_PUBLIC_SESSION_IDLE_MINUTES ?? "15",
  ),
  corsOrigin: process.env.CORS_ORIGIN ?? "",
} as const;
