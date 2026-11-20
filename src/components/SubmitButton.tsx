"use client";

import { useFormStatus } from "react-dom";

export default function SubmitButton({
  children,
  className = "btn-primary",
  pendingText = "Loading…",
}: {
  children: React.ReactNode;
  className?: string;
  pendingText?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={`btn ${className}`}>
      {pending ? pendingText : children}
    </button>
  );
}
