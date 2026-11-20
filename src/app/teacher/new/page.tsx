import Header from "@/components/Header";
import Window from "@/components/Window";
import { courses } from "@/lib/mongo";
import { requireUser } from "@/lib/session";
import NewWorkshopForm from "./NewWorkshopForm";

export default async function NewWorkshop({ searchParams }: PageProps<"/teacher/new">) {
  const user = await requireUser("teacher");
  const { course } = await searchParams;
  const list = await (await courses()).find({ teacherId: user._id }, { projection: { title: 1 } }).sort({ createdAt: -1 }).toArray();
  const preselected = typeof course === "string" && list.some((c) => c._id === course) ? course : "";
  return (
    <>
      <Header user={user} />
      <main className="mx-auto w-full max-w-2xl px-4 py-8">
        <Window title="New workshop" bodyClassName="p-5">
          <NewWorkshopForm courses={list.map((c) => ({ id: c._id, title: c.title }))} defaultCourseId={preselected} />
        </Window>
      </main>
    </>
  );
}
