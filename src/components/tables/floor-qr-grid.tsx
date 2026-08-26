"use client";

import { useEffect, useState } from "react";
import { TableQrCard } from "@/components/tables/table-qr-card";
import { useAppOrigin } from "@/hooks/use-app-origin";
import { Spinner } from "@/components/ui/spinner";
import { orderService } from "@/lib/api";
import { DEFAULT_FLOOR_TABLES } from "@/lib/floor";
import type { FloorTable } from "@/lib/types";

export function FloorQrGrid({
  interactive = false,
  tables: tablesProp,
}: {
  interactive?: boolean;
  tables?: FloorTable[];
}) {
  const { origin, ready } = useAppOrigin();
  const [tables, setTables] = useState<FloorTable[]>(tablesProp ?? DEFAULT_FLOOR_TABLES);

  useEffect(() => {
    if (tablesProp) {
      setTables(tablesProp);
      return;
    }
    let cancelled = false;
    orderService
      .listTables()
      .then((next) => {
        if (!cancelled && next.length) setTables(next);
      })
      .catch(() => {
        /* keep defaults */
      });
    return () => {
      cancelled = true;
    };
  }, [tablesProp]);

  if (!ready) {
    return <Spinner label="Preparing table QR codes…" />;
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {tables.map((table) => (
        <TableQrCard
          key={table.id}
          tableId={table.id}
          table={table}
          origin={origin}
          interactive={interactive}
          size={interactive ? 148 : 168}
        />
      ))}
    </div>
  );
}
