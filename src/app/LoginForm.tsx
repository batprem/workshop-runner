"use client";

import { useActionState, useState } from "react";
import { login } from "./actions";
import SubmitButton from "@/components/SubmitButton";
import { ROLE_LABEL, type Role } from "@/lib/types";

const ROLES: Role[] = ["student", "ta", "teacher"];
const PICKED: Record<Role, string> = { student: "bg-bubble", ta: "btn-primary", teacher: "btn-sun" };

export default function LoginForm({ needsPin }: { needsPin: boolean }) {
  const [state, action] = useActionState(login, undefined);
  const [role, setRole] = useState<Role>("student");

  return (
    <form action={action} className="space-y-4">
      <fieldset className="grid grid-cols-3 gap-2">
        <legend className="mb-1 font-semibold">I am a…</legend>
        {ROLES.map((r) => (
          <label
            key={r}
            className={`btn px-2! has-[:focus-visible]:outline-peri ${role === r ? PICKED[r] : ""}`}
          >
            <input type="radio" name="role" value={r} checked={role === r} onChange={() => setRole(r)} className="sr-only" />
            {ROLE_LABEL[r]}
          </label>
        ))}
      </fieldset>

      <label className="block">
        <span className="mb-1 block font-semibold">Your name</span>
        <input name="name" required maxLength={60} autoFocus className="field" placeholder="e.g. Nicha" />
      </label>

      {role !== "student" && needsPin && (
        <label className="block">
          <span className="mb-1 block font-semibold">Password</span>
          <input name="pin" type="password" required autoComplete="current-password" className="field" />
        </label>
      )}

      {state?.error && <p className="badge bg-cherry text-white">! {state.error}</p>}
      <SubmitButton className="btn-primary w-full">Continue as {role === "ta" ? "TA" : role}</SubmitButton>
    </form>
  );
}
