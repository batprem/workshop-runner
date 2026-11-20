import Link from "next/link";
import { notFound } from "next/navigation";
import ConfirmButton from "@/components/ConfirmButton";
import CopyButton from "@/components/CopyButton";
import Header from "@/components/Header";
import Dashboard from "@/app/teacher/[id]/Dashboard";
import { leaveAssist } from "@/app/actions";
import { staffWorkshop, taCourse } from "@/lib/access";
import { assists, progress } from "@/lib/mongo";
import { requireUser } from "@/lib/session";
import { buildBoard } from "@/lib/status";

export const dynamic = "force-dynamic";

/** The teacher's live dashboard, minus the controls that change or delete the workshop. */
export default async function TaWorkshop({ params }: PageProps<"/ta/[id]">) {
  const { id } = await params;
  const user = await requireUser("ta");
  const w = await staffWorkshop(user, id);
  if (!w) notFound();
  const [course, direct, docs] = await Promise.all([
    w.courseId ? taCourse(user, w.courseId) : null,
    (await assists()).findOne({ _id: `${user._id}:${id}` }, { projection: { _id: 1 } }),
    (await progress()).find({ workshopId: id }).toArray(),
  ]);

  return (
    <>
      <Header user={user} />
      <main className="mx-auto w-full max-w-6xl px-4 py-8">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            {course && (
              <p className="text-sm font-semibold">
                <Link href={`/ta/courses/${course._id}`} className="underline decoration-dotted hover:text-peri">◀ {course.title}</Link>
              </p>
            )}
            <h1 className="text-3xl font-bold">{w.title}</h1>
            {w.description && <p className="mt-1">{w.description}</p>}
            <p className="mt-3 flex flex-wrap items-center gap-2">
              Join code
              <span className="joincode rounded-[5px] border-2 border-ink bg-sun px-3 py-0.5 text-2xl">{w.code}</span>
              <CopyButton text={w.code} />
              {!w.isOpen && <span className="badge bg-paper">Closed</span>}
              <span className="badge bg-mint">Assisting {w.teacherName}</span>
            </p>
          </div>
          {direct && (
            <form action={leaveAssist.bind(null, w._id)}>
              <ConfirmButton question="Stop assisting this workshop?" confirmLabel="Yes, leave" className="btn" align="end">Stop assisting</ConfirmButton>
            </form>
          )}
        </div>

        <Dashboard initial={buildBoard(w, docs)} viewerId={user._id} />
      </main>
    </>
  );
}
