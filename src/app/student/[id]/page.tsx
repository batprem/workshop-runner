import ConfirmButton from "@/components/ConfirmButton";
import { notFound, redirect } from "next/navigation";
import Header from "@/components/Header";
import AutoRefresh from "@/components/AutoRefresh";
import Window from "@/components/Window";
import { Meter, OverallBadge } from "@/components/StatusBadge";
import Link from "next/link";
import { courses, enrollments, progress, workshops } from "@/lib/mongo";
import { requireUser } from "@/lib/session";
import { displayNames, overallFor } from "@/lib/status";
import { leaveWorkshop } from "@/app/actions";
import StepCard from "./StepCard";

export const dynamic = "force-dynamic";

export default async function StudentWorkshop({ params }: PageProps<"/student/[id]">) {
  const { id } = await params;
  const user = await requireUser("student");
  const w = await (await workshops()).findOne({ _id: id });
  if (!w) notFound();
  // Being enrolled in the workshop's course is enough to open it; the first visit starts their progress.
  const enrolled = w.courseId ? await (await enrollments()).findOne({ _id: `${w.courseId}:${user._id}` }) : null;
  const course = enrolled ? await (await courses()).findOne({ _id: enrolled.courseId }) : null;
  let p = await (await progress()).findOne({ _id: `${id}:${user._id}` });
  if (!p && enrolled && w.isOpen) {
    const now = new Date();
    p = await (await progress()).findOneAndUpdate(
      { _id: `${id}:${user._id}` },
      { $setOnInsert: { workshopId: id, studentId: user._id, studentName: user.name, steps: {}, joinedAt: now, lastActiveAt: now } },
      { upsert: true, returnDocument: "after" },
    );
  }
  if (!p) redirect(course ? `/student/courses/${course._id}` : "/student");

  // Same-named classmates (case-insensitive), to work out the label the teacher sees for this student.
  const namesakes = await (await progress())
    .find({ workshopId: id, studentName: p.studentName }, { projection: { studentId: 1, studentName: 1, joinedAt: 1 } })
    .collation({ locale: "en", strength: 2 })
    .toArray();
  const shownAs = displayNames(namesakes).get(user._id) ?? p.studentName;

  const { overall, doneCount } = overallFor(w, p.steps);
  const total = w.steps.length;

  return (
    <>
      <Header user={user} />
      <AutoRefresh ms={5000} />
      <main className="mx-auto w-full max-w-2xl px-4 py-8">
        {course && (
          <p className="mb-3 text-sm font-semibold">
            <Link href={`/student/courses/${course._id}`} className="underline decoration-dotted hover:text-peri">◀ {course.title}</Link>
          </p>
        )}
        <Window title={w.title} tone={overall === "needs_help" ? "tang" : "mint"} aside={<OverallBadge value={overall} />} className="mb-6">
          {w.description && <p>{w.description}</p>}
          <p className="text-sm opacity-70">Teacher: {w.teacherName}</p>
          {namesakes.length > 1 && (
            <p className="mt-2 rounded-[5px] border-2 border-ink bg-paper p-2 text-sm">
              Someone else here is also called {p.studentName}. Your teacher sees you as <span className="font-bold">{shownAs}</span>.
            </p>
          )}
          <p className="mt-3 mb-1 text-sm">{overall === "completed" ? "Complete!" : overall === "needs_help" ? "Waiting for help…" : "Loading…"}</p>
          <div className="flex items-center gap-3">
            <Meter done={doneCount} total={total} className="flex-1" />
            <span className="text-sm">{doneCount}/{total} done</span>
          </div>
          {!w.isOpen && (
            <p className="mt-3 rounded-[5px] border-2 border-ink bg-sun p-2 text-sm">
              This workshop has been closed by the teacher. You can still review your steps.
            </p>
          )}
          {overall === "completed" && (
            <p className="mt-3 rounded-[5px] border-2 border-ink bg-leaf p-2 text-sm font-semibold">★ All steps done. Nice work!</p>
          )}
        </Window>

        <ol className="space-y-4">
          {w.steps.map((s, i) => (
            <StepCard key={s.id} index={i + 1} workshopId={w._id} step={s} state={p.steps[s.id]} studentName={p.studentName} studentId={user._id} disabled={!w.isOpen} />
          ))}
        </ol>

        <form action={leaveWorkshop.bind(null, w._id)} className="mt-10 text-right">
          <ConfirmButton question="Leave this workshop? Your progress will be deleted." confirmLabel="Yes, leave" className="text-sm underline decoration-dotted hover:text-cherry cursor-pointer" align="end">Leave this workshop</ConfirmButton>
        </form>
      </main>
    </>
  );
}
