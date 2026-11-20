import { NextResponse } from "next/server";
import { staffWorkshop } from "@/lib/access";
import { progress } from "@/lib/mongo";
import { getCurrentUser } from "@/lib/session";
import { buildBoard } from "@/lib/status";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: RouteContext<"/api/workshops/[id]/board">) {
  const { id } = await ctx.params;
  const user = await getCurrentUser();
  if (!user || user.role === "student") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const w = await staffWorkshop(user, id);
  if (!w) return NextResponse.json({ error: "not found" }, { status: 404 });

  const docs = await (await progress()).find({ workshopId: id }).toArray();
  return NextResponse.json(buildBoard(w, docs), { headers: { "Cache-Control": "no-store" } });
}
