"use client";

import { useActionState, useCallback, useState } from "react";

import { ActionMessage } from "@/components/ui/action-message";
import { SubmitButton } from "@/components/ui/submit-button";
import { QrCameraScanner } from "@/features/check-in/components/qr-camera-scanner";
import {
  manualCheckInAction,
  tokenCheckInAction,
} from "@/features/check-in/actions";
import {
  initialActionState,
  type ActionState,
} from "@/features/shared/action-state";

type Registration = {
  id: string;
  student: {
    student_number: string;
    legal_first_name: string;
    legal_last_name: string;
  } | null;
  house: { name: string } | null;
};
const inputClass =
  "mt-1 min-h-10 w-full rounded-md border bg-white px-3 py-2 text-sm";

export function CheckInPanel({
  eventId,
  registrations,
  eventStatus,
}: {
  eventId: string;
  registrations: Registration[];
  eventStatus: string;
}) {
  const [token, setToken] = useState("");
  const onScan = useCallback((value: string) => setToken(value), []);
  const checkInOpen = eventStatus === "check_in_open";
  const [tokenState, tokenAction] = useActionState(tokenCheckInAction, {
    status: "idle",
  } as ActionState<{
    studentNumber: string;
    displayName: string;
    houseName: string;
  }>);
  const [manualState, manualAction] = useActionState(
    manualCheckInAction,
    initialActionState,
  );
  return (
    <div className="space-y-5">
      {!checkInOpen ? (
        <div
          role="status"
          className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950"
        >
          <strong>Check-in is not open.</strong> This event is currently{" "}
          {eventStatus.replaceAll("_", " ")}. A meet manager must lock the
          approved roster and move the event to “check-in open” before QR or
          manual attendance can be recorded.
        </div>
      ) : null}
      {checkInOpen && registrations.length === 0 ? (
        <div
          role="status"
          className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700"
        >
          No approved athlete entries are available for this event. Review and
          approve a submitted roster first.
        </div>
      ) : null}
      <div className="grid gap-6 lg:grid-cols-2">
        <form
          action={tokenAction}
          className="space-y-4 rounded-xl border bg-surface p-5 shadow-sm"
        >
          <h2 className="font-semibold">QR token check-in</h2>
          <p className="text-sm text-muted">
            Scan the athlete pass with a camera or enter its opaque token.
            Confirm the person against the approved entry before recording
            attendance.
          </p>
          <input type="hidden" name="eventId" value={eventId} />
          <QrCameraScanner onScan={onScan} disabled={!checkInOpen} />
          <label className="block text-xs font-medium">
            Opaque token
            <input
              className={inputClass}
              name="token"
              value={token}
              onChange={(event) => setToken(event.target.value)}
              autoComplete="off"
              disabled={!checkInOpen}
              required
            />
          </label>
          <label className="flex items-start gap-2 text-sm">
            <input
              className="mt-1"
              name="identityConfirmed"
              type="checkbox"
              value="true"
              required
            />
            <span>
              I physically confirmed the athlete against the approved entry.
            </span>
          </label>
          <ActionMessage state={tokenState} />
          {tokenState.data ? (
            <div className="rounded-lg bg-emerald-50 p-4 text-sm">
              <p className="font-semibold">{tokenState.data.displayName}</p>
              <p>
                {tokenState.data.studentNumber} · {tokenState.data.houseName}
              </p>
            </div>
          ) : null}
          <SubmitButton
            idleLabel="Verify and check in"
            pendingLabel="Checking"
            disabled={!checkInOpen}
          />
        </form>
        <form
          action={manualAction}
          className="space-y-4 rounded-xl border bg-surface p-5 shadow-sm"
        >
          <h2 className="font-semibold">Secure manual fallback</h2>
          <p className="text-sm text-muted">
            Use only when camera scanning or the printed pass is unavailable.
          </p>
          <input type="hidden" name="eventId" value={eventId} />
          <label className="block text-xs font-medium">
            Approved athlete
            <select
              className={inputClass}
              name="registrationId"
              disabled={!checkInOpen || registrations.length === 0}
              required
            >
              <option value="">Select</option>
              {registrations.map((registration) => (
                <option value={registration.id} key={registration.id}>
                  {registration.student?.student_number} —{" "}
                  {registration.student?.legal_last_name},{" "}
                  {registration.student?.legal_first_name} (
                  {registration.house?.name})
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs font-medium">
            Fallback reason
            <textarea
              className={inputClass}
              name="reason"
              disabled={!checkInOpen || registrations.length === 0}
              required
            />
          </label>
          <label className="flex items-start gap-2 text-sm">
            <input
              className="mt-1"
              name="identityConfirmed"
              type="checkbox"
              value="true"
              required
            />
            <span>
              I physically confirmed the athlete against the approved entry.
            </span>
          </label>
          <ActionMessage state={manualState} />
          <SubmitButton
            idleLabel="Record manual check-in"
            pendingLabel="Recording"
            disabled={!checkInOpen || registrations.length === 0}
          />
        </form>
      </div>
    </div>
  );
}
