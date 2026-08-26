import { appConfig } from "@/lib/config";
import { formatCurrency, formatDateTime } from "@/lib/format";
import type { AuditEvent, DiningSession, Order } from "@/lib/types";

export type ReportKind =
  | "orders_day"
  | "orders_month"
  | "audit_day"
  | "audit_month";

export const REPORT_KIND_LABEL: Record<ReportKind, string> = {
  orders_day: "Orders by day",
  orders_month: "Monthly orders",
  audit_day: "Audit — day",
  audit_month: "Audit — month",
};

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export function localDateKey(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function localMonthKey(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

export function todayKey(now = new Date()) {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function currentMonthKey(now = new Date()) {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;
}

export function monthLabel(monthKey: string) {
  const [y, m] = monthKey.split("-").map(Number);
  try {
    return new Intl.DateTimeFormat(appConfig.locale, {
      month: "long",
      year: "numeric",
    }).format(new Date(y, m - 1, 1));
  } catch {
    return monthKey;
  }
}

export function dayLabel(dayKey: string) {
  const [y, m, d] = dayKey.split("-").map(Number);
  try {
    return new Intl.DateTimeFormat(appConfig.locale, {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(y, m - 1, d));
  } catch {
    return dayKey;
  }
}

/** Local-calendar day → ISO range for DB queries (respects café timezone). */
export function dayRangeIso(dayKey: string) {
  const [y, m, d] = dayKey.split("-").map(Number);
  const from = new Date(y, m - 1, d, 0, 0, 0, 0);
  const to = new Date(y, m - 1, d + 1, 0, 0, 0, 0);
  return { from: from.toISOString(), to: to.toISOString() };
}

/** Local-calendar month → ISO range. */
export function monthRangeIso(monthKey: string) {
  const [y, m] = monthKey.split("-").map(Number);
  const from = new Date(y, m - 1, 1, 0, 0, 0, 0);
  const to = new Date(y, m, 1, 0, 0, 0, 0);
  return { from: from.toISOString(), to: to.toISOString() };
}

const AUDIT_LABEL: Record<AuditEvent["action"], string> = {
  staff_login: "Sign-in",
  staff_logout: "Sign-out",
  super_admin_login: "Super admin in",
  super_admin_logout: "Super admin out",
  session_closed: "Done",
  session_abandoned: "Force clear",
  session_resumed: "Resume device",
  session_exited: "Guest exit",
  order_cancelled: "Order deleted",
  order_restored: "Order undone",
  menu_updated: "Menu updated",
};

export function auditActionLabel(action: AuditEvent["action"]) {
  return AUDIT_LABEL[action] ?? action;
}

export function ordersForDay(orders: Order[], dayKey: string) {
  return [...orders]
    .filter((order) => localDateKey(order.createdAt) === dayKey)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function ordersForMonth(orders: Order[], monthKey: string) {
  return [...orders]
    .filter((order) => localMonthKey(order.createdAt) === monthKey)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function auditsForDay(events: AuditEvent[], dayKey: string) {
  return [...events]
    .filter((event) => localDateKey(event.at) === dayKey)
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
}

export function auditsForMonth(events: AuditEvent[], monthKey: string) {
  return [...events]
    .filter((event) => localMonthKey(event.at) === monthKey)
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
}

export function summarizeOrders(orders: Order[]) {
  const paid = orders.filter((order) => order.status === "paid");
  const cancelled = orders.filter((order) => order.status === "cancelled");
  const revenue = paid.reduce((sum, order) => sum + order.total, 0);
  const ticketTotal = orders
    .filter((order) => order.status !== "cancelled")
    .reduce((sum, order) => sum + order.total, 0);
  return {
    count: orders.length,
    paidCount: paid.length,
    cancelledCount: cancelled.length,
    revenue,
    ticketTotal,
  };
}

function guestName(sessions: DiningSession[], sessionId: string) {
  return sessions.find((session) => session.id === sessionId)?.guestName ?? "—";
}

export function buildOrdersReportHtml(input: {
  title: string;
  subtitle: string;
  orders: Order[];
  sessions: DiningSession[];
}) {
  const stats = summarizeOrders(input.orders);
  const rows = input.orders
    .map((order) => {
      const items = order.items
        .map((line) => `${line.quantity}× ${escapeHtml(line.name)}`)
        .join(", ");
      return `<tr>
        <td>${escapeHtml(formatDateTime(order.createdAt))}</td>
        <td>${escapeHtml(order.tableId)}</td>
        <td>${escapeHtml(guestName(input.sessions, order.sessionId))}</td>
        <td>#${order.sequence}</td>
        <td>${escapeHtml(order.status)}</td>
        <td>${items || "—"}</td>
        <td style="text-align:right">${escapeHtml(formatCurrency(order.total))}</td>
      </tr>`;
    })
    .join("");

  return wrapReportDocument({
    title: input.title,
    subtitle: input.subtitle,
    summary: `
      <div class="stats">
        <div><span>Tickets</span><strong>${stats.count}</strong></div>
        <div><span>Paid</span><strong>${stats.paidCount}</strong></div>
        <div><span>Cancelled</span><strong>${stats.cancelledCount}</strong></div>
        <div><span>Paid revenue</span><strong>${escapeHtml(formatCurrency(stats.revenue))}</strong></div>
        <div><span>All non-cancelled</span><strong>${escapeHtml(formatCurrency(stats.ticketTotal))}</strong></div>
      </div>
    `,
    table: `
      <table>
        <thead>
          <tr>
            <th>When</th><th>Table</th><th>Guest</th><th>#</th><th>Status</th><th>Items</th><th>Total</th>
          </tr>
        </thead>
        <tbody>${rows || `<tr><td colspan="7">No orders in this period.</td></tr>`}</tbody>
      </table>
    `,
  });
}

export function buildAuditReportHtml(input: {
  title: string;
  subtitle: string;
  events: AuditEvent[];
}) {
  const rows = input.events
    .map(
      (event) => `<tr>
        <td>${escapeHtml(formatDateTime(event.at))}</td>
        <td>${escapeHtml(auditActionLabel(event.action))}</td>
        <td>${escapeHtml(event.staffName)}</td>
        <td>${escapeHtml(event.tableId ?? "—")}</td>
        <td>${escapeHtml(
          `${event.guestName ? `${event.guestName}: ` : ""}${event.note}`,
        )}</td>
      </tr>`,
    )
    .join("");

  return wrapReportDocument({
    title: input.title,
    subtitle: input.subtitle,
    summary: `
      <div class="stats">
        <div><span>Events</span><strong>${input.events.length}</strong></div>
      </div>
    `,
    table: `
      <table>
        <thead>
          <tr>
            <th>When</th><th>Action</th><th>Staff</th><th>Table</th><th>Note</th>
          </tr>
        </thead>
        <tbody>${rows || `<tr><td colspan="5">No audit events in this period.</td></tr>`}</tbody>
      </table>
    `,
  });
}

function wrapReportDocument(input: {
  title: string;
  subtitle: string;
  summary: string;
  table: string;
}) {
  const generated = new Date().toLocaleString(appConfig.locale);
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(input.title)}</title>
  <style>
    :root { color-scheme: light; }
    body { font-family: "DM Sans", system-ui, sans-serif; color: #2c1810; margin: 24px; }
    h1 { font-family: Georgia, "Times New Roman", serif; font-style: italic; font-size: 28px; margin: 0 0 4px; }
    .meta { color: #6b5344; font-size: 13px; margin-bottom: 18px; }
    .stats { display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 18px; }
    .stats div { border: 1px solid #e8dccf; border-radius: 12px; padding: 10px 14px; min-width: 110px; }
    .stats span { display: block; font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: #8a7363; }
    .stats strong { font-size: 18px; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th, td { border-bottom: 1px solid #efe6dc; padding: 8px 6px; text-align: left; vertical-align: top; }
    th { font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; color: #8a7363; }
    @media print {
      body { margin: 12mm; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
  <p class="meta">${escapeHtml(appConfig.restaurantName)} · Generated ${escapeHtml(generated)}</p>
  <h1>${escapeHtml(input.title)}</h1>
  <p class="meta">${escapeHtml(input.subtitle)}</p>
  ${input.summary}
  ${input.table}
</body>
</html>`;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

/** Create a blob URL for iframe preview (avoids srcDoc / CSP issues). */
export function createReportBlobUrl(html: string) {
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  return URL.createObjectURL(blob);
}

/**
 * Print from an on-page iframe — no pop-up required.
 * In the print dialog choose “Save as PDF”.
 */
export function printReportFromIframe(iframe: HTMLIFrameElement | null) {
  const frameWindow = iframe?.contentWindow;
  if (!frameWindow) {
    throw new Error("Preview is not ready yet. Tap Preview first, then Print / PDF.");
  }
  frameWindow.focus();
  frameWindow.print();
}

export function downloadReportHtml(html: string, filename: string) {
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename.endsWith(".html") ? filename : `${filename}.html`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
