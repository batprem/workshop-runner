import { assists, courses, workshops } from "./mongo";
import type { CourseDoc, UserDoc, WorkshopDoc } from "./types";

/**
 * The workshop, if this user may see its dashboard: the teacher who owns it, or a TA who joined
 * it directly or joined the course it belongs to. Null otherwise.
 */
export async function staffWorkshop(user: UserDoc, workshopId: string): Promise<WorkshopDoc | null> {
  const w = await (await workshops()).findOne({ _id: workshopId });
  if (!w) return null;
  if (user.role === "teacher") return w.teacherId === user._id ? w : null;
  if (user.role !== "ta") return null;
  const ids = [`${user._id}:${w._id}`, ...(w.courseId ? [`${user._id}:${w.courseId}`] : [])];
  return (await (await assists()).findOne({ _id: { $in: ids } }, { projection: { _id: 1 } })) ? w : null;
}

/** The course, if this TA joined it. */
export async function taCourse(user: UserDoc, courseId: string): Promise<CourseDoc | null> {
  if (user.role !== "ta") return null;
  const joined = await (await assists()).findOne({ _id: `${user._id}:${courseId}` }, { projection: { _id: 1 } });
  return joined ? (await courses()).findOne({ _id: courseId }) : null;
}
