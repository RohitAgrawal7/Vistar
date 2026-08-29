"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, Download, Eye, FileText, Printer } from "lucide-react";
import { orderService } from "@/lib/api";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { formatGuestPhone } from "@/lib/session";
import { cn } from "@/lib/cn";
import {
  REPORT_KIND_LABEL,
  type ReportKind,
  auditActionLabel,
  auditsForDay,
  auditsForMonth,
  buildAuditReportHtml,
  buildOrdersReportHtml,
  createReportBlobUrl,
  currentMonthKey,
  dayLabel,
  dayRangeIso,
  downloadReportHtml,
  monthLabel,
  monthRangeIso,
  ordersForDay,
  ordersForMonth,
  printReportFromIframe,
  summarizeOrders,
  todayKey,
} from "@/lib/reports";
import type { AuditEvent, DiningSession, Order } from "@/lib/types";

const KINDS: ReportKind[] = [
  "orders_day",
  "orders_month",
  "audit_day",
  "audit_month",
];

export function AdminReports({
  orders,
  sessions,
  auditLog,
}: {
  orders: Order[];
  sessions: DiningSession[];
  auditLog: AuditEvent[];
}) {
  const [kind, setKind] = useState<ReportKind>("orders_day");
  const [day, setDay] = useState(todayKey());
  const [month, setMonth] = useState(currentMonthKey());
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewReady, setPreviewReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [printWhenReady, setPrintWhenReady] = useState(false);
  const [remoteOrders, setRemoteOrders] = useState<Order[] | null>(null);
  const [remoteSessions, setRemoteSessions] = useState<DiningSession[] | null>(null);
  const [remoteAudits, setRemoteAudits] = useState<AuditEvent[] | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const previewUrlRef = useRef<string | null>(null);
  const previewOpenRef = useRef(false);

  const showDayPicker = kind === "orders_day" || kind === "audit_day";
  const showMonthPicker = kind === "orders_month" || kind === "audit_month";

  const range = useMemo(
    () => (showDayPicker ? dayRangeIso(day) : monthRangeIso(month)),
    [showDayPicker, day, month],
  );

  // Load DB rows for the selected calendar day/month (not just the live floor cache).
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    orderService
      .getReport(range.from, range.to)
      .then((slice) => {
        if (cancelled) return;
        setRemoteOrders(slice.orders);
        setRemoteSessions(slice.sessions);
        setRemoteAudits(slice.auditLog);
      })
      .catch((err) => {
        if (cancelled) return;
        setRemoteOrders(null);
        setRemoteSessions(null);
        setRemoteAudits(null);
        setError(err instanceof Error ? err.message : "Could not load report data");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [range.from, range.to]);

  const floorOrders = useMemo(() => {
    if (kind === "orders_day") return ordersForDay(orders, day);
    if (kind === "orders_month") return ordersForMonth(orders, month);
    return [];
  }, [kind, orders, day, month]);

  const floorAudits = useMemo(() => {
    if (kind === "audit_day") return auditsForDay(auditLog, day);
    if (kind === "audit_month") return auditsForMonth(auditLog, month);
    return [];
  }, [kind, auditLog, day, month]);

  const scopedOrders = remoteOrders ?? floorOrders;
  const scopedAudits = remoteAudits ?? floorAudits;
  const scopedSessions = remoteSessions ?? sessions;

  const orderStats = useMemo(() => summarizeOrders(scopedOrders), [scopedOrders]);

  const title = REPORT_KIND_LABEL[kind];
  const subtitle =
    kind === "orders_day" || kind === "audit_day" ? dayLabel(day) : monthLabel(month);

  function buildHtml() {
    if (kind === "orders_day" || kind === "orders_month") {
      return buildOrdersReportHtml({
        title,
        subtitle,
        orders: scopedOrders,
        sessions: scopedSessions,
      });
    }
    return buildAuditReportHtml({
      title,
      subtitle,
      events: scopedAudits,
    });
  }

  function setPreviewFromHtml(html: string) {
    previewOpenRef.current = true;
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    const url = createReportBlobUrl(html);
    previewUrlRef.current = url;
    setPreviewReady(false);
    setPreviewUrl(url);
  }

  function onPreview() {
    setError(null);
    setPrintWhenReady(false);
    setPreviewFromHtml(buildHtml());
  }

  function onPrintPdf() {
    setError(null);
    setPreviewFromHtml(buildHtml());
    setPrintWhenReady(true);
  }

  function onDownload() {
    setError(null);
    const html = buildHtml();
    setPreviewFromHtml(html);
    const stamp = showMonthPicker ? month : day;
    downloadReportHtml(html, `vistar-${kind}-${stamp}`);
  }

  // Refresh open preview when calendar / data changes (no pop-up).
  useEffect(() => {
    if (!previewOpenRef.current) return;
    const html =
      kind === "orders_day" || kind === "orders_month"
        ? buildOrdersReportHtml({
            title: REPORT_KIND_LABEL[kind],
            subtitle:
              kind === "orders_day" ? dayLabel(day) : monthLabel(month),
            orders: scopedOrders,
            sessions: scopedSessions,
          })
        : buildAuditReportHtml({
            title: REPORT_KIND_LABEL[kind],
            subtitle:
              kind === "audit_day" ? dayLabel(day) : monthLabel(month),
            events: scopedAudits,
          });
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    const url = createReportBlobUrl(html);
    previewUrlRef.current = url;
    setPreviewReady(false);
    setPreviewUrl(url);
  }, [kind, day, month, scopedOrders, scopedAudits, scopedSessions]);

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    };
  }, []);

  useEffect(() => {
    if (!printWhenReady || !previewReady) return;
    try {
      printReportFromIframe(iframeRef.current);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not print");
    } finally {
      setPrintWhenReady(false);
    }
  }, [printWhenReady, previewReady]);

  return (
    <section aria-labelledby="reports-heading" className="space-y-4">
      <div>
        <h2 id="reports-heading" className="font-display text-3xl italic text-espresso">
          Reports
        </h2>
        <p className="mt-1 max-w-2xl text-sm text-espresso/70">
          Pick a calendar day or month to load that period&apos;s orders or audit log from the
          café database. Preview on this page, then Print / PDF (no pop-up) — choose Save as PDF
          in the dialog.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {KINDS.map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => {
              setKind(id);
              setError(null);
              if (id === "orders_day" || id === "audit_day") setDay(todayKey());
            }}
            className={cn(
              "inline-flex min-h-11 items-center rounded-full px-4 text-xs font-semibold uppercase tracking-wider",
              kind === id
                ? "bg-espresso text-cream"
                : "border border-espresso/12 bg-white text-espresso/70",
            )}
          >
            {REPORT_KIND_LABEL[id]}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-[24px] border border-espresso/10 bg-white p-4">
        {showDayPicker ? (
          <div className="flex flex-wrap items-end gap-2">
            <label className="block text-sm">
              <span className="mb-1 flex items-center gap-1.5 text-xs font-medium text-espresso/60">
                <CalendarDays className="size-3.5" aria-hidden />
                Calendar date
              </span>
              <input
                type="date"
                value={day}
                max={todayKey()}
                onChange={(event) => setDay(event.target.value || todayKey())}
                className="h-11 rounded-xl border border-espresso/15 bg-paper px-3 outline-none focus:border-terracotta"
              />
            </label>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => setDay(todayKey())}
            >
              Today
            </Button>
            <p className="pb-2 text-sm text-espresso/65">{dayLabel(day)}</p>
          </div>
        ) : null}

        {showMonthPicker ? (
          <label className="block text-sm">
            <span className="mb-1 flex items-center gap-1.5 text-xs font-medium text-espresso/60">
              <CalendarDays className="size-3.5" aria-hidden />
              Month
            </span>
            <input
              type="month"
              value={month}
              max={currentMonthKey()}
              onChange={(event) => setMonth(event.target.value || currentMonthKey())}
              className="h-11 rounded-xl border border-espresso/15 bg-paper px-3 outline-none focus:border-terracotta"
            />
          </label>
        ) : null}

        <div className="ml-auto flex flex-wrap items-center gap-2">
          {loading ? (
            <span className="text-xs text-espresso/50">Loading date…</span>
          ) : null}
          <Button
            type="button"
            size="sm"
            variant="secondary"
            icon={<Eye className="size-3.5" aria-hidden />}
            onClick={onPreview}
            disabled={loading}
          >
            Preview
          </Button>
          <Button
            type="button"
            size="sm"
            icon={<Printer className="size-3.5" aria-hidden />}
            onClick={onPrintPdf}
            disabled={loading}
          >
            Print / PDF
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            icon={<Download className="size-3.5" aria-hidden />}
            onClick={onDownload}
            disabled={loading}
          >
            Download
          </Button>
        </div>
      </div>

      {error ? <Alert message={error} /> : null}

      {(kind === "orders_day" || kind === "orders_month") && (
        <div className="grid gap-3 sm:grid-cols-4">
          <Stat label="Tickets" value={String(orderStats.count)} />
          <Stat label="Paid" value={String(orderStats.paidCount)} />
          <Stat label="Cancelled" value={String(orderStats.cancelledCount)} />
          <Stat label="Paid revenue" value={formatCurrency(orderStats.revenue)} />
        </div>
      )}

      {(kind === "orders_day" || kind === "orders_month") && (
        <OrdersTable orders={scopedOrders} sessions={scopedSessions} emptyLabel={subtitle} />
      )}

      {(kind === "audit_day" || kind === "audit_month") && (
        <AuditTable events={scopedAudits} emptyLabel={subtitle} />
      )}

      {previewUrl ? (
        <div className="overflow-hidden rounded-[24px] border border-espresso/10 bg-white">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-espresso/8 px-4 py-3 text-sm font-medium text-espresso">
            <span className="inline-flex items-center gap-2">
              <FileText className="size-4 text-terracotta" aria-hidden />
              Report preview · {subtitle}
            </span>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              icon={<Printer className="size-3.5" aria-hidden />}
              onClick={() => {
                try {
                  printReportFromIframe(iframeRef.current);
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Could not print");
                }
              }}
            >
              Print this preview
            </Button>
          </div>
          <iframe
            ref={iframeRef}
            title="Report preview"
            src={previewUrl}
            className="h-[min(70vh,720px)] w-full bg-white"
            onLoad={() => setPreviewReady(true)}
          />
        </div>
      ) : (
        <p className="text-sm text-espresso/55">
          Tap <span className="font-medium text-espresso/80">Preview</span> to see the full report
          here, or <span className="font-medium text-espresso/80">Print / PDF</span> to save it.
        </p>
      )}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-espresso/10 bg-white px-4 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-espresso/45">
        {label}
      </p>
      <p className="mt-1 font-display text-2xl italic text-espresso">{value}</p>
    </div>
  );
}

function OrdersTable({
  orders,
  sessions,
  emptyLabel,
}: {
  orders: Order[];
  sessions: DiningSession[];
  emptyLabel: string;
}) {
  if (orders.length === 0) {
    return (
      <EmptyState
        title="No orders on this date"
        body={`Nothing matched ${emptyLabel}. Pick another day on the calendar.`}
      />
    );
  }

  return (
    <div className="overflow-x-auto rounded-[28px] border border-espresso/8 bg-white">
      <table className="min-w-full text-left text-sm">
        <thead className="border-b border-espresso/8 text-xs uppercase tracking-wider text-espresso/50">
          <tr>
            <th className="px-4 py-3 font-medium">When</th>
            <th className="px-4 py-3 font-medium">Table</th>
            <th className="px-4 py-3 font-medium">Guest</th>
            <th className="px-4 py-3 font-medium">Mobile</th>
            <th className="px-4 py-3 font-medium">#</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium">Items</th>
            <th className="px-4 py-3 font-medium text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => {
            const session = sessions.find((item) => item.id === order.sessionId);
            const guest = session?.guestName ?? "—";
            const phone = session?.guestPhone ? formatGuestPhone(session.guestPhone) : "—";
            return (
              <tr key={order.id} className="border-b border-espresso/5 last:border-0 align-top">
                <td className="whitespace-nowrap px-4 py-3 text-espresso/70">
                  {formatDateTime(order.createdAt)}
                </td>
                <td className="px-4 py-3 font-medium">{order.tableId}</td>
                <td className="px-4 py-3">{guest}</td>
                <td className="whitespace-nowrap px-4 py-3 tabular-nums text-espresso/80">{phone}</td>
                <td className="px-4 py-3">#{order.sequence}</td>
                <td className="px-4 py-3 capitalize">{order.status.replaceAll("_", " ")}</td>
                <td className="px-4 py-3 text-espresso/80">
                  {order.items.map((line) => `${line.quantity}× ${line.name}`).join(", ")}
                </td>
                <td className="px-4 py-3 text-right tabular-nums font-medium">
                  {formatCurrency(order.total)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function AuditTable({ events, emptyLabel }: { events: AuditEvent[]; emptyLabel: string }) {
  if (events.length === 0) {
    return (
      <EmptyState
        title="No audit events"
        body={`Nothing matched ${emptyLabel}. Pick another day on the calendar.`}
      />
    );
  }

  return (
    <div className="overflow-x-auto rounded-[28px] border border-espresso/8 bg-white">
      <table className="min-w-full text-left text-sm">
        <thead className="border-b border-espresso/8 text-xs uppercase tracking-wider text-espresso/50">
          <tr>
            <th className="px-4 py-3 font-medium">When</th>
            <th className="px-4 py-3 font-medium">Action</th>
            <th className="px-4 py-3 font-medium">Staff</th>
            <th className="px-4 py-3 font-medium">Table</th>
            <th className="px-4 py-3 font-medium">Note</th>
          </tr>
        </thead>
        <tbody>
          {events.map((event) => (
            <tr key={event.id} className="border-b border-espresso/5 last:border-0 align-top">
              <td className="whitespace-nowrap px-4 py-3 text-espresso/70">
                {formatDateTime(event.at)}
              </td>
              <td className="px-4 py-3 font-medium">{auditActionLabel(event.action)}</td>
              <td className="px-4 py-3">{event.staffName}</td>
              <td className="px-4 py-3">{event.tableId ?? "—"}</td>
              <td className="px-4 py-3 text-espresso/80">
                {event.guestName ? `${event.guestName}: ` : ""}
                {event.note}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
