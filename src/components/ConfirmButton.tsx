"use client";

import { useEffect, useState } from "react";
import { useFormStatus } from "react-dom";

/**
 * Two-step submit button for destructive form actions. The first click only asks; the action
 * runs when the user then clicks the confirm button. Must be rendered inside the <form>.
 */
export default function ConfirmButton({
  children,
  question,
  confirmLabel = "Yes",
  className = "btn btn-danger",
  align = "start",
  title,
  floating = false,
}: {
  children: React.ReactNode;
  /** Shown after the first click, e.g. "Delete this workshop and all student progress?" */
  question: string;
  confirmLabel?: string;
  /** Classes for the initial button. */
  className?: string;
  align?: "start" | "end";
  /** Tooltip and accessible name for the initial button, for icon-only buttons. */
  title?: string;
  /** Show the question as a bar filling the nearest positioned ancestor (e.g. a card row). */
  floating?: boolean;
}) {
  const [asking, setAsking] = useState(false);
  const { pending } = useFormStatus();

  // Stepping away cancels the question, so a stray later click can't confirm it.
  useEffect(() => {
    if (!asking || pending) return;
    const t = setTimeout(() => setAsking(false), 8000);
    return () => clearTimeout(t);
  }, [asking, pending]);

  if (!asking) {
    return (
      <button type="button" className={className} title={title} aria-label={title} onClick={() => setAsking(true)}>
        {children}
      </button>
    );
  }
  return (
    <span role="alertdialog" aria-label={question} className={`inline-flex items-center gap-2 ${align === "end" ? "justify-end" : ""} ${floating ? "absolute inset-0 z-20 justify-between whitespace-nowrap bg-sun px-4" : "flex-wrap"}`}>
      <span className="text-sm font-semibold">{question}</span>
      <span className="inline-flex items-center gap-2">
        <button type="submit" disabled={pending} className="btn btn-danger btn-sm">
          {pending ? "Working…" : confirmLabel}
        </button>
        <button type="button" disabled={pending} autoFocus className="btn btn-sm" onClick={() => setAsking(false)}>
          Cancel
        </button>
      </span>
    </span>
  );
}
