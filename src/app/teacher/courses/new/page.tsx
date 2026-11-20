import Header from "@/components/Header";
import Window from "@/components/Window";
import { requireUser } from "@/lib/session";
import NewCourseForm from "./NewCourseForm";

export default async function NewCourse() {
  const user = await requireUser("teacher");
  return (
    <>
      <Header user={user} />
      <main className="mx-auto w-full max-w-2xl px-4 py-8">
        <Window title="New course" tone="peri" bodyClassName="p-5">
          <NewCourseForm />
        </Window>
      </main>
    </>
  );
}
