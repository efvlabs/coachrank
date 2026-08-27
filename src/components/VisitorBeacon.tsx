"use client";

import { useEffect } from "react";

import { PRESENCE_ENABLED, PRESENCE_HEARTBEAT_MS } from "@/lib/config";

/**
 * Two real signals, both server-counted:
 *   • /api/visit increments the visitor counter once per browser (cookie-gated).
 *   • /api/presence heartbeats keep the "online now" number honest.
 * Nothing here is ever estimated or inflated on the client.
 */
export function VisitorBeacon() {
  useEffect(() => {
    const controller = new AbortController();

    fetch("/api/visit", { method: "POST", signal: controller.signal, keepalive: true }).catch(
      () => {},
    );

    if (!PRESENCE_ENABLED) return () => controller.abort();

    let timer: ReturnType<typeof setInterval> | null = null;

    const beat = () => {
      if (document.visibilityState !== "visible") return;
      fetch("/api/presence", { method: "POST", signal: controller.signal }).catch(() => {});
    };

    beat();
    timer = setInterval(beat, PRESENCE_HEARTBEAT_MS);
    document.addEventListener("visibilitychange", beat);

    return () => {
      controller.abort();
      if (timer) clearInterval(timer);
      document.removeEventListener("visibilitychange", beat);
    };
  }, []);

  return null;
}
