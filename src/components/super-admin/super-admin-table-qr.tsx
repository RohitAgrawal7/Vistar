"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Printer, QrCode, Trash2 } from "lucide-react";
import { FloorQrGrid } from "@/components/tables/floor-qr-grid";
import { TableQrCard } from "@/components/tables/table-qr-card";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useAppOrigin } from "@/hooks/use-app-origin";
import { ApiError, orderService } from "@/lib/api";
import { buildTableScanUrl, normalizeTableId, TABLE_ID_MAX, TABLE_ID_MIN } from "@/lib/floor";
import type { FloorTable } from "@/lib/types";

export function SuperAdminTableQr({ canManage = true }: { canManage?: boolean }) {
  const { origin, isLocalhost, ready } = useAppOrigin();
  const [tables, setTables] = useState<FloorTable[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [tableNumber, setTableNumber] = useState("");
  const [zone, setZone] = useState("Floor");
  const [previewId, setPreviewId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const next = canManage
        ? await orderService.listAdminTables()
        : await orderService.listTables();
      setTables(next);
      setPreviewId((current) => current ?? next[0]?.id ?? null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load tables");
    } finally {
      setLoading(false);
    }
  }, [canManage]);

  useEffect(() => {
    void load();
  }, [load]);

  const previewTable = useMemo(
    () => tables.find((table) => table.id === previewId) ?? tables[0] ?? null,
    [tables, previewId],
  );

  async function onAddTable() {
    if (busy || !canManage) return;
    const id = normalizeTableId(tableNumber);
    if (!id) {
      setError(`Enter a table number from ${TABLE_ID_MIN} to ${TABLE_ID_MAX}`);
      return;
    }
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const created = await orderService.addTable({
        id,
        label: `Table ${id}`,
        zone: zone.trim() || "Floor",
      });
      setTableNumber("");
      setMessage(`Table ${created.id} added. Print or download its QR below.`);
      setPreviewId(created.id);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not add table");
    } finally {
      setBusy(false);
    }
  }

  async function onRemove(id: string) {
    if (busy || !canManage) return;
    if (!window.confirm(`Remove Table ${id} and its QR from the floor list?`)) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await orderService.removeTable(id);
      setMessage(`Table ${id} removed`);
      if (previewId === id) setPreviewId(null);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not remove table");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-6" aria-labelledby="table-qr-heading">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between print:hidden">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-espresso/50">Floor QR</p>
          <h2 id="table-qr-heading" className="mt-1 font-display text-3xl italic text-espresso">
            Table QR codes
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-espresso/70">
            {canManage
              ? "Add a table number, generate its QR, then print tent cards. Guests scan to open only that table’s menu."
              : "Print tent cards for each floor table. Super admin can add new table numbers."}
          </p>
        </div>
        <Button
          type="button"
          variant="dark"
          className="w-full sm:w-auto"
          onClick={() => window.print()}
          icon={<Printer className="size-4" aria-hidden />}
        >
          Print QR cards
        </Button>
      </div>

      {error ? <Alert message={error} /> : null}
      {message ? <Alert tone="info" message={message} /> : null}

      {canManage ? (
        <div className="rounded-[24px] border border-espresso/10 bg-white p-4 print:hidden">
          <h3 className="font-display text-xl italic text-espresso">Add table + generate QR</h3>
          <p className="mt-1 text-sm text-espresso/65">
            Enter any free number from {TABLE_ID_MIN}–{TABLE_ID_MAX}. The QR links to{" "}
            <code className="text-xs">/table/&lt;number&gt;</code>.
          </p>
          <div className="mt-4 flex flex-wrap items-end gap-3">
            <label className="block text-sm">
              <span className="mb-1 block text-xs font-medium text-espresso/60">Table number</span>
              <input
                type="number"
                min={TABLE_ID_MIN}
                max={TABLE_ID_MAX}
                value={tableNumber}
                onChange={(event) => setTableNumber(event.target.value)}
                placeholder="e.g. 6"
                className="h-11 w-28 rounded-xl border border-espresso/15 bg-paper px-3 outline-none focus:border-terracotta"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-xs font-medium text-espresso/60">Zone (optional)</span>
              <input
                value={zone}
                onChange={(event) => setZone(event.target.value)}
                placeholder="Indoor"
                className="h-11 w-40 rounded-xl border border-espresso/15 bg-paper px-3 outline-none focus:border-terracotta"
              />
            </label>
            <Button
              type="button"
              icon={<Plus className="size-4" aria-hidden />}
              loading={busy}
              disabled={busy || !tableNumber.trim()}
              onClick={() => void onAddTable()}
            >
              Add &amp; generate QR
            </Button>
          </div>
        </div>
      ) : null}

      {ready && isLocalhost ? (
        <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-950 print:hidden">
          Phone cameras cannot reach <span className="font-medium">localhost</span>. Open this page
          on your LAN IP or set <span className="font-medium">NEXT_PUBLIC_APP_URL</span>, then print.
        </p>
      ) : null}

      {loading ? (
        <Spinner label="Loading tables…" />
      ) : (
        <>
          {previewTable && ready ? (
            <div className="grid gap-4 print:hidden lg:grid-cols-[minmax(0,280px)_1fr]">
              <TableQrCard
                tableId={previewTable.id}
                table={previewTable}
                origin={origin}
                size={180}
              />
              <div className="rounded-[24px] border border-espresso/10 bg-white p-4">
                <p className="inline-flex items-center gap-2 text-sm font-medium text-espresso">
                  <QrCode className="size-4 text-terracotta" aria-hidden />
                  Selected · {previewTable.label}
                </p>
                <p className="mt-2 break-all text-xs text-espresso/60">
                  {buildTableScanUrl(previewTable.id, origin)}
                </p>
                <ul className="mt-4 max-h-64 space-y-2 overflow-y-auto">
                  {tables.map((table) => (
                    <li
                      key={table.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-paper px-3 py-2"
                    >
                      <button
                        type="button"
                        onClick={() => setPreviewId(table.id)}
                        className="text-left text-sm font-medium text-espresso hover:text-terracotta"
                      >
                        {table.label}
                        <span className="ml-2 text-xs font-normal text-espresso/50">
                          {table.zone}
                          {!table.active ? " · hidden" : ""}
                        </span>
                      </button>
                      {canManage ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          icon={<Trash2 className="size-3.5" aria-hidden />}
                          disabled={busy}
                          onClick={() => void onRemove(table.id)}
                        >
                          Remove
                        </Button>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : null}

          <FloorQrGrid tables={tables.filter((table) => table.active)} />
        </>
      )}
    </section>
  );
}
