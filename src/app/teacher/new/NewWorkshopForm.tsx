"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { createWorkshop } from "@/app/actions";
import SubmitButton from "@/components/SubmitButton";

type Row = { key: number; title: string; hint: string };

export default function NewWorkshopForm({
  courses,
  defaultCourseId,
}: {
  courses: { id: string; title: string }[];
  defaultCourseId: string;
}) {
  const [state, action] = useActionState(createWorkshop, undefined);
  const nextKey = useRef(1);
  const [rows, setRows] = useState<Row[]>([{ key: 0, title: "", hint: "" }]);
  const pendingFocus = useRef<number | null>(null);
  const titleRefs = useRef(new Map<number, HTMLInputElement>());

  // Move the cursor into a step that was just added.
  useEffect(() => {
    if (pendingFocus.current === null) return;
    titleRefs.current.get(pendingFocus.current)?.focus();
    pendingFocus.current = null;
  }, [rows]);

  function addStep(afterIndex = rows.length - 1) {
    const key = nextKey.current++;
    setRows((r) => [...r.slice(0, afterIndex + 1), { key, title: "", hint: "" }, ...r.slice(afterIndex + 1)]);
    pendingFocus.current = key;
  }

  function update(key: number, patch: Partial<Row>) {
    setRows((r) => r.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  }

  function remove(key: number) {
    setRows((r) => (r.length > 1 ? r.filter((row) => row.key !== key) : r));
  }

  return (
    <form action={action} className="space-y-5">
      <label className="block">
        <span className="mb-1 block font-semibold">Title</span>
        <input name="title" required className="field" placeholder="Intro to Pandas" />
      </label>
      <label className="block">
        <span className="mb-1 block font-semibold">Description (optional)</span>
        <input name="description" className="field" placeholder="What students will build today" />
      </label>

      {courses.length > 0 && (
        <label className="block">
          <span className="mb-1 block font-semibold">Course (optional)</span>
          <select name="courseId" defaultValue={defaultCourseId} className="field">
            <option value="">No course</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>{c.title}</option>
            ))}
          </select>
        </label>
      )}

      <fieldset>
        <legend className="mb-1 font-semibold">Steps</legend>
        <ol className="space-y-2">
          {rows.map((row, i) => (
            <li key={row.key} className="flex items-start gap-2">
              <span className="pix mt-1.5 shrink-0" aria-hidden>{i + 1}</span>
              <div className="grid flex-1 gap-2 sm:grid-cols-2">
                <input
                  ref={(el) => {
                    if (el) titleRefs.current.set(row.key, el);
                    else titleRefs.current.delete(row.key);
                  }}
                  name="stepTitle"
                  value={row.title}
                  onChange={(e) => update(row.key, { title: e.target.value })}
                  onKeyDown={(e) => {
                    // Enter adds the next step instead of submitting a half-written workshop.
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addStep(i);
                    }
                  }}
                  required={i === 0}
                  maxLength={120}
                  aria-label={`Step ${i + 1} title`}
                  placeholder={i === 0 ? "e.g. Install Python" : "Step title"}
                  className="field"
                />
                <input
                  name="stepHint"
                  value={row.hint}
                  onChange={(e) => update(row.key, { hint: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addStep(i);
                    }
                  }}
                  maxLength={300}
                  aria-label={`Step ${i + 1} hint (optional)`}
                  placeholder="Hint (optional)"
                  className="field"
                />
              </div>
              <button
                type="button"
                onClick={() => remove(row.key)}
                disabled={rows.length === 1}
                aria-label={`Remove step ${i + 1}`}
                title="Remove step"
                className="btn btn-danger btn-sm mt-1 shrink-0 text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                ✕
              </button>
            </li>
          ))}
        </ol>
        <button type="button" onClick={() => addStep()} className="btn btn-sun btn-sm mt-3">
          + Add step
        </button>
      </fieldset>

      {state?.error && <p className="badge bg-cherry text-white">! {state.error}</p>}
      <SubmitButton>Create workshop</SubmitButton>
    </form>
  );
}
