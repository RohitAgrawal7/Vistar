export const serverConfig = {
  staffPin: process.env.STAFF_PIN ?? "2468",
  resumeSecret: process.env.RESUME_SECRET ?? "vistar-resume-demo",
  taxRate: 0,
  sessionIdleMinutes: Number(process.env.SESSION_IDLE_MINUTES ?? "15"),
  corsOrigin: process.env.CORS_ORIGIN ?? "",
} as const;
