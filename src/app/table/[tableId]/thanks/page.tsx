import { notFound, redirect } from "next/navigation";
import { ThanksExperience } from "@/components/customer/thanks-experience";
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
    title: `Table ${tableId} thank you`,
  };
}

export default async function TableThanksPage({
  params,
}: {
  params: Promise<{ tableId: string }>;
}) {
  const { tableId: raw } = await params;
  const tableId = resolveFloorTableId(raw);
  if (!tableId) notFound();
  if (tableId !== raw) redirect(`/table/${tableId}/thanks`);

  return <ThanksExperience tableId={tableId} />;
}
