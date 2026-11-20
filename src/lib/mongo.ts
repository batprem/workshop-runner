import { MongoClient, type Db } from "mongodb";
import type { AssistDoc, CourseDoc, EnrollmentDoc, ProgressDoc, UserDoc, WorkshopDoc } from "./types";

declare global {
  var __workshopMongo: Promise<MongoClient> | undefined;
}

function clientPromise(): Promise<MongoClient> {
  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error("MONGO_URI is not set. Add it to .env");
  if (!global.__workshopMongo) {
    global.__workshopMongo = new MongoClient(uri, {
      serverSelectionTimeoutMS: 8000,
    }).connect();
  }
  return global.__workshopMongo;
}

export async function getDb(): Promise<Db> {
  const dbName = process.env.MONGO_DB;
  if (!dbName) throw new Error("MONGO_DB is not set. Add it to .env");
  const client = await clientPromise();
  return client.db(dbName);
}

export async function users() {
  return (await getDb()).collection<UserDoc>("users");
}
export async function workshops() {
  return (await getDb()).collection<WorkshopDoc>("workshops");
}
export async function courses() {
  return (await getDb()).collection<CourseDoc>("courses");
}
export async function enrollments() {
  return (await getDb()).collection<EnrollmentDoc>("enrollments");
}
export async function assists() {
  return (await getDb()).collection<AssistDoc>("assists");
}
export async function progress() {
  return (await getDb()).collection<ProgressDoc>("progress");
}

let indexesReady: Promise<void> | undefined;
export function ensureIndexes() {
  if (!indexesReady) {
    indexesReady = (async () => {
      const [u, w, p, c, e, a] = await Promise.all([users(), workshops(), progress(), courses(), enrollments(), assists()]);
      // Older versions made (name, role) unique, which merged same-named students into one account.
      await u.dropIndex("nameKey_1_role_1").catch(() => {});
      await Promise.all([
        u.createIndex({ role: 1, nameKey: 1 }),
        // A teacher name is still one account, so a teacher can sign in from any device.
        u.createIndex({ nameKey: 1 }, { unique: true, partialFilterExpression: { role: "teacher" }, name: "teacher_name_unique" }),
        // Same for TAs: one account per name, reachable from any device.
        // (Key order differs from the teacher index because MongoDB rejects two indexes on the same key.)
        u.createIndex({ nameKey: 1, role: 1 }, { unique: true, partialFilterExpression: { role: "ta" }, name: "ta_name_unique" }),
        a.createIndex({ taId: 1, joinedAt: -1 }),
        // One student account per (browser, name).
        u.createIndex(
          { deviceId: 1, nameKey: 1 },
          { unique: true, partialFilterExpression: { role: "student", deviceId: { $exists: true } }, name: "student_device_name_unique" },
        ),
        w.createIndex({ code: 1 }, { unique: true }),
        w.createIndex({ courseId: 1, createdAt: 1 }),
        c.createIndex({ code: 1 }, { unique: true }),
        c.createIndex({ teacherId: 1, createdAt: -1 }),
        e.createIndex({ studentId: 1, joinedAt: -1 }),
        e.createIndex({ courseId: 1 }),
        w.createIndex({ teacherId: 1, createdAt: -1 }),
        p.createIndex({ workshopId: 1, lastActiveAt: -1 }),
        p.createIndex({ studentId: 1, joinedAt: -1 }),
      ]);
    })().catch((e) => {
      indexesReady = undefined;
      throw e;
    });
  }
  return indexesReady;
}
