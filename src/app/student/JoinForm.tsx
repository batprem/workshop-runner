"use client";

import { useActionState } from "react";
import { joinWorkshop } from "@/app/actions";
import SubmitButton from "@/components/SubmitButton";

export default function JoinForm() {
  const [state, action] = useActionState(joinWorkshop, undefined);
  return (
    <form action={action}>
      <div className="flex items-stretch gap-2">
        <input
          name="code"
          required
          maxLength={6}
          autoFocus
          aria-label="Join code"
          placeholder="Enter join code"
          className="field joincode-input flex-1"
        />
        <SubmitButton>Join</SubmitButton>
      </div>
      {state?.error && <p className="badge mt-3 bg-cherry text-white">! {state.error}</p>}
    </form>
  );
}
