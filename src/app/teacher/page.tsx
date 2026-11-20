import Link from "next/link";
import Header from "@/components/Header";
import Window from "@/components/Window";
import WorkshopCard from "@/components/WorkshopCard";
import { courses, enrollments, progress, workshops } from "@/lib/mongo";
import { requireUser } from "@/lib/session";
import { buildBoard } from "@/lib/status";

export const dynamic = "force-dynamic";

export default async function TeacherHome() {
  const user = await requireUser("teacher");
  const [courseList, list] = await Promise.all([
    (await courses()).find({ teacherId: user._id }).sort({ createdAt: -1 }).toArray(),
    (await workshops()).find({ teacherId: user._id }).sort({ createdAt: -1 }).toArray(),
  ]);
  const pcol = await progress();
  const ecol = await enrollments();
  const boards = await Promise.all(
    list.map(async (w) => ({ courseId: w.courseId, board: buildBoard(w, await pcol.find({ workshopId: w._id }).toArray()) })),
  );
  const enrolled = await Promise.all(courseList.map((c) => ecol.countDocuments({ courseId: c._id })));
  const courseIds = new Set(courseList.map((c) => c._id));
  // Workshops whose course was deleted elsewhere still show up here rather than vanishing.
  const standalone = boards.filter((b) => !b.courseId || !courseIds.has(b.courseId));

  return (
    <>
      <Header user={user} />
      <main className="mx-auto w-full max-w-6xl space-y-10 px-4 py-8">
        <section>
          <div className="mb-4 flex items-center justify-between gap-3">
            <h1 className="text-3xl font-bold">Your courses</h1>
            <Link href="/teacher/courses/new" className="btn btn-sun">+ New course</Link>
          </div>
          {courseList.length === 0 ? (
            <div className="checker p-8 text-center">
              <p>No courses yet. A course groups several workshops under one join code.</p>
            </div>
          ) : (
            <ul className="grid gap-5 sm:grid-cols-2">
              {courseList.map((c, i) => {
                const inCourse = boards.filter((b) => b.courseId === c._id);
                const needHelp = inCourse.reduce((n, b) => n + b.board.summary.needsHelp, 0);
                return (
                  <li key={c._id}>
                    <Window href={`/teacher/courses/${c._id}`} title={c.title} tone={needHelp ? "tang" : "peri"} aside={<span className="badge bg-paper">Course</span>}>
                      <p className="flex flex-wrap items-center gap-2 text-sm">
                        Code <span className="joincode">{c.code}</span> · {inCourse.length} {inCourse.length === 1 ? "workshop" : "workshops"}
                      </p>
                      <p className="mt-2 flex flex-wrap gap-2 text-sm">
                        <span className="badge bg-paper">{enrolled[i]} enrolled</span>
                        <span className={`badge ${needHelp ? "bg-cherry text-white" : "bg-paper"}`}>{needHelp} need help</span>
                      </p>
                    </Window>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section>
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-3xl font-bold">{courseList.length ? "Workshops without a course" : "Your workshops"}</h2>
            <Link href="/teacher/new" className="btn btn-primary">+ New workshop</Link>
          </div>
          {standalone.length === 0 ? (
            <div className="checker p-8 text-center">
              <p>{boards.length ? "Every workshop is in a course." : "No workshops yet. Create one and share the join code with your students."}</p>
            </div>
          ) : (
            <ul className="grid gap-5 sm:grid-cols-2">
              {standalone.map(({ board }) => (
                <li key={board.workshop.id}>
                  <WorkshopCard board={board} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </>
  );
}
