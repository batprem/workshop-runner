/** "ta" = teaching assistant: sees dashboards and resolves help requests, but can't create or change anything. */
export type Role = "teacher" | "student" | "ta";

export const ROLE_LABEL: Record<Role, string> = { teacher: "Teacher", student: "Student", ta: "TA" };

/** A TA who joined a course or a single workshop with its join code. */
export interface AssistDoc {
  _id: string; // `${taId}:${courseId ?? workshopId}`
  taId: string;
  courseId?: string;
  workshopId?: string;
  joinedAt: Date;
}

export type StepStatus = "todo" | "done" | "stuck";

export interface UserDoc {
  _id: string;
  name: string;
  nameKey: string; // lowercased name. Unique for teachers; students may share a name.
  role: Role;
  /** Students only: the browser this account belongs to. Same name on another device = another student. */
  deviceId?: string;
  createdAt: Date;
}

export interface WorkshopStep {
  id: string;
  title: string;
  description?: string;
}

/** A course groups workshops under one join code. */
export interface CourseDoc {
  _id: string;
  title: string;
  description?: string;
  code: string; // join code; shares one namespace with workshop codes
  teacherId: string;
  teacherName: string;
  createdAt: Date;
}

/** A student who joined a course. Gives access to every workshop in it. */
export interface EnrollmentDoc {
  _id: string; // `${courseId}:${studentId}`
  courseId: string;
  studentId: string;
  joinedAt: Date;
}

export interface WorkshopDoc {
  _id: string;
  /** Set when the workshop belongs to a course. */
  courseId?: string;
  title: string;
  description?: string;
  code: string; // join code shown to students
  teacherId: string;
  teacherName: string;
  steps: WorkshopStep[];
  isOpen: boolean;
  createdAt: Date;
}

/** One reply in the thread on a help request. */
export interface HelpReply {
  id: string;
  authorId: string;
  authorName: string;
  role: Role;
  text: string;
  at: Date;
  /** Set when the author changed the text after posting. */
  editedAt?: Date;
}

export interface StepProgress {
  status: StepStatus;
  note?: string;
  /** Set when the student changed their request note after sending it. */
  noteEditedAt?: Date;
  /** Replies while the step is stuck. Dropped with the note when the status changes. */
  replies?: HelpReply[];
  updatedAt: Date;
}

export interface ProgressDoc {
  _id: string; // `${workshopId}:${studentId}`
  workshopId: string;
  studentId: string;
  studentName: string;
  steps: Record<string, StepProgress>;
  joinedAt: Date;
  lastActiveAt: Date;
}

export type StudentOverall = "not_started" | "in_progress" | "needs_help" | "completed";

export interface StudentRow {
  studentId: string;
  studentName: string;
  overall: StudentOverall;
  doneCount: number;
  steps: Record<string, StepProgress>;
  lastActiveAt: string;
}

export interface HelpItem {
  studentId: string;
  studentName: string;
  stepId: string;
  stepTitle: string;
  note?: string;
  noteEdited?: boolean;
  replies: { id: string; authorId: string; authorName: string; role: Role; text: string; at: string; edited?: boolean }[];
  since: string;
}

export interface BoardData {
  workshop: {
    id: string;
    title: string;
    code: string;
    isOpen: boolean;
    steps: WorkshopStep[];
  };
  summary: {
    students: number;
    completed: number;
    needsHelp: number;
    inProgress: number;
    notStarted: number;
  };
  rows: StudentRow[];
  help: HelpItem[];
  generatedAt: string;
}
