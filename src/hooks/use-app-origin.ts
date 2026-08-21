"use client";

import { useEffect, useState } from "react";
import { appConfig } from "@/lib/config";

export function useAppOrigin() {
  const configured = appConfig.appUrl.trim().replace(/\/$/, "");
  const [origin, setOrigin] = useState(configured);

  useEffect(() => {
    if (configured) return;
    const frame = window.requestAnimationFrame(() => {
      setOrigin(window.location.origin);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [configured]);

  const isLocalhost = /localhost|127\.0\.0\.1/i.test(origin);

  return { origin, isLocalhost, ready: origin.length > 0 };
}
