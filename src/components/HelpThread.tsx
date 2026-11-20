"use client";

import { useState } from "react";
import { editHelpMessage, replyHelp } from "@/app/actions";
import SubmitButton from "@/components/SubmitButton";
import { ago } from "@/lib/ago";
import { ROLE_LABEL, type Role } from "@/lib/types";

export interface ThreadEntry {
  id: string;
  authorName: string;
  role: Role;
  authorId: string;
  text: string;
  at: string; // ISO time
  edited?: boolean;
}

/**
 * The conversation on one help request, laid out like an issue thread: a timeline of comment
 * boxes (the student's request first, then replies), ending in a box to write the next reply.
 * `studentId` is only needed (and only trusted) for staff.
 */
export default function HelpThread({
  workshopId,
  stepId,
  studentId,
  studentName,
  note,
  since,
  noteEdited = false,
  replies = [],
  viewerId,
  canEditNote = false,
  canReply = true,
  onSent,
  actions,
}: {
  workshopId: string;
  stepId: string;
  studentId?: string;
  studentName: string;
  note?: string;
  /** When help was requested (ISO). */
  since: string;
  noteEdited?: boolean;
  replies?: ThreadEntry[];
  /** Signed-in user. Their own replies get an Edit button. */
  viewerId?: string;
  /** True for the student who wrote the request, so they can reword it. */
  canEditNote?: boolean;
  canReply?: boolean;
  /** Called after a reply is saved, e.g. to refetch a polled board. */
  onSent?: () => void | Promise<void>;
  /** Extra buttons beside "Reply", e.g. "Mark as helped". */
  actions?: React.ReactNode;
}) {
  const target = { workshopId, stepId, studentId };
  return (
    // The ::before is the timeline rail that the avatars sit on.
    <div className="relative before:absolute before:top-2 before:bottom-2 before:left-[0.75rem] before:w-0.5 before:bg-ink/40">
      <ol className="space-y-3">
        <Comment
          name={studentName}
          role="student"
          verb="asked for help"
          at={since}
          edited={noteEdited}
          text={note}
          emptyText="No note left."
          edit={canEditNote ? { ...target, messageId: "note", onSaved: onSent } : undefined}
        />
        {replies.map((m) => (
          <Comment
            key={m.id}
            name={m.authorName}
            role={m.role}
            verb="replied"
            at={m.at}
            edited={m.edited}
            text={m.text}
            edit={canReply && viewerId && m.authorId === viewerId ? { ...target, messageId: m.id, onSaved: onSent } : undefined}
          />
        ))}
      </ol>

      {(canReply || actions) && (
        <form
          action={async (fd) => {
            await replyHelp(fd);
            await onSent?.();
          }}
          className="relative mt-3 ml-9 overflow-hidden rounded-[5px] border-2 border-ink bg-paper"
        >
          <input type="hidden" name="workshopId" value={workshopId} />
          <input type="hidden" name="stepId" value={stepId} />
          {studentId && <input type="hidden" name="studentId" value={studentId} />}
          {canReply && (
            <textarea
              name="text"
              required
              rows={2}
              maxLength={500}
              placeholder="Write a reply…"
              aria-label="Reply"
              className="block w-full resize-y bg-transparent px-3 py-2 text-sm outline-none placeholder:text-ink/45"
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) e.currentTarget.form?.requestSubmit();
              }}
            />
          )}
          <div className="flex flex-wrap items-center justify-end gap-2 border-t-2 border-ink bg-cream px-2 py-1.5">
            {actions}
            {canReply && <SubmitButton className="btn-primary btn-sm" pendingText="Sending…">Reply</SubmitButton>}
          </div>
        </form>
      )}
    </div>
  );
}

interface EditTarget {
  workshopId: string;
  stepId: string;
  studentId?: string;
  messageId: string;
  onSaved?: () => void | Promise<void>;
}

function Comment({
  name, role, verb, at, text, emptyText, edited, edit,
}: {
  name: string;
  role: Role;
  verb: string;
  at: string;
  text?: string;
  /** Shown when there is no text, e.g. a help request sent without a note. */
  emptyText?: string;
  edited?: boolean;
  /** Present only on the viewer's own messages. */
  edit?: EditTarget;
}) {
  const [editing, setEditing] = useState(false);
  const staff = role !== "student";
  return (
    <li className="relative pl-9">
      <span aria-hidden className={`pix absolute top-1 left-0 uppercase ${staff ? "bg-peri! text-white" : "bg-sun!"}`}>
        {[...name.trim()][0] ?? "?"}
      </span>
      <article className="overflow-hidden rounded-[5px] border-2 border-ink bg-paper">
        <header className={`flex flex-wrap items-center justify-between gap-x-2 border-b-2 border-ink px-3 py-1 text-sm ${staff ? "bg-sky" : "bg-cream"}`}>
          <span className="min-w-0">
            <span className="font-bold">{name}</span> {verb}{" "}
            <time dateTime={at} className="num opacity-70" suppressHydrationWarning>{ago(at)}</time>
            {edited && <span className="opacity-70"> · edited</span>}
          </span>
          <span className="flex items-center gap-2">
            {edit && !editing && (
              <button type="button" onClick={() => setEditing(true)} className="cursor-pointer underline decoration-dotted hover:text-peri">
                Edit
              </button>
            )}
            <span className="badge bg-paper text-xs!">{ROLE_LABEL[role]}</span>
          </span>
        </header>
        {edit && editing ? (
          <form
            action={async (fd) => {
              await editHelpMessage(fd);
              await edit.onSaved?.();
              setEditing(false);
            }}
          >
            <input type="hidden" name="workshopId" value={edit.workshopId} />
            <input type="hidden" name="stepId" value={edit.stepId} />
            <input type="hidden" name="messageId" value={edit.messageId} />
            {edit.studentId && <input type="hidden" name="studentId" value={edit.studentId} />}
            <textarea
              name="text"
              required
              rows={2}
              maxLength={500}
              autoFocus
              defaultValue={text ?? ""}
              aria-label="Edit message"
              className="block w-full resize-y bg-transparent px-3 py-2 text-sm outline-none"
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) e.currentTarget.form?.requestSubmit();
                if (e.key === "Escape") setEditing(false);
              }}
            />
            <div className="flex flex-wrap items-center justify-end gap-2 border-t-2 border-ink bg-cream px-2 py-1.5">
              <button type="button" onClick={() => setEditing(false)} className="btn btn-sm">Cancel</button>
              <SubmitButton className="btn-primary btn-sm" pendingText="Saving…">Save</SubmitButton>
            </div>
          </form>
        ) : (
          <p className="px-3 py-2 text-sm break-words whitespace-pre-wrap">{text ?? <span className="opacity-60">{emptyText}</span>}</p>
        )}
      </article>
    </li>
  );
}
