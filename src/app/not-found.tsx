import Link from "next/link";
import { BrandLogo } from "@/components/brand/brand-logo";
import { RestaurantBackdrop } from "@/components/brand/restaurant-backdrop";
import { appConfig } from "@/lib/config";
import { FLOOR_META, FLOOR_TABLES } from "@/lib/floor";

export default function NotFound() {
  return (
    <div className="relative min-h-dvh overflow-hidden text-cream">
      <RestaurantBackdrop />
      <main
        id="main"
        className="relative z-10 mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-4 py-12"
      >
        <div className="mb-6 flex justify-center">
          <BrandLogo variant="dark" size={140} className="drop-shadow-[0_12px_28px_rgba(0,0,0,0.5)]" />
        </div>
        <p className="text-center text-xs uppercase tracking-[0.28em] text-gold-light/85">404</p>
        <h1 className="mt-2 text-balance text-center font-display text-3xl italic text-cream sm:text-4xl">Table not found</h1>
        <p className="mx-auto mt-3 max-w-sm text-center text-sm leading-6 text-cream/75">
          That table is not on this floor. {appConfig.restaurantName} has five tables — pick Table 1,
          2, 3, 4, or 5.
        </p>

        <div className="mt-6 rounded-[28px] border border-white/15 bg-cream/95 p-5 text-espresso shadow-[0_24px_60px_-28px_rgba(0,0,0,0.65)]">
          <p className="text-xs uppercase tracking-[0.22em] text-espresso/50">Open a table</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {FLOOR_TABLES.map((tableId) => (
              <Link
                key={tableId}
                href={`/table/${tableId}`}
                className="inline-flex min-h-11 items-center rounded-full border border-espresso/12 bg-white px-4 text-sm font-medium text-espresso hover:border-terracotta/40"
              >
                {FLOOR_META[tableId].label}
              </Link>
            ))}
          </div>
          <div className="mt-5 flex flex-wrap gap-4 text-sm font-medium">
            <Link href="/" className="text-terracotta underline-offset-4 hover:underline">
              Guest entry
            </Link>
            <Link href="/admin" className="text-espresso/70 underline-offset-4 hover:underline">
              Admin
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
