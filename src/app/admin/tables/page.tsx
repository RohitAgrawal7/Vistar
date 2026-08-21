import { SiteHeader } from "@/components/layout/site-header";
import { QrPrintStudio } from "@/components/tables/qr-print-studio";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Table QR codes",
};

export default function AdminTablesPage() {
  return (
    <div className="min-h-dvh bg-cream">
      <SiteHeader />
      <main id="main" className="mx-auto w-full max-w-7xl px-4 py-5 pb-safe sm:px-6 sm:py-8">
        <QrPrintStudio />
      </main>
    </div>
  );
}
