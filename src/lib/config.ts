function envString(raw: string | undefined, fallback: string) {
  const trimmed = raw?.trim();
  return trimmed ? trimmed : fallback;
}

function resolveApiUrl() {
  const raw = process.env.NEXT_PUBLIC_API_URL;
  if (raw === undefined) return "/api";
  const trimmed = raw.trim();
  if (trimmed === "mock") return "";
  if (!trimmed) return "/api";
  // Deployed site must never call a local kitchen process.
  if (/localhost|127\.0\.0\.1/i.test(trimmed)) return "/api";
  return trimmed;
}

function resolvePositiveNumber(raw: string | undefined, fallback: number, minimum: number) {
  const trimmed = raw?.trim();
  if (!trimmed) return fallback;
  const value = Number(trimmed);
  if (!Number.isFinite(value) || value < minimum) return fallback;
  return value;
}

export const appConfig = {
  restaurantName: envString(process.env.NEXT_PUBLIC_RESTAURANT_NAME, "Vistar"),
  tagline: envString(
    process.env.NEXT_PUBLIC_TAGLINE,
    "Freshly Made. Boldly Flavoured. Perfectly Loaded.",
  ),
  welcomeMessage: envString(
    process.env.NEXT_PUBLIC_WELCOME_MESSAGE,
    `Welcome to ${envString(process.env.NEXT_PUBLIC_RESTAURANT_NAME, "Vistar")} Sandwich`,
  ),
  welcomeBody: envString(
    process.env.NEXT_PUBLIC_WELCOME_BODY,
    "Sandwiches, fries, iced coffees, and shakes — order from your table. The counter sees it live.",
  ),
  logoSrc: envString(process.env.NEXT_PUBLIC_LOGO_SRC, "/logo.jpg"),
  logoLightSrc: envString(process.env.NEXT_PUBLIC_LOGO_LIGHT_SRC, "/logo.jpg"),
  heroSrc: process.env.NEXT_PUBLIC_HERO_SRC?.trim() ?? "",
  splashMs: resolvePositiveNumber(process.env.NEXT_PUBLIC_SPLASH_MS, 2200, 0),
  apiUrl: resolveApiUrl(),
  currency: envString(process.env.NEXT_PUBLIC_CURRENCY, "INR"),
  locale: envString(process.env.NEXT_PUBLIC_LOCALE, "en-IN"),
  taxRate: resolvePositiveNumber(process.env.NEXT_PUBLIC_TAX_RATE, 0.05, 0),
  taxLabel: envString(process.env.NEXT_PUBLIC_TAX_LABEL, "GST"),
  // Empty/0 env values used to create setInterval(0) → request storms.
  pollIntervalMs: resolvePositiveNumber(process.env.NEXT_PUBLIC_POLL_INTERVAL_MS, 3000, 1500),
  sessionIdleMinutes: resolvePositiveNumber(process.env.NEXT_PUBLIC_SESSION_IDLE_MINUTES, 15, 1),
  staffPin: envString(process.env.NEXT_PUBLIC_STAFF_PIN, "2468"),
  resumeSecret: envString(process.env.NEXT_PUBLIC_RESUME_SECRET, "vistar-resume-demo"),
  upiVpa: envString(process.env.NEXT_PUBLIC_UPI_VPA, "vistarcafe@upi"),
  appUrl: process.env.NEXT_PUBLIC_APP_URL?.trim() ?? "",
  tableMin: 1,
  tableMax: 5,
} as const;

export function isRemoteApiEnabled() {
  return appConfig.apiUrl.trim().length > 0;
}
