import { redirect } from "next/navigation";
import Header from "@/components/Header";
import Window from "@/components/Window";
import { getCurrentUser, homeFor } from "@/lib/session";
import LoginForm from "./LoginForm";

export default async function Home() {
  const user = await getCurrentUser();
  if (user) redirect(homeFor(user.role));
  return (
    <>
      <Header user={null} />
      <main className="mx-auto w-full max-w-md px-4 py-12">
        <Window title="Welcome" bodyClassName="p-5">
          <p className="mb-5 text-sm">
            Teachers create a workshop and watch progress live. Students join with a code and tick off steps or ask for help. TAs join with the same code to help students who are stuck.
          </p>
          <LoginForm needsPin={Boolean(process.env.STAFF_PASSWORD)} />
        </Window>
      </main>
    </>
  );
}
