import ConfirmButton from "@/components/ConfirmButton";
import Link from "next/link";
import { notFound } from "next/navigation";
import CopyButton from "@/components/CopyButton";
import Header from "@/components/Header";
import Window from "@/components/Window";
import WorkshopCard from "@/components/WorkshopCard";
import { deleteCourse, setWorkshopCourse } from "@/app/actions";
import { courses, enrollments, progress, workshops } from "@/lib/mongo";
import { requireUser } from "@/lib/session";
import { buildBoard } from "@/lib/status";

export const dynamic = "force-dynamic";

export default async function TeacherCourse({ params }: PageProps<"/teacher/courses/[id]">) {
  const { id } = await params;
  const user = await requireUser("teacher");
  const c = await (await courses()).findOne({ _id: id, teacherId: user._id });
  if (!c) notFound();

  const wcol = await workshops();
  const [inCourse, others, enrolled] = await Promise.all([
    wcol.find({ courseId: id, teacherId: user._id }).sort({ createdAt: 1 }).toArray(),
    wcol.find({ teacherId: user._id, courseId: { $ne: id } }, { projection: { title: 1 } }).sort({ createdAt: -1 }).toArray(),
    (await enrollments()).countDocuments({ courseId: id }),
  ]);
  const pcol = await progress();
  const boards = await Promise.all(inCourse.map(async (w) => buildBoard(w, await pcol.find({ workshopId: w._id }).toArray())));

  return (
    <>
      <Header user={user} />
      <main className="mx-auto w-full max-w-6xl px-4 py-8">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold opacity-70">Course</p>
            <h1 className="text-3xl font-bold">{c.title}</h1>
            {c.description && <p className="mt-1">{c.description}</p>}
            <p className="mt-3 flex flex-wrap items-center gap-2">
              Join code
              <span className="joincode rounded-[5px] border-2 border-ink bg-sun px-3 py-0.5 text-2xl">{c.code}</span>
              <CopyButton text={c.code} />
              <span className="badge bg-paper">{enrolled} enrolled</span>
            </p>
            <p className="mt-2 text-sm opacity-70">Students who join with this code get every workshop in the course.</p>
          </div>
          <div className="flex gap-2">
            <Link href={`/teacher/new?course=${c._id}`} className="btn btn-primary">+ New workshop</Link>
            <form action={deleteCourse.bind(null, c._id)}>
              <ConfirmButton question="Delete this course? Its workshops are kept." confirmLabel="Yes, delete" align="end">Delete course</ConfirmButton>
            </form>
          </div>
        </div>

        {boards.length === 0 ? (
          <div className="checker p-10 text-center">
            <p>No workshops in this course yet.</p>
          </div>
        ) : (
          <ol className="grid gap-5 sm:grid-cols-2">
            {boards.map((b) => (
              <li key={b.workshop.id}>
                <WorkshopCard
                  board={b}
                  action={
                    <form action={setWorkshopCourse}>
                      <input type="hidden" name="workshopId" value={b.workshop.id} />
                      <input type="hidden" name="courseId" value="" />
                      <ConfirmButton
                        question="Remove from course?"
                        confirmLabel="Yes"
                        floating
                        className="pix relative z-10 cursor-pointer hover:bg-cherry hover:text-white"
                        title={`Remove ${b.workshop.title} from course`}
                      >
                        {/* Bin, drawn with square strokes to sit with the pixel font. */}
                        <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square" aria-hidden>
                          <path d="M2 4h12M6 4V2h4v2M4 4v10h8V4M7 7v4M9 7v4" />
                        </svg>
                      </ConfirmButton>
                    </form>
                  }
                />
              </li>
            ))}
          </ol>
        )}

        {others.length > 0 && (
          <Window title="Add an existing workshop" tone="sun" className="mt-8 max-w-xl">
            <form action={setWorkshopCourse} className="flex items-stretch gap-2">
              <input type="hidden" name="courseId" value={c._id} />
              <select name="workshopId" required aria-label="Workshop to add" className="field flex-1">
                {others.map((w) => (
                  <option key={w._id} value={w._id}>{w.title}</option>
                ))}
              </select>
              <button className="btn btn-sun">Add</button>
            </form>
          </Window>
        )}
      </main>
    </>
  );
}
