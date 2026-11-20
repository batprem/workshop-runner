import Header from "@/components/Header";
import Window from "@/components/Window";
import { Meter, OverallBadge } from "@/components/StatusBadge";
import { courses, enrollments, progress, workshops } from "@/lib/mongo";
import { requireUser } from "@/lib/session";
import { overallFor } from "@/lib/status";
import JoinForm from "./JoinForm";

export const dynamic = "force-dynamic";

export default async function StudentHome() {
  const user = await requireUser("student");
  const [mine, enrolled] = await Promise.all([
    (await progress()).find({ studentId: user._id }).sort({ joinedAt: -1 }).toArray(),
    (await enrollments()).find({ studentId: user._id }).sort({ joinedAt: -1 }).toArray(),
  ]);
  const courseIds = enrolled.map((e) => e.courseId);
  const [ws, myCourses, courseWorkshops] = await Promise.all([
    (await workshops()).find({ _id: { $in: mine.map((p) => p.workshopId) } }).toArray(),
    (await courses()).find({ _id: { $in: courseIds } }).toArray(),
    (await workshops()).find({ courseId: { $in: courseIds } }).toArray(),
  ]);
  const byId = new Map(ws.map((w) => [w._id, w]));
  const courseById = new Map(myCourses.map((c) => [c._id, c]));
  const progressByWorkshop = new Map(mine.map((p) => [p.workshopId, p]));
  // Workshops that belong to an enrolled course are shown inside that course, not twice.
  const standalone = mine.filter((p) => {
    const w = byId.get(p.workshopId);
    return w && !(w.courseId && courseById.has(w.courseId));
  });

  return (
    <>
      <Header user={user} />
      <main className="mx-auto w-full max-w-2xl px-4 py-8">
        <Window title="Join with a code" tone="bubble">
          <JoinForm />
        </Window>

        {enrolled.length > 0 && (
          <section className="mt-10">
            <h2 className="mb-3 text-2xl font-bold">Your courses</h2>
            <ul className="space-y-4">
              {enrolled.map((e) => {
                const c = courseById.get(e.courseId);
                if (!c) return null;
                const list = courseWorkshops.filter((w) => w.courseId === c._id);
                const finished = list.filter((w) => {
                  const p = progressByWorkshop.get(w._id);
                  return p && overallFor(w, p.steps).overall === "completed";
                }).length;
                return (
                  <li key={e._id}>
                    <Window href={`/student/courses/${c._id}`} title={c.title} tone="peri" aside={<span className="badge bg-paper">Course</span>}>
                      <div className="flex items-center gap-3">
                        <Meter done={finished} total={list.length} className="flex-1" />
                        <span className="text-sm">{finished}/{list.length} workshops</span>
                      </div>
                      <p className="mt-2 text-sm opacity-70">by {c.teacherName}</p>
                    </Window>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {standalone.length > 0 && (
          <section className="mt-10">
            <h2 className="mb-3 text-2xl font-bold">Your workshops</h2>
            <ul className="space-y-4">
              {standalone.map((p) => {
                const w = byId.get(p.workshopId)!;
                const { overall, doneCount } = overallFor(w, p.steps);
                return (
                  <li key={p._id}>
                    <Window href={`/student/${w._id}`} title={w.title} tone={overall === "needs_help" ? "tang" : "mint"} aside={<OverallBadge value={overall} />}>
                      <div className="flex items-center gap-3">
                        <Meter done={doneCount} total={w.steps.length} className="flex-1" />
                        <span className="text-sm">{doneCount}/{w.steps.length}</span>
                      </div>
                      <p className="mt-2 text-sm opacity-70">by {w.teacherName}{w.isOpen ? "" : " · closed"}</p>
                    </Window>
                  </li>
                );
              })}
            </ul>
          </section>
        )}
      </main>
    </>
  );
}
