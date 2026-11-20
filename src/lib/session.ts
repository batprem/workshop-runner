import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { users } from "./mongo";
import type { Role, UserDoc } from "./types";

export const SESSION_COOKIE = "wr_uid";
/** Long-lived per-browser id. Survives log out so a student gets their own account back. */
export const DEVICE_COOKIE = "wr_dev";

export async function getCurrentUser(): Promise<UserDoc | null> {
  const store = await cookies();
  const id = store.get(SESSION_COOKIE)?.value;
  if (!id) return null;
  const u = await (await users()).findOne({ _id: id });
  return u ?? null;
}

export function homeFor(role: Role) {
  return role === "teacher" ? "/teacher" : role === "ta" ? "/ta" : "/student";
}

/** Redirects to login when signed out, or to the user's own home when the role doesn't match. */
export async function requireUser(role?: Role): Promise<UserDoc> {
  const user = await getCurrentUser();
  if (!user) redirect("/");
  if (role && user.role !== role) redirect(homeFor(user.role));
  return user;
}
