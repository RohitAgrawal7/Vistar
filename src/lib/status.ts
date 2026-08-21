import type { OrderStatus, SessionStatus } from "@/lib/types";

export const STATUS_COPY: Record<
  OrderStatus,
  { label: string; tone: "amber" | "sage" | "gold" | "terracotta" | "neutral" | "dark" }
> = {
  pending: { label: "Pending kitchen", tone: "amber" },
  confirmed: { label: "Confirmed", tone: "sage" },
  ready: { label: "Ready", tone: "terracotta" },
  awaiting_payment: { label: "On the check", tone: "gold" },
  paid: { label: "Paid", tone: "sage" },
  cancelled: { label: "Deleted", tone: "neutral" },
};

export const GUEST_STATUS_COPY: Record<
  OrderStatus,
  { label: string; tone: "amber" | "sage" | "gold" | "terracotta" | "neutral" | "dark" }
> = {
  pending: { label: "Placed", tone: "sage" },
  confirmed: { label: "Confirmed", tone: "sage" },
  ready: { label: "Ready", tone: "terracotta" },
  awaiting_payment: { label: "On the check", tone: "gold" },
  paid: { label: "Paid", tone: "sage" },
  cancelled: { label: "Cancelled", tone: "neutral" },
};

export const SESSION_COPY: Record<
  SessionStatus,
  { label: string; tone: "amber" | "sage" | "gold" | "terracotta" | "neutral" | "dark" }
> = {
  open: { label: "Ordering", tone: "amber" },
  billing: { label: "Waiting for counter", tone: "gold" },
  paid: { label: "Paid", tone: "terracotta" },
  closed: { label: "Closed", tone: "sage" },
};
