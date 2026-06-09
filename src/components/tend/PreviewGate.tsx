/* ============================================================================
   TEND — preview-access gate.   // REMOVE AT PUBLIC LAUNCH
   The /tend member intake is a PUBLIC route (no login). During the pre-launch
   TESTING phase — before the consent / BAA / legal groundwork exists — we do NOT
   want a stranger wandering in and submitting real health information. This is a
   lightweight, CLIENT-SIDE "soft" gate (NOT a security/PHI boundary): it shows the
   intake only when the correct preview key is present (`/tend?key=<token>`), and
   otherwise shows a neutral "preview access required" screen. A valid key is
   remembered for the browser session so client-side navigation inside /tend keeps
   working without re-passing the param.

   AT PUBLIC LAUNCH: delete this file and restore the bare route in App.tsx
   (search "REMOVE AT PUBLIC LAUNCH") to:  <LazyPage><TendIntakePage /></LazyPage>
   ============================================================================ */
import React from "react";

// REMOVE AT PUBLIC LAUNCH — preview access token (testing phase only).
const TEND_PREVIEW_KEY = "tend-preview-9f4ac1e8";
const STORE_KEY = "tend_preview_access";

function hasPreviewAccess(): boolean {
  try {
    const k = new URLSearchParams(window.location.search).get("key");
    if (k && k === TEND_PREVIEW_KEY) {
      sessionStorage.setItem(STORE_KEY, "1"); // remember for this browser session
      return true;
    }
    return sessionStorage.getItem(STORE_KEY) === "1";
  } catch {
    return false;
  }
}

export default function TendPreviewGate({ children }: { children: React.ReactNode }) {
  if (hasPreviewAccess()) return <>{children}</>;
  // Neutral, unbranded screen — reveals nothing about the product or that it's a health intake.
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#0f1411",
        color: "#c9d4ce",
        fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
        padding: 24,
      }}
    >
      <div style={{ maxWidth: 420, textAlign: "center" }}>
        <div style={{ fontSize: 17, fontWeight: 600, marginBottom: 10, color: "#e6efe9" }}>
          Preview access required
        </div>
        <div style={{ fontSize: 14, lineHeight: 1.6, color: "#9fb0a8" }}>
          This page is part of a private preview and isn’t open yet. If you should have
          access, please use the link you were given.
        </div>
      </div>
    </div>
  );
}
