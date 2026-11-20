import ConfirmButton from "@/components/ConfirmButton";
import { notFound } from "next/navigation";
import Header from "@/components/Header";
import Link from "next/link";
import { courses, progress, workshops } from "@/lib/mongo";
import { requireUser } from "@/lib/session";
import { buildBoard } from "@/lib/status";
import CopyButton from "@/components/CopyButton";
import Dashboard from "./Dashboard";
import { deleteWorkshop, toggleWorkshopOpen } from "@/app/actions";

export const dynamic = "force-dynamic";

export default async function TeacherWorkshop({ params }: PageProps<"/teacher/[id]">) {
  const { id } = await params;
  const user = await requireUser("teacher");
  const w = await (await workshops()).findOne({ _id: id, teacherId: user._id });
  if (!w) notFound();
  const course = w.courseId ? await (await courses()).findOne({ _id: w.courseId, teacherId: user._id }) : null;
  const board = buildBoard(w, await (await progress()).find({ workshopId: id }).toArray());

  return (
    <>
      <Header user={user} />
      <main className="mx-auto w-full max-w-6xl px-4 py-8">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            {course && (
              <p className="text-sm font-semibold">
                <Link href={`/teacher/courses/${course._id}`} className="underline decoration-dotted hover:text-peri">◀ {course.title}</Link>
              </p>
            )}
            <h1 className="text-3xl font-bold">{w.title}</h1>
            {w.description && <p className="mt-1">{w.description}</p>}
            <p className="mt-3 flex items-center gap-2">
              Join code
              <span className="joincode rounded-[5px] border-2 border-ink bg-sun px-3 py-0.5 text-2xl">{w.code}</span>
              <CopyButton text={w.code} />
              {!w.isOpen && <span className="badge bg-paper">Closed</span>}
            </p>
          </div>
          <div className="flex gap-2">
            <form action={toggleWorkshopOpen.bind(null, w._id)}>
              <button className="btn">{w.isOpen ? "Close workshop" : "Reopen workshop"}</button>
            </form>
            <form action={deleteWorkshop.bind(null, w._id)}>
              <ConfirmButton question="Delete this workshop and all student progress?" confirmLabel="Yes, delete" align="end">Delete</ConfirmButton>
            </form>
          </div>
        </div>

        <Dashboard initial={board} viewerId={user._id} />
      </main>
    </>
  );
}
