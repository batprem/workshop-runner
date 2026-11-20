import { notFound } from "next/navigation";
import AutoRefresh from "@/components/AutoRefresh";
import ConfirmButton from "@/components/ConfirmButton";
import CopyButton from "@/components/CopyButton";
import Header from "@/components/Header";
import WorkshopCard from "@/components/WorkshopCard";
import { leaveAssist } from "@/app/actions";
import { taCourse } from "@/lib/access";
import { progress, workshops } from "@/lib/mongo";
import { requireUser } from "@/lib/session";
import { buildBoard } from "@/lib/status";

export const dynamic = "force-dynamic";

export default async function TaCourse({ params }: PageProps<"/ta/courses/[id]">) {
  const { id } = await params;
  const user = await requireUser("ta");
  const c = await taCourse(user, id);
  if (!c) notFound();

  const list = await (await workshops()).find({ courseId: id }).sort({ createdAt: 1 }).toArray();
  const pcol = await progress();
  const boards = await Promise.all(list.map(async (w) => buildBoard(w, await pcol.find({ workshopId: w._id }).toArray())));

  return (
    <>
      <Header user={user} />
      {/* Keeps the stuck counts current while a TA watches the whole course. */}
      <AutoRefresh ms={8000} />
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
              <span className="badge bg-mint">Assisting {c.teacherName}</span>
            </p>
          </div>
          <form action={leaveAssist.bind(null, c._id)}>
            <ConfirmButton question="Stop assisting this course?" confirmLabel="Yes, leave" className="btn" align="end">Stop assisting</ConfirmButton>
          </form>
        </div>

        {boards.length === 0 ? (
          <div className="checker p-10 text-center">
            <p>No workshops in this course yet.</p>
          </div>
        ) : (
          <ol className="grid gap-5 sm:grid-cols-2">
            {boards.map((b) => (
              <li key={b.workshop.id}>
                <WorkshopCard board={b} basePath="/ta" />
              </li>
            ))}
          </ol>
        )}
      </main>
    </>
  );
}
