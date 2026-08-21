export type MenuCategory = "mixed_veg" | "paneer" | "cheese" | "fries" | "coffee" | "shake";

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "ready"
  | "awaiting_payment"
  | "paid"
  | "cancelled";

export type SessionStatus = "open" | "billing" | "paid" | "closed";

export type PaymentMethod = "card" | "wallet" | "cash";

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: MenuCategory;
  imageSrc: string;
  tags?: string[];
  available: boolean;
}

export interface CartLine {
  itemId: string;
  quantity: number;
}

export interface OrderLine {
  itemId: string;
  name: string;
  category: MenuCategory;
  unitPrice: number;
  quantity: number;
}

export type SessionCloseReason = "paid" | "abandoned" | "exited";

export interface DiningSession {
  id: string;
  tableId: string;
  guestName: string;
  token: string;
  status: SessionStatus;
  createdAt: string;
  updatedAt: string;
  lastActivityAt: string;
  billedAt?: string;
  paidAt?: string;
  closedAt?: string;
  closeReason?: SessionCloseReason;
  abandonNote?: string;
  tokenRevokedAt?: string;
  paymentMethod?: PaymentMethod;
  rating?: number;
  reviewNote?: string;
  reviewedAt?: string;
}

/** Server-side session row (may keep revokedToken for Done → thanks). */
export interface StoredSession extends DiningSession {
  revokedToken?: string;
}

export interface StoredStaff {
  token: string;
  staffName: string;
  createdAt: string;
}

export interface Order {
  id: string;
  sessionId: string;
  tableId: string;
  sequence: number;
  items: OrderLine[];
  status: OrderStatus;
  notes: string;
  subtotal: number;
  tax: number;
  total: number;
  createdAt: string;
  updatedAt: string;
  confirmedAt?: string;
  readyAt?: string;
  paidAt?: string;
  paymentMethod?: PaymentMethod;
  idempotencyKey?: string;
  cancelledFrom?: Exclude<OrderStatus, "cancelled" | "paid">;
  cancelledAt?: string;
}

export interface CreateSessionInput {
  tableId: string;
  guestName: string;
}

export interface CreateOrderInput {
  tableId: string;
  sessionId: string;
  token: string;
  items: OrderLine[];
  notes?: string;
  idempotencyKey: string;
}

export interface OutboxEntry {
  localId: string;
  tableId: string;
  sessionId: string;
  token: string;
  idempotencyKey: string;
  items: OrderLine[];
  notes: string;
  subtotal: number;
  tax: number;
  total: number;
  createdAt: string;
  attemptCount: number;
  nextAttemptAt: number;
  lastError: string | null;
  failed: boolean;
}

export interface PeakDemand {
  category: MenuCategory;
  itemId: string;
  name: string;
  quantity: number;
}

export interface AnalyticsSnapshot {
  totalOrders: number;
  paidOrders: number;
  pendingPaymentCount: number;
  activeKitchenCount: number;
  revenue: number;
  averageTicket: number;
  peakSandwich: PeakDemand | null;
  peakFries: PeakDemand | null;
  peakCoffee: PeakDemand | null;
}

export interface SessionTotals {
  subtotal: number;
  tax: number;
  total: number;
  orderCount: number;
}

export interface TableOccupancy {
  tableId: string;
  occupied: boolean;
}

export interface GuestSessionSnapshot {
  session: DiningSession;
  orders: Order[];
}

export type AuditAction =
  | "staff_login"
  | "staff_logout"
  | "session_closed"
  | "session_abandoned"
  | "session_resumed"
  | "session_exited"
  | "order_cancelled"
  | "order_restored";

export interface AuditEvent {
  id: string;
  at: string;
  action: AuditAction;
  staffName: string;
  note: string;
  tableId?: string;
  sessionId?: string;
  guestName?: string;
}

export interface StaffSession {
  token: string;
  staffName: string;
}

export interface StaffLoginInput {
  pin: string;
  staffName: string;
}

export interface ResumeGrant {
  id: string;
  nonce: string;
  signature: string;
  sessionId: string;
  tableId: string;
  expiresAt: number;
  createdAt: string;
  usedAt?: string;
}

export interface ResumeTicket {
  code: string;
  sessionId: string;
  tableId: string;
  guestName: string;
  expiresAt: number;
}

export interface ResumeClaimResult {
  tableId: string;
  sessionId: string;
  token: string;
  guestName: string;
}

export interface ReviewInput {
  tableId: string;
  rating?: number;
  reviewNote?: string;
}
