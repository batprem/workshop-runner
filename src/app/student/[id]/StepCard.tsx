"use client";

import { useState } from "react";
import { setStepStatus } from "@/app/actions";
import HelpThread from "@/components/HelpThread";
import SubmitButton from "@/components/SubmitButton";
import type { StepProgress, WorkshopStep } from "@/lib/types";

export default function StepCard({
  index, workshopId, step, state, disabled, studentName, studentId,
}: {
  studentName: string;
  /** The signed-in student, so they can edit their own messages. */
  studentId: string;
  index: number;
  workshopId: string;
  step: WorkshopStep;
  state?: StepProgress;
  disabled: boolean;
}) {
  const status = state?.status ?? "todo";
  const [asking, setAsking] = useState(false);

  const tone = status === "done" ? "leaf" : status === "stuck" ? "cherry" : "sun";

  return (
    <li className="win">
      <div className="win-title" data-tone={tone}>
        <span className="flex items-center gap-2">
          <span className="pix" data-s={status}>{status === "done" ? "✓" : status === "stuck" ? "!" : index}</span>
          <h3 className={status === "done" ? "line-through decoration-2" : ""}>{step.title}</h3>
        </span>
        <span className="text-sm font-normal">{status === "done" ? "Done" : status === "stuck" ? "Help requested" : `Step ${index}`}</span>
      </div>
      <div className="p-4">
        {step.description && <p className="mb-3">{step.description}</p>}

        {status === "stuck" && (
          <div className="mb-3 space-y-2 rounded-[5px] border-2 border-ink bg-cream p-2">
            <p className="text-sm">Help requested. Your teacher can see this and reply here.</p>
            <HelpThread
              workshopId={workshopId}
              stepId={step.id}
              studentName={studentName}
              note={state?.note}
              noteEdited={Boolean(state?.noteEditedAt)}
              viewerId={studentId}
              canEditNote={!disabled}
              since={new Date(state?.updatedAt ?? 0).toISOString()}
              replies={state?.replies?.map((r) => ({ id: r.id, authorId: r.authorId, authorName: r.authorName, role: r.role, text: r.text, at: new Date(r.at).toISOString(), edited: Boolean(r.editedAt) }))}
              canReply={!disabled}
            />
          </div>
        )}

        {!disabled && (
          <>
            {status === "todo" && !asking && (
              <div className="flex flex-wrap gap-2">
                <form action={setStepStatus}>
                  <Hidden workshopId={workshopId} stepId={step.id} status="done" />
                  <SubmitButton pendingText="Saving…">Mark done</SubmitButton>
                </form>
                <button type="button" onClick={() => setAsking(true)} className="btn btn-danger">I need help</button>
              </div>
            )}

            {status === "todo" && asking && (
              <form action={setStepStatus} className="space-y-2" onSubmit={() => setAsking(false)}>
                <Hidden workshopId={workshopId} stepId={step.id} status="stuck" />
                <textarea name="note" rows={2} maxLength={500} autoFocus placeholder="What's going wrong? (optional)" className="field" />
                <div className="flex flex-wrap gap-2">
                  <SubmitButton className="btn-danger" pendingText="Sending…">Send help request</SubmitButton>
                  <button type="button" onClick={() => setAsking(false)} className="btn">Cancel</button>
                </div>
              </form>
            )}

            {status === "stuck" && (
              <div className="flex flex-wrap gap-2">
                <form action={setStepStatus}>
                  <Hidden workshopId={workshopId} stepId={step.id} status="done" />
                  <SubmitButton pendingText="Saving…">Solved it, mark done</SubmitButton>
                </form>
                <form action={setStepStatus}>
                  <Hidden workshopId={workshopId} stepId={step.id} status="todo" />
                  <button className="btn">Cancel request</button>
                </form>
              </div>
            )}

            {status === "done" && (
              <form action={setStepStatus}>
                <Hidden workshopId={workshopId} stepId={step.id} status="todo" />
                <button className="btn btn-sm">Undo</button>
              </form>
            )}
          </>
        )}
      </div>
    </li>
  );
}

function Hidden({ workshopId, stepId, status }: { workshopId: string; stepId: string; status: string }) {
  return (
    <>
      <input type="hidden" name="workshopId" value={workshopId} />
      <input type="hidden" name="stepId" value={stepId} />
      <input type="hidden" name="status" value={status} />
    </>
  );
}
