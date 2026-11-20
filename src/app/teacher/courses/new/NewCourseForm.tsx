"use client";

import { useActionState } from "react";
import { createCourse } from "@/app/actions";
import SubmitButton from "@/components/SubmitButton";

export default function NewCourseForm() {
  const [state, action] = useActionState(createCourse, undefined);
  return (
    <form action={action} className="space-y-5">
      <label className="block">
        <span className="mb-1 block font-semibold">Title</span>
        <input name="title" required maxLength={120} autoFocus className="field" placeholder="Data Analysis Bootcamp" />
      </label>
      <label className="block">
        <span className="mb-1 block font-semibold">Description (optional)</span>
        <input name="description" maxLength={300} className="field" placeholder="Three days, six workshops" />
      </label>
      <p className="text-sm opacity-70">You add workshops to the course on the next screen.</p>
      {state?.error && <p className="badge bg-cherry text-white">! {state.error}</p>}
      <SubmitButton>Create course</SubmitButton>
    </form>
  );
}
