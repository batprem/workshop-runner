import type { StepStatus, StudentOverall } from "@/lib/types";

const overallStyles: Record<StudentOverall, { label: string; cls: string }> = {
  completed: { label: "Completed", cls: "bg-leaf" },
  needs_help: { label: "Needs help", cls: "bg-cherry text-white" },
  in_progress: { label: "In progress", cls: "bg-sun" },
  not_started: { label: "Not started", cls: "bg-paper" },
};

export function OverallBadge({ value }: { value: StudentOverall }) {
  const s = overallStyles[value];
  return <span className={`badge ${s.cls}`}>{s.label}</span>;
}

export function StepDot({ status, title }: { status: StepStatus | undefined; title: string }) {
  const st = status ?? "todo";
  const glyph = st === "done" ? "✓" : st === "stuck" ? "!" : "";
  return (
    <span title={`${title}: ${st}`} className="pix" data-s={st}>
      {glyph}
    </span>
  );
}

/** Segmented loading-bar style progress meter. */
export function Meter({ done, total, className = "" }: { done: number; total: number; className?: string }) {
  const pct = total ? (done / total) * 100 : 0;
  return (
    <div className={`meter ${className}`} data-full={total > 0 && done === total} role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={done}>
      <span style={{ width: `${pct}%` }} />
    </div>
  );
}
