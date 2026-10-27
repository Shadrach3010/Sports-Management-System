"use client";

import { useActionState } from "react";

import { ActionMessage } from "@/components/ui/action-message";
import { SubmitButton } from "@/components/ui/submit-button";
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
}: {
  eventId: string;
  registrations: Registration[];
}) {
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
    <div className="grid gap-6 lg:grid-cols-2">
      <form
        action={tokenAction}
        className="space-y-4 rounded-xl border bg-surface p-5 shadow-sm"
      >
        <h2 className="font-semibold">QR token check-in</h2>
        <p className="text-sm text-muted">
          Paste a scanned opaque token. The token alone never approves an
          athlete.
        </p>
        <input type="hidden" name="eventId" value={eventId} />
        <label className="block text-xs font-medium">
          Opaque token
          <input
            className={inputClass}
            name="token"
            autoComplete="off"
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
        <SubmitButton idleLabel="Verify and check in" pendingLabel="Checking" />
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
          <select className={inputClass} name="registrationId" required>
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
          <textarea className={inputClass} name="reason" required />
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
        />
      </form>
    </div>
  );
}
