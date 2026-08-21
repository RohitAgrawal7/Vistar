import Image from "next/image";
import { appConfig } from "@/lib/config";
import { cn } from "@/lib/cn";

export function RestaurantBackdrop({
  className,
  overlay = "dark",
}: {
  className?: string;
  overlay?: "dark" | "soft";
}) {
  const photo = appConfig.heroSrc.trim();

  return (
    <div className={cn("absolute inset-0 overflow-hidden bg-[#120b08]", className)} aria-hidden>
      {photo ? (
        <Image src={photo} alt="" fill priority sizes="100vw" className="object-cover" />
      ) : (
        <IllustratedTable />
      )}
      {overlay === "soft" ? (
        <div className="absolute inset-0 bg-gradient-to-b from-cream/55 via-cream/88 to-cream" />
      ) : (
        <>
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/55 to-black/25" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(18,11,8,0.45)_70%)]" />
        </>
      )}
    </div>
  );
}

function IllustratedTable() {
  return (
    <svg viewBox="0 0 390 844" className="absolute inset-0 size-full object-cover" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id="wood" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4a2a14" />
          <stop offset="40%" stopColor="#2c1810" />
          <stop offset="100%" stopColor="#1a0e08" />
        </linearGradient>
        <radialGradient id="lamp" cx="50%" cy="18%" r="55%">
          <stop offset="0%" stopColor="#e8b923" stopOpacity="0.42" />
          <stop offset="55%" stopColor="#c2410c" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#1a0e08" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="390" height="844" fill="url(#wood)" />
      <rect width="390" height="844" fill="url(#lamp)" />
      <ellipse cx="70" cy="160" rx="90" ry="40" fill="#1c120c" opacity="0.5" />
      <g transform="translate(28, 92) scale(1.05)">
        <CoffeeCup />
      </g>
      <g transform="translate(232, 128) scale(0.92)">
        <CoffeeCup />
      </g>
      <g transform="translate(36, 520) scale(1.15)">
        <ClubSandwich />
      </g>
      <g transform="translate(214, 548) scale(1.1)">
        <FriesCone />
      </g>
      <ellipse cx="195" cy="780" rx="160" ry="28" fill="#000" opacity="0.35" />
    </svg>
  );
}

function CoffeeCup() {
  return (
    <g>
      <ellipse cx="64" cy="118" rx="48" ry="10" fill="#000" opacity="0.28" />
      <path d="M28 58h72c2 28-8 52-36 52S26 86 28 58Z" fill="#f4eee4" />
      <path d="M34 64h60c1 22-6 40-30 40S33 86 34 64Z" fill="#6b3a1d" />
      <ellipse cx="64" cy="64" rx="30" ry="8" fill="#3d2314" />
      <ellipse cx="58" cy="62" rx="10" ry="3" fill="#ead9b8" opacity="0.5" />
      <path d="M100 70c18 2 22 22 8 32" fill="none" stroke="#f4eee4" strokeWidth="7" strokeLinecap="round" />
      <path d="M48 28c0 14 8 18 8 28" fill="none" stroke="#ead9b8" strokeWidth="3" strokeLinecap="round" opacity="0.7">
        <animate attributeName="opacity" values="0.3;0.8;0.3" dur="3s" repeatCount="indefinite" />
      </path>
      <path d="M64 22c0 16 8 20 8 32" fill="none" stroke="#ead9b8" strokeWidth="3" strokeLinecap="round" opacity="0.55">
        <animate attributeName="opacity" values="0.2;0.7;0.2" dur="2.6s" begin="0.4s" repeatCount="indefinite" />
      </path>
      <path d="M78 30c0 12 6 16 6 26" fill="none" stroke="#ead9b8" strokeWidth="2.5" strokeLinecap="round" opacity="0.45" />
      <circle cx="22" cy="108" r="6" fill="#5c3a22" />
      <circle cx="34" cy="114" r="5" fill="#4a2e1b" />
    </g>
  );
}

function ClubSandwich() {
  return (
    <g>
      <ellipse cx="86" cy="118" rx="78" ry="14" fill="#000" opacity="0.28" />
      <path d="M18 86c20-18 118-18 138 0l-8 10c-18-12-104-12-122 0Z" fill="#e2c08a" />
      <path d="M22 78h126c4 8-6 16-63 16S18 86 22 78Z" fill="#3f6b4a" />
      <path d="M24 68h122c3 7-8 14-61 14S21 75 24 68Z" fill="#c24e1d" />
      <path d="M26 58h118c3 6-8 12-59 12S23 64 26 58Z" fill="#ead9b8" />
      <path d="M28 46c18-16 102-16 120 0l-6 12c-16-10-92-10-108 0Z" fill="#d4a574" />
      <path d="M40 42h8v8h-8Z" fill="#f4eee4" opacity="0.7" />
      <path d="M118 44h7v7h-7Z" fill="#f4eee4" opacity="0.7" />
    </g>
  );
}

function FriesCone() {
  return (
    <g>
      <ellipse cx="62" cy="132" rx="50" ry="12" fill="#000" opacity="0.28" />
      <path d="M22 70h80L84 132H40Z" fill="#f4eee4" />
      <path d="M28 78h68L80 124H44Z" fill="#fbf7f0" />
      <rect x="34" y="28" width="10" height="52" rx="4" fill="#c4a574" transform="rotate(-8 39 54)" />
      <rect x="48" y="18" width="11" height="58" rx="4" fill="#e2c08a" />
      <rect x="62" y="22" width="10" height="56" rx="4" fill="#c4a574" transform="rotate(6 67 50)" />
      <rect x="74" y="26" width="10" height="52" rx="4" fill="#ead9b8" transform="rotate(12 79 52)" />
      <rect x="40" y="24" width="9" height="50" rx="4" fill="#d4a574" transform="rotate(-14 44 49)" />
      <path d="M22 70h80" stroke="#c24e1d" strokeWidth="3" />
    </g>
  );
}
