import { notFound, redirect } from "next/navigation";
import { TableEntryGuard } from "@/components/customer/table-entry-guard";
import { resolveFloorTableId } from "@/lib/tables";
import type { Metadata } from "next";

export const dynamicParams = true;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tableId: string }>;
}): Promise<Metadata> {
  const { tableId: raw } = await params;
  const tableId = resolveFloorTableId(raw) ?? raw;
  return {
    title: `Table ${tableId} menu`,
  };
}

export default async function TableMenuPage({
  params,
}: {
  params: Promise<{ tableId: string }>;
}) {
  const { tableId: raw } = await params;
  const tableId = resolveFloorTableId(raw);
  if (!tableId) notFound();
  if (tableId !== raw) redirect(`/table/${tableId}`);

  return <TableEntryGuard tableId={tableId} />;
}

export function generateStaticParams() {
  return [
    { tableId: "1" },
    { tableId: "2" },
    { tableId: "3" },
    { tableId: "4" },
    { tableId: "5" },
    { tableId: "6" },
    { tableId: "7" },
  ];
}
