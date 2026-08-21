"use client";

import { FLOOR_TABLES } from "@/lib/floor";
import { TableQrCard } from "@/components/tables/table-qr-card";
import { useAppOrigin } from "@/hooks/use-app-origin";
import { Spinner } from "@/components/ui/spinner";

export function FloorQrGrid({ interactive = false }: { interactive?: boolean }) {
  const { origin, ready } = useAppOrigin();

  if (!ready) {
    return <Spinner label="Preparing table QR codes…" />;
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {FLOOR_TABLES.map((tableId) => (
        <TableQrCard
          key={tableId}
          tableId={tableId}
          origin={origin}
          interactive={interactive}
          size={interactive ? 148 : 168}
        />
      ))}
    </div>
  );
}
