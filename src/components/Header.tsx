import Link from "next/link";
import { logout } from "@/app/actions";
import { homeFor } from "@/lib/session";
import { ROLE_LABEL, type UserDoc } from "@/lib/types";
import CatIcon from "./CatIcon";
import HomeButton from "./HomeButton";

export default function Header({ user }: { user: UserDoc | null }) {
  const home = user ? homeFor(user.role) : "/";
  return (
    <header className="border-b-2 border-ink bg-cream">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2">
        <div className="flex items-center gap-3">
          {user && <HomeButton href={home} />}
          <Link href={home} className="flex items-center gap-2 text-lg font-bold">
            <CatIcon />
            Forward Deploy Workshop
          </Link>
        </div>
        {user && (
          <div className="flex items-center gap-3 text-sm">
            <span className={`badge ${user.role === "teacher" ? "bg-sun" : user.role === "ta" ? "bg-mint" : "bg-bubble"}`}>
              {user.name} · {ROLE_LABEL[user.role]}
            </span>
            <form action={logout}>
              <button className="btn btn-sm">Log out</button>
            </form>
          </div>
        )}
      </div>
    </header>
  );
}
