"use client";

import { useActionState } from "react";
import { joinAsTa } from "@/app/actions";
import SubmitButton from "@/components/SubmitButton";

export default function TaJoinForm() {
  const [state, action] = useActionState(joinAsTa, undefined);
  return (
    <form action={action}>
      <div className="flex items-stretch gap-2">
        <input name="code" required maxLength={6} autoFocus aria-label="Join code" placeholder="Enter join code" className="field joincode-input flex-1" />
        <SubmitButton>Assist</SubmitButton>
      </div>
      {state?.error && <p className="badge mt-3 bg-cherry text-white">! {state.error}</p>}
    </form>
  );
}
