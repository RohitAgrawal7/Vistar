import { appConfig } from "@/lib/config";
import { ApiError, type OrderService } from "@/lib/api/types";
import { getStaffToken } from "@/store/staff-store";
import { getSuperAdminToken } from "@/store/super-admin-store";
import type {
  AnalyticsSnapshot,
  AuditEvent,
  CreateOrderInput,
  CreateSessionInput,
  DiningSession,
  FloorSnapshot,
  GuestSessionSnapshot,
  MenuCatalog,
  MenuCategoryInput,
  MenuCategoryRecord,
  MenuItem,
  MenuItemInput,
  Order,
  OrderStatus,
  PaymentMethod,
  ReportSlice,
  ResumeClaimResult,
  ResumeTicket,
  ReviewInput,
  StaffLoginInput,
  StaffSession,
  TableOccupancy,
} from "@/lib/types";

function staffHeaders(): HeadersInit {
  const token = getStaffToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function superAdminHeaders(): HeadersInit {
  const token = getSuperAdminToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const base = appConfig.apiUrl.trim().replace(/\/$/, "");
  const url = `${base}${path.startsWith("/") ? path : `/${path}`}`;
  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
    });
  } catch {
    throw new ApiError(
      base.startsWith("http")
        ? `Kitchen is offline (could not reach ${base}). Set NEXT_PUBLIC_API_URL=/api on Vercel and redeploy.`
        : "Kitchen is offline. Open /api/health — it should show configured:true. Then retry.",
      503,
    );
  }

  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    const raw = await response.text();
    try {
      const body = JSON.parse(raw) as { message?: string };
      if (body.message) message = body.message;
    } catch {
      if (response.status === 500 || response.status === 502 || response.status === 504) {
        message =
          "Kitchen error. Check Supabase env vars and that /api/health returns ok.";
      }
    }
    throw new ApiError(message, response.status);
  }

  if (response.status === 204) return undefined as T;
  const text = await response.text();
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}

export const httpOrderService: OrderService = {
  staffLogin: (input: StaffLoginInput) =>
    request<StaffSession>("/staff/login", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  staffLogout: () => request<void>("/staff/logout", { method: "POST", headers: staffHeaders() }),
  superAdminLogin: (input: StaffLoginInput) =>
    request<StaffSession>("/super-admin/login", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  superAdminLogout: () =>
    request<void>("/super-admin/logout", { method: "POST", headers: superAdminHeaders() }),
  getMenu: () => request<MenuCatalog>("/menu"),
  getAdminMenu: () =>
    request<MenuCatalog>("/super-admin/menu", { headers: superAdminHeaders() }),
  addCategory: (input: MenuCategoryInput) =>
    request<MenuCategoryRecord>("/super-admin/categories", {
      method: "POST",
      headers: superAdminHeaders(),
      body: JSON.stringify(input),
    }),
  updateCategory: (id, input) =>
    request<MenuCategoryRecord>(`/super-admin/categories/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: superAdminHeaders(),
      body: JSON.stringify(input),
    }),
  removeCategory: (id) =>
    request<void>(`/super-admin/categories/${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: superAdminHeaders(),
    }),
  addItem: (input: MenuItemInput) =>
    request<MenuItem>("/super-admin/items", {
      method: "POST",
      headers: superAdminHeaders(),
      body: JSON.stringify(input),
    }),
  updateItem: (id, input) =>
    request<MenuItem>(`/super-admin/items/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: superAdminHeaders(),
      body: JSON.stringify(input),
    }),
  removeItem: (id) =>
    request<void>(`/super-admin/items/${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: superAdminHeaders(),
    }),
  getTableOccupancy: (tableId) => request<TableOccupancy>(`/tables/${encodeURIComponent(tableId)}`),
  getMySession: (tableId, token) =>
    request<GuestSessionSnapshot | null>(
      `/sessions/me?tableId=${encodeURIComponent(tableId)}`,
      { headers: { Authorization: `Bearer ${token}` } },
    ),
  listSessions: () => request<DiningSession[]>("/sessions", { headers: staffHeaders() }),
  getFloor: () => request<FloorSnapshot>("/floor", { headers: staffHeaders() }),
  getReport: (from, to) =>
    request<ReportSlice>(
      `/reports?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
      { headers: staffHeaders() },
    ),
  startSession: (input: CreateSessionInput) =>
    request<DiningSession>("/sessions", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  requestBill: (sessionId, token) =>
    request<DiningSession>(`/sessions/${sessionId}/bill`, {
      method: "POST",
      body: JSON.stringify({ token }),
    }),
  paySession: (sessionId, token, method: PaymentMethod) =>
    request<DiningSession>(`/sessions/${sessionId}/pay`, {
      method: "POST",
      body: JSON.stringify({ token, method }),
    }),
  closeSession: (sessionId) =>
    request<DiningSession>(`/sessions/${sessionId}/close`, {
      method: "POST",
      headers: staffHeaders(),
    }),
  abandonSession: (sessionId, note) =>
    request<DiningSession>(`/sessions/${sessionId}/abandon`, {
      method: "POST",
      headers: staffHeaders(),
      body: JSON.stringify({ note }),
    }),
  exitSession: (sessionId, token) =>
    request<DiningSession>(`/sessions/${sessionId}/exit`, {
      method: "POST",
      body: JSON.stringify({ token }),
    }),
  createResumeCode: (sessionId) =>
    request<ResumeTicket>(`/sessions/${sessionId}/resume`, {
      method: "POST",
      headers: staffHeaders(),
    }),
  claimResume: (code) =>
    request<ResumeClaimResult>("/sessions/claim", {
      method: "POST",
      body: JSON.stringify({ code }),
    }),
  listOrders: () => request<Order[]>("/orders", { headers: staffHeaders() }),
  listAuditEvents: () => request<AuditEvent[]>("/audit", { headers: staffHeaders() }),
  getOrder: (id, token) =>
    request<Order>(`/orders/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    }),
  createOrder: (input: CreateOrderInput) =>
    request<Order>("/orders", {
      method: "POST",
      headers: { "Idempotency-Key": input.idempotencyKey },
      body: JSON.stringify(input),
    }),
  updateOrderStatus: (id: string, status: OrderStatus) =>
    request<Order>(`/orders/${id}`, {
      method: "PATCH",
      headers: staffHeaders(),
      body: JSON.stringify({ status }),
    }),
  getAnalytics: () => request<AnalyticsSnapshot>("/analytics", { headers: staffHeaders() }),
  reviewSession: (sessionId, input: ReviewInput) =>
    request<DiningSession>(`/sessions/${sessionId}/review`, {
      method: "POST",
      body: JSON.stringify(input),
    }),
};
