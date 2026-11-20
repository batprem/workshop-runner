# Forward Deploy Workshop

A small Next.js app for running online workshops. Teachers publish a step-by-step
workshop and watch a live board; students join with a code, tick off steps, and
raise a hand when they are stuck.

## Roles

**Teacher**
- Create a workshop with an ordered list of steps (one row per step, each with an optional hint; `+ Add step` or Enter adds a row).
- Share the 6-character join code.
- Live dashboard (refreshes every 4 s): counts of completed / in progress / needs help,
  a help queue with each student's note, and a per-step grid for every student.
- "Mark as helped" clears a help request; close/reopen or delete a workshop.

**Student**
- Join with the code, see the steps, mark each one done (or undo).
- "I need help" on a step with an optional note. The teacher sees it immediately.
- Overall status: not started → in progress → completed, or needs help.

## Teaching assistants

A TA signs in with the TA role and enters a course or workshop join code. They get the same live
dashboard as the teacher and can mark help requests as handled. They cannot create, edit, close
or delete workshops or courses. A course code covers every workshop in that course.

## Courses

A course groups several workshops under one join code.

- Teachers create a course, then add new or existing workshops to it. A workshop belongs to at
  most one course.
- Students type a course code into the same join box as a workshop code. They get every workshop
  in the course, including ones added later, and start each one the first time they open it.
- Deleting a course keeps its workshops and their progress as standalone workshops.

## Setup

```bash
cp .env.example .env   # then edit
npm install
npm run dev            # http://localhost:3000
```

`.env` must define:

```bash
export MONGO_URI='mongodb://user:password@host:27017/'
export MONGO_DB=workshop_runner
# password teachers and TAs must enter to sign in
# export STAFF_PASSWORD='change-me'
```

Indexes are created automatically on first login.

## How sign-in works

There are no passwords.

- **Teachers and TAs** are identified by name, so they reach their workshops from any device.
  Set `STAFF_PASSWORD` to stop students from signing in as a teacher or TA.
- **Students** are identified by name *and browser*. Two students who type the same name on
  different devices get separate accounts and separate progress. Signing out and back in on the
  same browser returns the same account. A student who switches device or clears cookies joins
  as a new student.
- When students in a workshop share a name, the teacher's board labels them in join order:
  `Nicha`, `Nicha (2)`. Each of those students is told which label they have.

## Layout

- `src/app/actions.ts` – all server actions (login, create/join workshop, step status, resolve help)
- `src/app/api/workshops/[id]/board` – JSON the teacher dashboard polls
- `src/app/teacher/*`, `src/app/student/*` – pages
- `src/lib/mongo.ts` – cached MongoDB client; `src/lib/status.ts` – progress/status rules
- `src/lib/types.ts` – collection shapes: `users`, `courses`, `enrollments`, `workshops`, `progress`
