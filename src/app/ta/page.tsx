import Header from "@/components/Header";
import Window from "@/components/Window";
import WorkshopCard from "@/components/WorkshopCard";
import { assists, courses, progress, workshops } from "@/lib/mongo";
import { requireUser } from "@/lib/session";
import { buildBoard } from "@/lib/status";
import TaJoinForm from "./JoinForm";

export const dynamic = "force-dynamic";

export default async function TaHome() {
  const user = await requireUser("ta");
  const mine = await (await assists()).find({ taId: user._id }).sort({ joinedAt: -1 }).toArray();
  const courseIds = mine.flatMap((a) => (a.courseId ? [a.courseId] : []));
  const workshopIds = mine.flatMap((a) => (a.workshopId ? [a.workshopId] : []));
  const [courseList, direct, inCourses] = await Promise.all([
    (await courses()).find({ _id: { $in: courseIds } }).toArray(),
    (await workshops()).find({ _id: { $in: workshopIds } }).toArray(),
    (await workshops()).find({ courseId: { $in: courseIds } }).toArray(),
  ]);
  const pcol = await progress();
  const board = async (w: (typeof direct)[number]) => buildBoard(w, await pcol.find({ workshopId: w._id }).toArray());
  const [directBoards, courseBoards] = await Promise.all([
    // A workshop joined directly is listed under its course instead when the TA also joined that course.
    Promise.all(direct.filter((w) => !(w.courseId && courseIds.includes(w.courseId))).map(board)),
    Promise.all(inCourses.map(async (w) => ({ courseId: w.courseId, board: await board(w) }))),
  ]);

  return (
    <>
      <Header user={user} />
      <main className="mx-auto w-full max-w-6xl space-y-10 px-4 py-8">
        <Window title="Assist with a code" tone="mint" className="max-w-2xl">
          <TaJoinForm />
        </Window>

        {courseList.length > 0 && (
          <section>
            <h2 className="mb-4 text-3xl font-bold">Courses you assist</h2>
            <ul className="grid gap-5 sm:grid-cols-2">
              {courseList.map((c) => {
                const list = courseBoards.filter((b) => b.courseId === c._id);
                const stuck = list.reduce((n, b) => n + b.board.summary.needsHelp, 0);
                return (
                  <li key={c._id}>
                    <Window href={`/ta/courses/${c._id}`} title={c.title} tone={stuck ? "tang" : "peri"} aside={<span className="badge bg-paper">Course</span>}>
                      <p className="flex flex-wrap items-center gap-2 text-sm">
                        <span className="badge bg-paper">{list.length} {list.length === 1 ? "workshop" : "workshops"}</span>
                        <span className={`badge ${stuck ? "bg-cherry text-white" : "bg-paper"}`}>{stuck} stuck</span>
                      </p>
                      <p className="mt-2 text-sm opacity-70">by {c.teacherName}</p>
                    </Window>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {directBoards.length > 0 && (
          <section>
            <h2 className="mb-4 text-3xl font-bold">Workshops you assist</h2>
            <ul className="grid gap-5 sm:grid-cols-2">
              {directBoards.map((b) => (
                <li key={b.workshop.id}>
                  <WorkshopCard board={b} basePath="/ta" />
                </li>
              ))}
            </ul>
          </section>
        )}

        {mine.length === 0 && (
          <div className="checker max-w-2xl p-8 text-center">
            <p>Enter a course or workshop join code from the teacher to see who needs help.</p>
          </div>
        )}
      </main>
    </>
  );
}
