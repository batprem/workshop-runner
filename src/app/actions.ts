"use server";

import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { staffWorkshop } from "@/lib/access";
import { assists, courses, ensureIndexes, enrollments, progress, users, workshops } from "@/lib/mongo";
import { DEVICE_COOKIE, SESSION_COOKIE, getCurrentUser, homeFor, requireUser } from "@/lib/session";
import type { Role, StepStatus, WorkshopStep } from "@/lib/types";

export type ActionState = { error?: string } | undefined;

const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 60 * 24 * 30,
};

// ---------- auth ----------

export async function login(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const name = String(formData.get("name") ?? "").trim();
  const role = String(formData.get("role") ?? "") as Role;
  const pin = String(formData.get("pin") ?? "");

  if (!name || name.length > 60) return { error: "Please enter your name (max 60 characters)." };
  if (role !== "teacher" && role !== "student" && role !== "ta") return { error: "Choose student, TA or teacher." };
  if (role !== "student" && process.env.STAFF_PASSWORD && pin !== process.env.STAFF_PASSWORD) {
    return { error: "Wrong password." };
  }

  await ensureIndexes();
  const col = await users();
  const nameKey = name.toLowerCase();
  const store = await cookies();
  const isDuplicateKey = (e: unknown) => (e as { code?: number })?.code === 11000;
  let id: string | undefined;

  if (role === "teacher" || role === "ta") {
    // Teachers and TAs are identified by name so they can reach their workshops from any device.
    id = (await col.findOne({ nameKey, role }))?._id;
    if (!id) {
      id = randomUUID();
      try {
        await col.insertOne({ _id: id, name, nameKey, role, createdAt: new Date() });
      } catch (e) {
        if (!isDuplicateKey(e)) throw e;
        id = (await col.findOne({ nameKey, role }))?._id; // lost a race with the same teacher signing in twice
      }
    }
  } else {
    // Students are identified by (this browser, name). Two students who type the same name on
    // different devices get separate accounts instead of sharing one.
    const deviceId = store.get(DEVICE_COOKIE)?.value || randomUUID();
    store.set(DEVICE_COOKIE, deviceId, { ...COOKIE_OPTS, maxAge: 60 * 60 * 24 * 365 });

    id = (await col.findOne({ role, nameKey, deviceId }))?._id;
    if (!id) {
      // Accounts created before devices were tracked: the first browser to sign in keeps it.
      const claimed = await col.findOneAndUpdate(
        { role, nameKey, deviceId: { $exists: false } },
        { $set: { deviceId } },
        { returnDocument: "after" },
      );
      id = claimed?._id;
    }
    if (!id) {
      id = randomUUID();
      try {
        await col.insertOne({ _id: id, name, nameKey, role, deviceId, createdAt: new Date() });
      } catch (e) {
        if (!isDuplicateKey(e)) throw e;
        id = (await col.findOne({ role, nameKey, deviceId }))?._id; // double-submitted form
      }
    }
  }
  if (!id) return { error: "Could not sign you in. Please try again." };

  store.set(SESSION_COOKIE, id, COOKIE_OPTS);
  redirect(homeFor(role));
}

export async function logout() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/");
}

// ---------- teacher ----------

function makeCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I
  let out = "";
  for (let i = 0; i < 6; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}

/** Workshop and course codes share one namespace, so a student types either into the same box. */
async function uniqueCode() {
  const [w, c] = await Promise.all([workshops(), courses()]);
  for (;;) {
    const code = makeCode();
    const [inW, inC] = await Promise.all([w.findOne({ code }, { projection: { _id: 1 } }), c.findOne({ code }, { projection: { _id: 1 } })]);
    if (!inW && !inC) return code;
  }
}

async function ownedCourse(courseId: string) {
  const teacher = await requireUser("teacher");
  const c = await (await courses()).findOne({ _id: courseId, teacherId: teacher._id });
  if (!c) throw new Error("Course not found");
  return c;
}

export async function createCourse(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const teacher = await requireUser("teacher");
  const title = String(formData.get("title") ?? "").trim().slice(0, 120);
  const description = String(formData.get("description") ?? "").trim().slice(0, 300);
  if (!title) return { error: "Give the course a title." };

  await ensureIndexes();
  const id = randomUUID();
  await (await courses()).insertOne({
    _id: id,
    title,
    description: description || undefined,
    code: await uniqueCode(),
    teacherId: teacher._id,
    teacherName: teacher.name,
    createdAt: new Date(),
  });
  redirect(`/teacher/courses/${id}`);
}

/** Deletes the course only. Its workshops and their student progress are kept as standalone workshops. */
export async function deleteCourse(courseId: string) {
  const c = await ownedCourse(courseId);
  await Promise.all([
    (await workshops()).updateMany({ courseId: c._id }, { $unset: { courseId: "" } }),
    (await enrollments()).deleteMany({ courseId: c._id }),
    (await courses()).deleteOne({ _id: c._id }),
  ]);
  redirect("/teacher");
}

/** Moves one of the teacher's workshops into a course, or out of it when `courseId` is empty. */
export async function setWorkshopCourse(formData: FormData) {
  const workshopId = String(formData.get("workshopId") ?? "");
  const courseId = String(formData.get("courseId") ?? "");
  const w = await ownedWorkshop(workshopId);
  if (courseId) {
    const c = await ownedCourse(courseId);
    await (await workshops()).updateOne({ _id: w._id }, { $set: { courseId: c._id } });
  } else {
    await (await workshops()).updateOne({ _id: w._id }, { $unset: { courseId: "" } });
  }
  for (const id of [courseId, w.courseId]) if (id) revalidatePath(`/teacher/courses/${id}`);
  revalidatePath(`/teacher/${w._id}`);
  revalidatePath("/teacher");
}

export async function createWorkshop(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const teacher = await requireUser("teacher");
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const titles = formData.getAll("stepTitle").map((v) => String(v).trim());
  const hints = formData.getAll("stepHint").map((v) => String(v).trim());

  if (!title) return { error: "Give the workshop a title." };
  // One title + hint pair per row in the form; rows left blank are skipped.
  const steps: WorkshopStep[] = titles
    .map((t, i) => ({ id: randomUUID(), title: t.slice(0, 120), description: hints[i]?.slice(0, 300) || undefined }))
    .filter((s) => s.title);
  if (steps.length === 0) return { error: "Add at least one step." };

  const courseId = String(formData.get("courseId") ?? "");
  if (courseId && !(await (await courses()).findOne({ _id: courseId, teacherId: teacher._id }))) {
    return { error: "That course no longer exists." };
  }

  await ensureIndexes();
  const id = randomUUID();
  await (await workshops()).insertOne({
    _id: id,
    ...(courseId ? { courseId } : {}),
    title,
    description: description || undefined,
    code: await uniqueCode(),
    teacherId: teacher._id,
    teacherName: teacher.name,
    steps,
    isOpen: true,
    createdAt: new Date(),
  });
  redirect(`/teacher/${id}`);
}

async function ownedWorkshop(workshopId: string) {
  const teacher = await requireUser("teacher");
  const w = await (await workshops()).findOne({ _id: workshopId, teacherId: teacher._id });
  if (!w) throw new Error("Workshop not found");
  return w;
}

export async function toggleWorkshopOpen(workshopId: string) {
  const w = await ownedWorkshop(workshopId);
  await (await workshops()).updateOne({ _id: w._id }, { $set: { isOpen: !w.isOpen } });
  revalidatePath(`/teacher/${workshopId}`);
}

export async function deleteWorkshop(workshopId: string) {
  const w = await ownedWorkshop(workshopId);
  await Promise.all([
    (await workshops()).deleteOne({ _id: w._id }),
    (await progress()).deleteMany({ workshopId: w._id }),
  ]);
  redirect("/teacher");
}

/** Teacher marks a help request as handled; the step goes back to "todo" for the student. */
export async function resolveHelp(workshopId: string, studentId: string, stepId: string) {
  // Teachers who own the workshop and TAs assisting it may both do this.
  const user = await requireUser();
  if (!(await staffWorkshop(user, workshopId))) throw new Error("Workshop not found");
  await (await progress()).updateOne(
    { _id: `${workshopId}:${studentId}`, [`steps.${stepId}.status`]: "stuck" },
    { $set: { [`steps.${stepId}`]: { status: "todo", updatedAt: new Date(), helpedAt: new Date() } } },
  );
  revalidatePath(`/teacher/${workshopId}`);
  revalidatePath(`/ta/${workshopId}`);
}

/**
 * Adds a reply to the thread on a help request. Staff reply to the student named in the form;
 * a student can only reply on their own request.
 */
export async function replyHelp(formData: FormData) {
  const user = await requireUser();
  const workshopId = String(formData.get("workshopId") ?? "");
  const stepId = String(formData.get("stepId") ?? "");
  const text = String(formData.get("text") ?? "").trim().slice(0, 500);
  if (!text) return;

  const isStudent = user.role === "student";
  const w = isStudent ? await (await workshops()).findOne({ _id: workshopId }) : await staffWorkshop(user, workshopId);
  if (!w || !w.steps.some((s) => s.id === stepId)) throw new Error("Workshop not found");
  const studentId = isStudent ? user._id : String(formData.get("studentId") ?? "");

  const now = new Date();
  await (await progress()).updateOne(
    { _id: `${workshopId}:${studentId}`, studentId, [`steps.${stepId}.status`]: "stuck" },
    {
      $push: { [`steps.${stepId}.replies`]: { id: randomUUID(), authorId: user._id, authorName: user.name, role: user.role, text, at: now } },
      ...(isStudent ? { $set: { lastActiveAt: now } } : {}),
    },
  );
  revalidatePath(`/teacher/${workshopId}`);
  revalidatePath(`/ta/${workshopId}`);
  revalidatePath(`/student/${workshopId}`);
}

/**
 * Lets someone change the text of a message they wrote in a help thread: a student's own request
 * note (`messageId` "note") or anyone's own reply. Authorship is checked in the query itself, so a
 * forged id for someone else's message matches nothing.
 */
export async function editHelpMessage(formData: FormData) {
  const user = await requireUser();
  const workshopId = String(formData.get("workshopId") ?? "");
  const stepId = String(formData.get("stepId") ?? "");
  const messageId = String(formData.get("messageId") ?? "");
  const text = String(formData.get("text") ?? "").trim().slice(0, 500);
  if (!text || !messageId) return;

  const isStudent = user.role === "student";
  const w = isStudent ? await (await workshops()).findOne({ _id: workshopId }) : await staffWorkshop(user, workshopId);
  if (!w || !w.steps.some((s) => s.id === stepId)) throw new Error("Workshop not found");
  const studentId = isStudent ? user._id : String(formData.get("studentId") ?? "");
  const stuck = { _id: `${workshopId}:${studentId}`, studentId, [`steps.${stepId}.status`]: "stuck" };
  const now = new Date();

  if (messageId === "note") {
    if (!isStudent) throw new Error("Only the student can edit their request");
    await (await progress()).updateOne(stuck, {
      $set: { [`steps.${stepId}.note`]: text, [`steps.${stepId}.noteEditedAt`]: now, lastActiveAt: now },
    });
  } else {
    await (await progress()).updateOne(
      stuck,
      { $set: { [`steps.${stepId}.replies.$[m].text`]: text, [`steps.${stepId}.replies.$[m].editedAt`]: now } },
      { arrayFilters: [{ "m.id": messageId, "m.authorId": user._id }] },
    );
  }
  revalidatePath(`/teacher/${workshopId}`);
  revalidatePath(`/ta/${workshopId}`);
  revalidatePath(`/student/${workshopId}`);
}

// ---------- TA ----------

/** A TA types the same join code students use. A course code covers every workshop in the course. */
export async function joinAsTa(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ta = await requireUser("ta");
  const code = String(formData.get("code") ?? "").trim().toUpperCase();
  if (!code) return { error: "Enter the join code from the teacher." };

  const [w, c] = await Promise.all([(await workshops()).findOne({ code }), (await courses()).findOne({ code })]);
  if (!w && !c) return { error: "That code was not found. Check it with the teacher." };

  await ensureIndexes();
  const target = c ? { courseId: c._id } : { workshopId: w!._id };
  await (await assists()).updateOne(
    { _id: `${ta._id}:${c ? c._id : w!._id}` },
    { $setOnInsert: { taId: ta._id, ...target, joinedAt: new Date() } },
    { upsert: true },
  );
  redirect(c ? `/ta/courses/${c._id}` : `/ta/${w!._id}`);
}

export async function leaveAssist(targetId: string) {
  const ta = await requireUser("ta");
  await (await assists()).deleteOne({ _id: `${ta._id}:${targetId}`, taId: ta._id });
  redirect("/ta");
}

// ---------- student ----------

export async function joinWorkshop(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const student = await requireUser("student");
  const code = String(formData.get("code") ?? "").trim().toUpperCase();
  if (!code) return { error: "Enter the join code from your teacher." };

  const w = await (await workshops()).findOne({ code });
  if (!w) {
    // Not a workshop code: it may be a course code, which enrols the student in the whole course.
    const c = await (await courses()).findOne({ code });
    if (!c) return { error: "That code was not found. Check it with your teacher." };
    await ensureIndexes();
    await (await enrollments()).updateOne(
      { _id: `${c._id}:${student._id}` },
      { $setOnInsert: { courseId: c._id, studentId: student._id, joinedAt: new Date() } },
      { upsert: true },
    );
    redirect(`/student/courses/${c._id}`);
  }
  if (!w.isOpen) return { error: "This workshop is closed." };

  await ensureIndexes();
  const now = new Date();
  await (await progress()).updateOne(
    { _id: `${w._id}:${student._id}` },
    {
      $setOnInsert: { workshopId: w._id, studentId: student._id, steps: {}, joinedAt: now },
      $set: { studentName: student.name, lastActiveAt: now },
    },
    { upsert: true },
  );
  redirect(`/student/${w._id}`);
}

export async function setStepStatus(formData: FormData) {
  const student = await requireUser("student");
  const workshopId = String(formData.get("workshopId") ?? "");
  const stepId = String(formData.get("stepId") ?? "");
  const status = String(formData.get("status") ?? "") as StepStatus;
  const note = String(formData.get("note") ?? "").trim().slice(0, 500);

  if (!["todo", "done", "stuck"].includes(status)) throw new Error("Bad status");
  const w = await (await workshops()).findOne({ _id: workshopId });
  if (!w || !w.steps.some((s) => s.id === stepId)) throw new Error("Unknown step");
  if (!w.isOpen) throw new Error("Workshop is closed");

  const now = new Date();
  await (await progress()).updateOne(
    { _id: `${workshopId}:${student._id}`, studentId: student._id },
    {
      $set: {
        [`steps.${stepId}`]: { status, note: status === "stuck" ? note || undefined : undefined, updatedAt: now },
        lastActiveAt: now,
      },
    },
  );
  revalidatePath(`/student/${workshopId}`);
}

export async function leaveCourse(courseId: string) {
  const student = await requireUser("student");
  await (await enrollments()).deleteOne({ _id: `${courseId}:${student._id}`, studentId: student._id });
  redirect("/student");
}

export async function leaveWorkshop(workshopId: string) {
  const student = await requireUser("student");
  await (await progress()).deleteOne({ _id: `${workshopId}:${student._id}`, studentId: student._id });
  redirect("/student");
}

export async function whoAmI() {
  return getCurrentUser();
}
