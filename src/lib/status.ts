import type {
  BoardData,
  HelpItem,
  ProgressDoc,
  StudentOverall,
  StudentRow,
  WorkshopDoc,
} from "./types";

export function overallFor(
  workshop: WorkshopDoc,
  steps: ProgressDoc["steps"],
): { overall: StudentOverall; doneCount: number } {
  const total = workshop.steps.length;
  let doneCount = 0;
  let stuck = false;
  for (const s of workshop.steps) {
    const st = steps[s.id]?.status;
    if (st === "done") doneCount++;
    if (st === "stuck") stuck = true;
  }
  let overall: StudentOverall = "in_progress";
  if (stuck) overall = "needs_help";
  else if (total > 0 && doneCount === total) overall = "completed";
  else if (doneCount === 0) overall = "not_started";
  return { overall, doneCount };
}

/**
 * Students may share a name. Within one workshop, label repeats in join order so the teacher can
 * tell them apart: "Nicha", "Nicha (2)", "Nicha (3)". Computed on read, so there is nothing to
 * keep in sync and no race when two same-named students join at once.
 */
export function displayNames(
  docs: Pick<ProgressDoc, "studentId" | "studentName" | "joinedAt">[],
): Map<string, string> {
  const groups = new Map<string, typeof docs>();
  for (const d of docs) {
    const key = d.studentName.trim().toLowerCase();
    const g = groups.get(key);
    if (g) g.push(d);
    else groups.set(key, [d]);
  }
  const labels = new Map<string, string>();
  for (const g of groups.values()) {
    g.sort((a, b) => a.joinedAt.getTime() - b.joinedAt.getTime() || a.studentId.localeCompare(b.studentId));
    g.forEach((d, i) => labels.set(d.studentId, i === 0 ? d.studentName : `${d.studentName} (${i + 1})`));
  }
  return labels;
}

export function buildBoard(workshop: WorkshopDoc, docs: ProgressDoc[]): BoardData {
  const rows: StudentRow[] = [];
  const help: HelpItem[] = [];
  const summary = { students: 0, completed: 0, needsHelp: 0, inProgress: 0, notStarted: 0 };

  const labels = displayNames(docs);

  for (const p of docs) {
    const studentName = labels.get(p.studentId) ?? p.studentName;
    const { overall, doneCount } = overallFor(workshop, p.steps);
    summary.students++;
    if (overall === "completed") summary.completed++;
    else if (overall === "needs_help") summary.needsHelp++;
    else if (overall === "in_progress") summary.inProgress++;
    else summary.notStarted++;

    rows.push({
      studentId: p.studentId,
      studentName,
      overall,
      doneCount,
      steps: p.steps,
      lastActiveAt: p.lastActiveAt.toISOString(),
    });

    for (const s of workshop.steps) {
      const sp = p.steps[s.id];
      if (sp?.status === "stuck") {
        help.push({
          studentId: p.studentId,
          studentName,
          stepId: s.id,
          stepTitle: s.title,
          note: sp.note,
          noteEdited: Boolean(sp.noteEditedAt),
          replies: (sp.replies ?? []).map((r) => ({ id: r.id, authorId: r.authorId, authorName: r.authorName, role: r.role, text: r.text, at: r.at.toISOString(), edited: Boolean(r.editedAt) })),
          since: sp.updatedAt.toISOString(),
        });
      }
    }
  }

  // Students who need help float to the top, then by least progress.
  const rank: Record<StudentOverall, number> = { needs_help: 0, in_progress: 1, not_started: 2, completed: 3 };
  rows.sort((a, b) => rank[a.overall] - rank[b.overall] || a.doneCount - b.doneCount || a.studentName.localeCompare(b.studentName));
  help.sort((a, b) => a.since.localeCompare(b.since));

  return {
    workshop: {
      id: workshop._id,
      title: workshop.title,
      code: workshop.code,
      isOpen: workshop.isOpen,
      steps: workshop.steps,
    },
    summary,
    rows,
    help,
    generatedAt: new Date().toISOString(),
  };
}
