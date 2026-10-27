"use client";

import { useActionState } from "react";
import { ActionMessage } from "@/components/ui/action-message";
import { SubmitButton } from "@/components/ui/submit-button";
import { updateMeetAction } from "@/features/meets/actions";
import { initialActionState } from "@/features/shared/action-state";

type Meet = {
  id: string;
  name: string;
  year: number;
  status: string;
  starts_on: string;
  ends_on: string;
  registration_opens_at: string | null;
  registration_closes_at: string | null;
};
const inputClass =
  "mt-1 min-h-10 w-full rounded-md border bg-white px-3 py-2 text-sm";
function localDateTime(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}

export function MeetSettings({ meet }: { meet: Meet }) {
  const [state, action] = useActionState(updateMeetAction, initialActionState);
  if (meet.status !== "draft")
    return (
      <p className="rounded-lg border bg-surface-muted p-4 text-sm text-muted">
        Meet dates and registration windows are locked after registration opens.
      </p>
    );
  return (
    <form
      action={action}
      className="grid gap-3 rounded-xl border bg-surface p-5 shadow-sm sm:grid-cols-2"
    >
      <h2 className="font-semibold sm:col-span-2">Meet configuration</h2>
      <input type="hidden" name="id" value={meet.id} />
      <label className="text-xs font-medium">
        Name
        <input
          className={inputClass}
          name="name"
          defaultValue={meet.name}
          required
        />
      </label>
      <label className="text-xs font-medium">
        Year
        <input
          className={inputClass}
          name="year"
          type="number"
          defaultValue={meet.year}
          required
        />
      </label>
      <label className="text-xs font-medium">
        Starts
        <input
          className={inputClass}
          name="startsOn"
          type="date"
          defaultValue={meet.starts_on}
          required
        />
      </label>
      <label className="text-xs font-medium">
        Ends
        <input
          className={inputClass}
          name="endsOn"
          type="date"
          defaultValue={meet.ends_on}
          required
        />
      </label>
      <label className="text-xs font-medium">
        Registration opens
        <input
          className={inputClass}
          name="registrationOpensAt"
          type="datetime-local"
          defaultValue={localDateTime(meet.registration_opens_at)}
          required
        />
      </label>
      <label className="text-xs font-medium">
        Registration closes
        <input
          className={inputClass}
          name="registrationClosesAt"
          type="datetime-local"
          defaultValue={localDateTime(meet.registration_closes_at)}
          required
        />
      </label>
      <div className="sm:col-span-2">
        <ActionMessage state={state} />
        <SubmitButton idleLabel="Save configuration" pendingLabel="Saving" />
      </div>
    </form>
  );
}
