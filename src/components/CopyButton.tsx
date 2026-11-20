"use client";

import { useEffect, useState } from "react";

/** Copies `text` to the clipboard and briefly confirms it. */
export default function CopyButton({ text, label = `Copy ${text}` }: { text: string; label?: string }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");

  useEffect(() => {
    if (state === "idle") return;
    const t = setTimeout(() => setState("idle"), 1800);
    return () => clearTimeout(t);
  }, [state]);

  async function copy() {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        // Plain-http fallback (e.g. opening the app by LAN IP), where the clipboard API is unavailable.
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        const ok = document.execCommand("copy");
        ta.remove();
        if (!ok) throw new Error("copy rejected");
      }
      setState("copied");
    } catch {
      setState("failed");
    }
  }

  const status = state === "copied" ? "Copied" : state === "failed" ? "Copy failed" : "";

  return (
    <button
      type="button"
      onClick={copy}
      className={`btn btn-sm px-2! ${state === "copied" ? "bg-leaf" : state === "failed" ? "btn-danger text-white" : ""}`}
      aria-label={label}
      title={status || label}
    >
      {/* Square-cornered strokes to sit with the pixel font. */}
      <svg viewBox="0 0 16 16" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square" aria-hidden>
        {state === "copied" ? (
          <path d="M3 8.5l3.5 3.5L13 4.5" />
        ) : state === "failed" ? (
          <path d="M4 4l8 8M12 4l-8 8" />
        ) : (
          <>
            <rect x="6" y="6" width="8" height="8" />
            <path d="M10 3H2v8" />
          </>
        )}
      </svg>
      <span className="sr-only" aria-live="polite">{status}</span>
    </button>
  );
}
