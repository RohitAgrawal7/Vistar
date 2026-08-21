import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { PaymentExperience } from "@/components/customer/payment-experience";
import { Spinner } from "@/components/ui/spinner";
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
    title: `Table ${tableId} payment`,
  };
}

export default async function TablePayPage({
  params,
}: {
  params: Promise<{ tableId: string }>;
}) {
  const { tableId: raw } = await params;
  const tableId = resolveFloorTableId(raw);
  if (!tableId) notFound();
  if (tableId !== raw) redirect(`/table/${tableId}/pay`);

  return (
    <Suspense
      fallback={
        <div className="grid min-h-dvh place-items-center bg-cream">
          <Spinner label="Opening your bill…" />
        </div>
      }
    >
      <PaymentExperience tableId={tableId} />
    </Suspense>
  );
}
