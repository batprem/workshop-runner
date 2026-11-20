import Link from "next/link";
import type { BoardData } from "@/lib/types";

/**
 * Teacher-facing summary card for one workshop, laid out on a rule-of-thirds grid:
 * three equal rows (title bar, info, counts) by three equal columns. Everything in the last
 * column is right-aligned, so status, stuck count and action share one vertical edge.
 *
 *   | title              |            | open/closed |
 *   | join code          | step count | stuck count |
 *   | students           | done       |      action |
 */
export default function WorkshopCard({
  board: b,
  action,
  basePath = "/teacher",
}: {
  /** Where the card links to: `${basePath}/${workshopId}`. TAs use "/ta". */
  basePath?: string;
  board: BoardData;
  /** Small control at the right end of the bottom row, e.g. "remove from course". */
  action?: React.ReactNode;
}) {
  const { summary: s, workshop: w } = b;
  const stuckText =
    s.needsHelp === 0 ? "No students are stuck" : s.needsHelp === 1 ? "1 student is stuck" : `${s.needsHelp} students are stuck`;
  const cols = "grid grid-cols-3 items-center gap-x-3 px-4";
  const row = "h-11"; // every row is the same height, so the card divides into thirds vertically too
  return (
    <section className="win relative">
      <div className={`win-title ${cols} ${row} py-0!`} data-tone={s.needsHelp ? "tang" : "mint"}>
        {/* The ::after stretches this link over the whole card, so anywhere outside the action opens it. */}
        <Link href={`${basePath}/${w.id}`} className="col-span-2 truncate after:absolute after:inset-0 hover:underline">
          {w.title}
        </Link>
        <span className={`badge justify-self-end ${w.isOpen ? "bg-leaf" : "bg-paper"}`}>{w.isOpen ? "Open" : "Closed"}</span>
      </div>
      <div className={`${cols} ${row} text-sm`}>
        <span className="joincode justify-self-start" title="Join code">{w.code}</span>
        <span>{w.steps.length} {w.steps.length === 1 ? "step" : "steps"}</span>
        {/* Stuck count: number only, coloured when anyone needs help. z-10 lifts it above the
            card-wide link so the hover text shows. */}
        <span
          className={`badge relative z-10 cursor-help justify-self-end ${s.needsHelp ? "bg-cherry text-white" : "bg-transparent"}`}
          title={stuckText}
          aria-label={stuckText}
        >
          {s.needsHelp}
        </span>
      </div>
      {/* relative: a confirmation from `action` covers exactly this row */}
      <div className={`${cols} ${row} relative border-t-2 border-dotted border-ink/30 text-sm`}>
        <span className="badge justify-self-start bg-paper">{s.students} {s.students === 1 ? "student" : "students"}</span>
        <span className="badge justify-self-start bg-leaf">{s.completed} done</span>
        {/* Shares the last cell but is pinned to its right end, so it stays in the corner (16px in) at any card width. */}
        {action && <div className="col-start-3 row-start-1 justify-self-end">{action}</div>}
      </div>
    </section>
  );
}
