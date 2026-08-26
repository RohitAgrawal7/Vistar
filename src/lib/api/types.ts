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

export class ApiError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export interface OrderService {
  staffLogin(input: StaffLoginInput): Promise<StaffSession>;
  staffLogout(): Promise<void>;
  superAdminLogin(input: StaffLoginInput): Promise<StaffSession>;
  superAdminLogout(): Promise<void>;
  getMenu(): Promise<MenuCatalog>;
  getAdminMenu(): Promise<MenuCatalog>;
  addCategory(input: MenuCategoryInput): Promise<MenuCategoryRecord>;
  updateCategory(id: string, input: Partial<MenuCategoryInput>): Promise<MenuCategoryRecord>;
  removeCategory(id: string): Promise<void>;
  addItem(input: MenuItemInput): Promise<MenuItem>;
  updateItem(id: string, input: Partial<MenuItemInput>): Promise<MenuItem>;
  removeItem(id: string): Promise<void>;
  getTableOccupancy(tableId: string): Promise<TableOccupancy>;
  getMySession(tableId: string, token: string): Promise<GuestSessionSnapshot | null>;
  listSessions(): Promise<DiningSession[]>;
  getFloor(): Promise<FloorSnapshot>;
  getReport(from: string, to: string): Promise<ReportSlice>;
  startSession(input: CreateSessionInput): Promise<DiningSession>;
  requestBill(sessionId: string, token: string): Promise<DiningSession>;
  paySession(sessionId: string, token: string, method: PaymentMethod): Promise<DiningSession>;
  closeSession(sessionId: string): Promise<DiningSession>;
  abandonSession(sessionId: string, note: string): Promise<DiningSession>;
  exitSession(sessionId: string, token: string): Promise<DiningSession>;
  createResumeCode(sessionId: string): Promise<ResumeTicket>;
  claimResume(code: string): Promise<ResumeClaimResult>;
  listOrders(): Promise<Order[]>;
  listAuditEvents(): Promise<AuditEvent[]>;
  getOrder(id: string, token: string): Promise<Order>;
  createOrder(input: CreateOrderInput): Promise<Order>;
  updateOrderStatus(id: string, status: OrderStatus): Promise<Order>;
  getAnalytics(): Promise<AnalyticsSnapshot>;
  reviewSession(sessionId: string, input: ReviewInput): Promise<DiningSession>;
}

export async function delay(ms = 280) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}
