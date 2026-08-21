"use client";

import Image from "next/image";
import { appConfig } from "@/lib/config";
import { cn } from "@/lib/cn";

export function BrandLogo({
  variant = "dark",
  size = 180,
  priority = false,
  className,
}: {
  variant?: "dark" | "light";
  size?: number;
  priority?: boolean;
  className?: string;
}) {
  const src = variant === "light" ? appConfig.logoLightSrc : appConfig.logoSrc;

  return (
    <Image
      src={src}
      alt={appConfig.restaurantName}
      width={size}
      height={size}
      sizes={`${size}px`}
      priority={priority}
      unoptimized
      className={cn("rounded-full object-cover", className)}
    />
  );
}
