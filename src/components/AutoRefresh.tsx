"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Refresca los datos del servidor cada cierto tiempo mientras la solicitud avanza. */
export function AutoRefresh({ everyMs = 4000 }: { everyMs?: number }) {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => router.refresh(), everyMs);
    return () => clearInterval(id);
  }, [router, everyMs]);
  return null;
}
