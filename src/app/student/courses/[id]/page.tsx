import ConfirmButton from "@/components/ConfirmButton";
import { redirect } from "next/navigation";
import AutoRefresh from "@/components/AutoRefresh";
import Header from "@/components/Header";
import Window from "@/components/Window";
import { Meter, OverallBadge } from "@/components/StatusBadge";
import { leaveCourse } from "@/app/actions";
import { courses, enrollments, progress, workshops } from "@/lib/mongo";
import { requireUser } from "@/lib/session";
import { overallFor } from "@/lib/status";

export const dynamic = "force-dynamic";

export default async function StudentCourse({ params }: PageProps<"/student/courses/[id]">) {
  const { id } = await params;
  const user = await requireUser("student");
  const [c, enrolled] = await Promise.all([
    (await courses()).findOne({ _id: id }),
    (await enrollments()).findOne({ _id: `${id}:${user._id}` }),
  ]);
  if (!c || !enrolled) redirect("/student");

  const list = await (await workshops()).find({ courseId: id }).sort({ createdAt: 1 }).toArray();
  const mine = await (await progress()).find({ studentId: user._id, workshopId: { $in: list.map((w) => w._id) } }).toArray();
  const byWorkshop = new Map(mine.map((p) => [p.workshopId, p]));
  const finished = list.filter((w) => {
    const p = byWorkshop.get(w._id);
    return p && overallFor(w, p.steps).overall === "completed";
  }).length;

  return (
    <>
      <Header user={user} />
      {/* New workshops the teacher adds show up without a manual reload. */}
      <AutoRefresh ms={10000} />
      <main className="mx-auto w-full max-w-2xl px-4 py-8">
        <Window title={c.title} tone="peri" aside={<span className="badge bg-paper">Course</span>} className="mb-6">
          {c.description && <p>{c.description}</p>}
          <p className="text-sm opacity-70">Teacher: {c.teacherName}</p>
          <div className="mt-3 flex items-center gap-3">
            <Meter done={finished} total={list.length} className="flex-1" />
            <span className="text-sm">{finished}/{list.length} workshops done</span>
          </div>
        </Window>

        {list.length === 0 ? (
          <div className="checker p-8 text-center">
            <p>No workshops in this course yet. They appear here when your teacher adds them.</p>
          </div>
        ) : (
          <ol className="space-y-4">
            {list.map((w, i) => {
              const p = byWorkshop.get(w._id);
              const { overall, doneCount } = overallFor(w, p?.steps ?? {});
              // A closed workshop the student never started can't be opened, so it isn't a link.
              const canOpen = w.isOpen || Boolean(p);
              return (
                <li key={w._id}>
                  <Window
                    href={canOpen ? `/student/${w._id}` : undefined}
                    title={`${i + 1}. ${w.title}`}
                    tone={overall === "needs_help" ? "tang" : overall === "completed" ? "leaf" : "mint"}
                    aside={w.isOpen || p ? <OverallBadge value={overall} /> : <span className="badge bg-paper">Closed</span>}
                  >
                    {w.description && <p className="mb-2 text-sm">{w.description}</p>}
                    <div className="flex items-center gap-3">
                      <Meter done={doneCount} total={w.steps.length} className="flex-1" />
                      <span className="text-sm">{doneCount}/{w.steps.length} steps{w.isOpen ? "" : " · closed"}</span>
                    </div>
                  </Window>
                </li>
              );
            })}
          </ol>
        )}

        <form action={leaveCourse.bind(null, c._id)} className="mt-10 text-right">
          <ConfirmButton question="Leave this course?" confirmLabel="Yes, leave" className="text-sm underline decoration-dotted hover:text-cherry cursor-pointer" align="end">Leave this course</ConfirmButton>
        </form>
      </main>
    </>
  );
}
