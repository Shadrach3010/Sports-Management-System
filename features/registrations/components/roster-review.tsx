"use client";

import { useActionState } from "react";

import { ActionMessage } from "@/components/ui/action-message";
import { SubmitButton } from "@/components/ui/submit-button";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  assignEventOfficialAction,
  decideLateChangeAction,
  lockRosterAction,
  reviewRosterAction,
  voidAttendanceAction,
} from "@/features/registrations/review-actions";
import { initialActionState } from "@/features/shared/action-state";

type Submission = {
  id: string;
  status: string;
  submitted_at: string | null;
  rejection_reason: string | null;
  event: { name: string; code: string } | null;
  house: { name: string; code: string } | null;
};
type LateRequest = {
  id: string;
  status: string;
  reason: string;
  requested_at: string;
  event: { name: string } | null;
  house: { name: string } | null;
  student: {
    student_number: string;
    legal_first_name: string;
    legal_last_name: string;
  } | null;
};
type Event = { id: string; name: string; code: string; roster_status: string };
type Official = { id: string; display_name: string; roles: string[] };
type Attendance = {
  id: string;
  method: string;
  checked_in_at: string;
  event: { name: string } | null;
  registration: {
    student: {
      student_number: string;
      legal_first_name: string;
      legal_last_name: string;
    } | null;
  } | null;
};
const inputClass =
  "mt-1 min-h-10 w-full rounded-md border bg-white px-3 py-2 text-sm";

function ReviewForm({ id }: { id: string }) {
  const [state, action] = useActionState(
    reviewRosterAction,
    initialActionState,
  );
  return (
    <form
      action={action}
      className="mt-3 grid gap-2 sm:grid-cols-[auto_1fr_auto]"
    >
      <input type="hidden" name="submissionId" value={id} />
      <select className={inputClass} name="decision">
        <option value="approved">Approve</option>
        <option value="rejected">Reject</option>
      </select>
      <input
        className={inputClass}
        name="reason"
        placeholder="Reason required for rejection"
      />
      <SubmitButton idleLabel="Record decision" pendingLabel="Saving" />
      <div className="sm:col-span-3">
        <ActionMessage state={state} />
      </div>
    </form>
  );
}
function LateDecision({ id }: { id: string }) {
  const [state, action] = useActionState(
    decideLateChangeAction,
    initialActionState,
  );
  return (
    <form
      action={action}
      className="mt-3 grid gap-2 sm:grid-cols-[auto_1fr_auto]"
    >
      <input type="hidden" name="requestId" value={id} />
      <select className={inputClass} name="approve">
        <option value="true">Approve</option>
        <option value="false">Reject</option>
      </select>
      <input
        className={inputClass}
        name="reason"
        placeholder="Independent decision reason"
        required
      />
      <SubmitButton idleLabel="Decide exception" pendingLabel="Saving" />
      <div className="sm:col-span-3">
        <ActionMessage state={state} />
      </div>
    </form>
  );
}
function LockForm({ event }: { event: Event }) {
  const [state, action] = useActionState(lockRosterAction, initialActionState);
  return (
    <form action={action}>
      <input type="hidden" name="eventId" value={event.id} />
      <SubmitButton
        idleLabel={
          event.roster_status === "locked" ? "Roster locked" : "Lock roster"
        }
        pendingLabel="Locking"
        disabled={event.roster_status === "locked"}
      />
      <ActionMessage state={state} />
    </form>
  );
}

function AttendanceCorrection({ attendance }: { attendance: Attendance }) {
  const [state, action] = useActionState(
    voidAttendanceAction,
    initialActionState,
  );
  return (
    <form action={action} className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
      <input type="hidden" name="attendanceId" value={attendance.id} />
      <input
        className={inputClass}
        name="reason"
        placeholder="Correction reason (required)"
        required
      />
      <SubmitButton idleLabel="Void check-in" pendingLabel="Recording" />
      <div className="sm:col-span-2">
        <ActionMessage state={state} />
      </div>
    </form>
  );
}

export function RosterReview({
  submissions,
  lateRequests,
  events,
  officials,
  attendance,
  canManageOfficials,
  canCorrectAttendance,
}: {
  submissions: Submission[];
  lateRequests: LateRequest[];
  events: Event[];
  officials: Official[];
  attendance: Attendance[];
  canManageOfficials: boolean;
  canCorrectAttendance: boolean;
}) {
  const [officialState, officialAction] = useActionState(
    assignEventOfficialAction,
    initialActionState,
  );
  return (
    <div className="space-y-8">
      <section>
        <h2 className="mb-3 text-lg font-semibold">Submitted house rosters</h2>
        {submissions.length ? (
          <div className="space-y-3">
            {submissions.map((submission) => (
              <article
                className="rounded-xl border bg-surface p-5 shadow-sm"
                key={submission.id}
              >
                <div className="flex flex-wrap justify-between gap-3">
                  <div>
                    <h3 className="font-semibold">{submission.event?.name}</h3>
                    <p className="text-sm text-muted">
                      {submission.house?.name}
                    </p>
                  </div>
                  <StatusBadge
                    tone={
                      submission.status === "approved"
                        ? "success"
                        : submission.status === "rejected"
                          ? "danger"
                          : "warning"
                    }
                  >
                    {submission.status}
                  </StatusBadge>
                </div>
                {submission.status === "submitted" ? (
                  <ReviewForm id={submission.id} />
                ) : submission.rejection_reason ? (
                  <p className="mt-2 text-sm text-muted">
                    {submission.rejection_reason}
                  </p>
                ) : null}
              </article>
            ))}
          </div>
        ) : (
          <p className="rounded-lg border bg-surface p-4 text-sm text-muted">
            No rosters are awaiting review.
          </p>
        )}
      </section>
      {canCorrectAttendance ? (
        <section>
          <h2 className="mb-3 text-lg font-semibold">Attendance corrections</h2>
          <p className="mb-3 text-sm text-muted">
            Voiding a check-in restores the approved registration state and
            preserves an immutable correction record. A check-in officer cannot
            approve their own correction.
          </p>
          {attendance.length ? (
            <div className="grid gap-3 md:grid-cols-2">
              {attendance.map((record) => {
                const student = record.registration?.student;
                return (
                  <article
                    className="rounded-xl border bg-surface p-5 shadow-sm"
                    key={record.id}
                  >
                    <h3 className="font-semibold">
                      {student?.legal_first_name} {student?.legal_last_name}
                    </h3>
                    <p className="text-sm text-muted">
                      {student?.student_number} · {record.event?.name} ·{" "}
                      {record.method}
                    </p>
                    <AttendanceCorrection attendance={record} />
                  </article>
                );
              })}
            </div>
          ) : (
            <p className="rounded-lg border bg-surface p-4 text-sm text-muted">
              No active attendance records require review.
            </p>
          )}
        </section>
      ) : null}
      <section>
        <h2 className="mb-3 text-lg font-semibold">Roster locking</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {events.map((event) => (
            <article
              className="flex items-center justify-between gap-3 rounded-lg border bg-surface p-4"
              key={event.id}
            >
              <div>
                <p className="font-medium">{event.name}</p>
                <p className="font-mono text-xs text-muted">{event.code}</p>
              </div>
              <LockForm event={event} />
            </article>
          ))}
        </div>
      </section>
      <section>
        <h2 className="mb-3 text-lg font-semibold">Late-change exceptions</h2>
        {lateRequests.length ? (
          <div className="space-y-3">
            {lateRequests.map((request) => (
              <article
                className="rounded-xl border border-amber-200 bg-amber-50 p-5"
                key={request.id}
              >
                <div className="flex justify-between gap-3">
                  <div>
                    <h3 className="font-semibold">
                      {request.student?.legal_first_name}{" "}
                      {request.student?.legal_last_name}
                    </h3>
                    <p className="text-sm text-muted">
                      {request.student?.student_number} · {request.house?.name}{" "}
                      · {request.event?.name}
                    </p>
                  </div>
                  <StatusBadge
                    tone={
                      request.status === "approved"
                        ? "success"
                        : request.status === "rejected"
                          ? "danger"
                          : "warning"
                    }
                  >
                    {request.status}
                  </StatusBadge>
                </div>
                <p className="mt-2 text-sm">Request reason: {request.reason}</p>
                {request.status === "pending" ? (
                  <LateDecision id={request.id} />
                ) : null}
              </article>
            ))}
          </div>
        ) : (
          <p className="rounded-lg border bg-surface p-4 text-sm text-muted">
            No late-change requests.
          </p>
        )}
      </section>
      {canManageOfficials ? (
        <section>
          <h2 className="mb-3 text-lg font-semibold">Assign event officials</h2>
          <form
            action={officialAction}
            className="grid gap-3 rounded-xl border bg-surface p-5 shadow-sm sm:grid-cols-3"
          >
            <label className="text-xs font-medium">
              Event
              <select className={inputClass} name="eventId">
                {events.map((event) => (
                  <option value={event.id} key={event.id}>
                    {event.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-medium">
              Official
              <select className={inputClass} name="userId">
                {officials.map((official) => (
                  <option value={official.id} key={official.id}>
                    {official.display_name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-medium">
              Assignment
              <select className={inputClass} name="role">
                <option value="check_in_officer">Check-in officer</option>
                <option value="event_judge">Event judge</option>
              </select>
            </label>
            <div className="sm:col-span-3">
              <ActionMessage state={officialState} />
              <SubmitButton
                idleLabel="Assign official"
                pendingLabel="Assigning"
              />
            </div>
          </form>
        </section>
      ) : null}
    </div>
  );
}
