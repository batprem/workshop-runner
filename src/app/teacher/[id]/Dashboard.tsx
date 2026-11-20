"use client";

import { useEffect, useState, useTransition } from "react";
import { resolveHelp } from "@/app/actions";
import { ago } from "@/lib/ago";
import HelpThread from "@/components/HelpThread";
import { Meter, OverallBadge } from "@/components/StatusBadge";
import Window, { type Tone } from "@/components/Window";
import type { BoardData } from "@/lib/types";

export default function Dashboard({ initial, viewerId }: { initial: BoardData; /** Signed-in teacher or TA, so they can edit their own replies. */ viewerId: string }) {
  const [board, setBoard] = useState(initial);
  const [offline, setOffline] = useState(false);
  const [pending, start] = useTransition();
  // Which help requests are expanded. Kept by key so it survives the 4s polling refresh.
  const [open, setOpen] = useState<Set<string>>(() => new Set());

  function toggle(key: string) {
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function refresh() {
    try {
      const r = await fetch(`/api/workshops/${initial.workshop.id}/board`, { cache: "no-store" });
      if (!r.ok) throw new Error(String(r.status));
      setBoard(await r.json());
      setOffline(false);
    } catch {
      setOffline(true);
    }
  }

  useEffect(() => {
    const t = setInterval(() => {
      if (document.visibilityState === "visible") refresh();
    }, 4000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial.workshop.id]);

  const { summary, rows, help, workshop } = board;
  const total = workshop.steps.length;

  return (
    <div className="space-y-8">
      <section className="grid grid-cols-2 gap-2 sm:grid-cols-5 md:gap-4">
        <Tile label="Students" value={summary.students} tone="peri" />
        <Tile label="Completed" value={summary.completed} tone="leaf" />
        <Tile label="Need help" value={summary.needsHelp} tone="cherry" />
        <Tile label="In progress" value={summary.inProgress} tone="sun" />
        <Tile label="Not started" value={summary.notStarted} tone="mint" />
      </section>

      <Window
        title="Help queue"
        tone="tang"
        aside={help.length > 0 ? <span className="badge bg-cherry text-white">{help.length}</span> : null}
      >
        {help.length === 0 ? (
          <p>Nobody is stuck right now.</p>
        ) : (
          <ul className="space-y-3">
            {help.map((h) => {
              const key = `${h.studentId}:${h.stepId}`;
              const isOpen = open.has(key);
              return (
                <li key={key} className="overflow-hidden rounded-[5px] border-2 border-ink bg-paper">
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    aria-controls={`help-${key}`}
                    onClick={() => toggle(key)}
                    className="flex w-full cursor-pointer items-center gap-3 p-3 text-left hover:bg-cream focus-visible:outline-3 focus-visible:-outline-offset-3 focus-visible:outline-peri"
                  >
                    <span className="pix shrink-0" data-s="stuck">!</span>
                    <span className="min-w-0 flex-1">
                      <span className="font-bold">{h.studentName}</span> is stuck on <span className="font-semibold">{h.stepTitle}</span>
                      <span className="num ml-2 opacity-70">{ago(h.since)}</span>
                    </span>
                    <span aria-hidden className={`shrink-0 transition-transform ${isOpen ? "rotate-90" : ""}`}>▶</span>
                  </button>
                  {isOpen && (
                    <div id={`help-${key}`} className="border-t-2 border-ink bg-cream p-3">
                      <HelpThread
                        workshopId={workshop.id}
                        stepId={h.stepId}
                        studentId={h.studentId}
                        studentName={h.studentName}
                        note={h.note}
                        since={h.since}
                        noteEdited={h.noteEdited}
                        replies={h.replies}
                        viewerId={viewerId}
                        onSent={refresh}
                        actions={
                          <button
                            type="button"
                            disabled={pending}
                            onClick={() => start(async () => { await resolveHelp(workshop.id, h.studentId, h.stepId); await refresh(); })}
                            className="btn btn-sm"
                          >
                            ✓ Mark as helped
                          </button>
                        }
                      />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Window>

      <Window
        title="Student progress"
        bodyClassName=""
        aside={
          <span className="text-sm font-normal">
            {offline ? <span className="badge bg-cherry text-white">Connection lost…</span> : <>Updated <span className="num">{ago(board.generatedAt)}</span></>}
          </span>
        }
      >
        {rows.length === 0 ? (
          <div className="p-4">
            <div className="checker p-8 text-center">
              <p>
                No students have joined yet. Share code <span className="joincode">{workshop.code}</span>.
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b-2 border-ink bg-paper text-left text-sm">
                <tr>
                  <th className="px-4 py-2">Student</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2">Progress</th>
                  <th className="px-4 py-2">Last active</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.studentId} className="border-t-2 border-dotted border-ink/40 first:border-t-0">
                    <td className="px-4 py-2 font-semibold">{r.studentName}</td>
                    <td className="px-4 py-2"><OverallBadge value={r.overall} /></td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Meter done={r.doneCount} total={total} className="w-28" />
                        <span className="num">{r.doneCount}/{total}</span>
                      </div>
                    </td>
                    <td className="num px-4 py-2 opacity-80">{ago(r.lastActiveAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <ol className="flex flex-wrap gap-x-4 gap-y-1 border-t-2 border-ink bg-paper px-4 py-2 text-sm">
          {workshop.steps.map((s, i) => (
            <li key={s.id}>{i + 1}. {s.title}</li>
          ))}
        </ol>
      </Window>
    </div>
  );
}

function Tile({ label, value, tone }: { label: string; value: number; tone: Tone }) {
  return (
    <Window title={<span className="text-[0.78rem] tracking-normal md:text-base">{label}</span>} tone={tone} className="[&>.win-title]:px-2 md:[&>.win-title]:px-[0.6rem]" bodyClassName="px-3 py-2">
      <div className="font-mono text-4xl font-bold">{value}</div>
    </Window>
  );
}
