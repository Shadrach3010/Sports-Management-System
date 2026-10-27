"use client";

import Image from "next/image";
import { useActionState } from "react";

import { ActionMessage } from "@/components/ui/action-message";
import { SubmitButton } from "@/components/ui/submit-button";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  createTeamAction,
  issueQrPassAction,
  registerParticipantAction,
  requestLateAdditionAction,
  submitRosterAction,
  withdrawRegistrationAction,
} from "@/features/registrations/actions";
import {
  initialActionState,
  type ActionState,
} from "@/features/shared/action-state";

type Student = {
  id: string;
  student_number: string;
  legal_first_name: string;
  legal_last_name: string;
};
type Team = { id: string; name: string; status: string };
type Registration = {
  id: string;
  student_id: string;
  status: string;
  rejection_reason: string | null;
  student: {
    student_number: string;
    legal_first_name: string;
    legal_last_name: string;
  } | null;
  team: { name: string } | null;
};
const inputClass =
  "mt-1 min-h-10 w-full rounded-md border bg-white px-3 py-2 text-sm";

function PassIssuer({ registrationId }: { registrationId: string }) {
  const [state, action] = useActionState(issueQrPassAction, {
    status: "idle",
  } as ActionState<{ dataUrl: string; token: string }>);
  return (
    <form action={action} className="mt-2">
      <input type="hidden" name="registrationId" value={registrationId} />
      <SubmitButton
        idleLabel="Issue / rotate QR pass"
        pendingLabel="Generating"
      />
      <ActionMessage state={state} />
      {state.data ? (
        <div className="mt-3 rounded-lg border bg-white p-3 text-center">
          <Image
            className="mx-auto size-64"
            src={state.data.dataUrl}
            alt="Opaque athlete registration QR code"
            width={256}
            height={256}
            unoptimized
          />
          <p className="mt-2 break-all font-mono text-[10px] text-muted">
            Manual token: {state.data.token}
          </p>
        </div>
      ) : null}
    </form>
  );
}

function WithdrawEntry({
  registrationId,
  eventId,
}: {
  registrationId: string;
  eventId: string;
}) {
  const [state, action] = useActionState(
    withdrawRegistrationAction,
    initialActionState,
  );
  return (
    <form action={action} className="mt-2 flex flex-wrap items-end gap-2">
      <input type="hidden" name="registrationId" value={registrationId} />
      <input type="hidden" name="eventId" value={eventId} />
      <label className="text-xs font-medium">
        Withdrawal note
        <input className={inputClass} name="reason" />
      </label>
      <SubmitButton idleLabel="Withdraw entry" pendingLabel="Withdrawing" />
      <ActionMessage state={state} />
    </form>
  );
}

export function RegistrationWorkspace({
  eventId,
  houseId,
  eventType,
  rosterLocked,
  students,
  teams,
  registrations,
}: {
  eventId: string;
  houseId: string;
  eventType: string;
  rosterLocked: boolean;
  students: Student[];
  teams: Team[];
  registrations: Registration[];
}) {
  const [registerState, registerAction] = useActionState(
    registerParticipantAction,
    initialActionState,
  );
  const [teamState, teamAction] = useActionState(
    createTeamAction,
    initialActionState,
  );
  const [submitState, submitAction] = useActionState(
    submitRosterAction,
    initialActionState,
  );
  const [lateState, lateAction] = useActionState(
    requestLateAdditionAction,
    initialActionState,
  );
  const registrationForm = (
    <>
      <input type="hidden" name="eventId" value={eventId} />
      <label className="block text-xs font-medium">
        Eligible athlete
        <select className={inputClass} name="studentId" required>
          <option value="">Select an athlete</option>
          {students.map((student) => (
            <option value={student.id} key={student.id}>
              {student.student_number} — {student.legal_last_name},{" "}
              {student.legal_first_name}
            </option>
          ))}
        </select>
      </label>
      {eventType === "team" ? (
        <label className="block text-xs font-medium">
          Team
          <select className={inputClass} name="teamId" required>
            <option value="">Select team</option>
            {teams.map((team) => (
              <option value={team.id} key={team.id}>
                {team.name}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <input type="hidden" name="teamId" value="" />
      )}
    </>
  );
  return (
    <div className="space-y-7">
      <section className="grid gap-5 lg:grid-cols-2">
        {!rosterLocked ? (
          <form
            action={registerAction}
            className="space-y-3 rounded-xl border bg-surface p-5 shadow-sm"
          >
            <h2 className="font-semibold">Add athlete to draft roster</h2>
            {registrationForm}
            <ActionMessage state={registerState} />
            <SubmitButton idleLabel="Add athlete" pendingLabel="Adding" />
          </form>
        ) : (
          <form
            action={lateAction}
            className="space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-5"
          >
            <h2 className="font-semibold">Request a late addition</h2>
            {registrationForm}
            <label className="block text-xs font-medium">
              Exception reason
              <textarea className={inputClass} name="reason" required />
            </label>
            <ActionMessage state={lateState} />
            <SubmitButton
              idleLabel="Submit exception request"
              pendingLabel="Submitting"
            />
          </form>
        )}
        {eventType === "team" && !rosterLocked ? (
          <form
            action={teamAction}
            className="space-y-3 rounded-xl border bg-surface p-5 shadow-sm"
          >
            <h2 className="font-semibold">Create house team</h2>
            <input type="hidden" name="eventId" value={eventId} />
            <label className="block text-xs font-medium">
              Team name
              <input className={inputClass} name="name" required />
            </label>
            <ActionMessage state={teamState} />
            <SubmitButton idleLabel="Create team" pendingLabel="Creating" />
          </form>
        ) : null}
      </section>
      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">House roster</h2>
          {!rosterLocked ? (
            <form action={submitAction}>
              <input type="hidden" name="eventId" value={eventId} />
              <input type="hidden" name="houseId" value={houseId} />
              <SubmitButton
                idleLabel="Submit roster for review"
                pendingLabel="Submitting"
              />
              <ActionMessage state={submitState} />
            </form>
          ) : (
            <StatusBadge tone="warning">Roster locked</StatusBadge>
          )}
        </div>
        {registrations.length ? (
          <div className="grid gap-3 lg:grid-cols-2">
            {registrations.map((registration) => (
              <article
                className="rounded-lg border bg-surface p-4"
                key={registration.id}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">
                      {registration.student?.legal_first_name}{" "}
                      {registration.student?.legal_last_name}
                    </p>
                    <p className="font-mono text-xs text-muted">
                      {registration.student?.student_number}
                    </p>
                    {registration.team ? (
                      <p className="mt-1 text-xs text-muted">
                        Team: {registration.team.name}
                      </p>
                    ) : null}
                  </div>
                  <StatusBadge
                    tone={
                      registration.status === "approved" ||
                      registration.status === "checked_in"
                        ? "success"
                        : registration.status === "rejected"
                          ? "danger"
                          : "neutral"
                    }
                  >
                    {registration.status}
                  </StatusBadge>
                </div>
                {registration.rejection_reason ? (
                  <p className="mt-3 text-sm text-red-800">
                    Reason: {registration.rejection_reason}
                  </p>
                ) : null}
                {!rosterLocked &&
                ["draft", "submitted", "rejected"].includes(
                  registration.status,
                ) ? (
                  <WithdrawEntry
                    registrationId={registration.id}
                    eventId={eventId}
                  />
                ) : null}
                {registration.status === "approved" ||
                registration.status === "checked_in" ? (
                  <PassIssuer registrationId={registration.id} />
                ) : null}
              </article>
            ))}
          </div>
        ) : (
          <p className="rounded-lg border bg-surface p-4 text-sm text-muted">
            No athletes have been added.
          </p>
        )}
      </section>
    </div>
  );
}
