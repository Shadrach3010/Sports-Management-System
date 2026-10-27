"use client";

import Link from "next/link";
import { useActionState } from "react";

import { ActionMessage } from "@/components/ui/action-message";
import { SubmitButton } from "@/components/ui/submit-button";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  createMeetAction,
  transitionMeetAction,
} from "@/features/meets/actions";
import { initialActionState } from "@/features/shared/action-state";

export type MeetSummary = {
  id: string;
  name: string;
  year: number;
  starts_on: string;
  ends_on: string;
  registration_opens_at: string | null;
  registration_closes_at: string | null;
  status: string;
};
const inputClass =
  "mt-1 min-h-10 w-full rounded-md border bg-white px-3 py-2 text-sm";

function MeetStatusForm({ meet }: { meet: MeetSummary }) {
  const [state, action] = useActionState(
    transitionMeetAction,
    initialActionState,
  );
  const transitions: Record<string, string[]> = {
    draft: ["registration_open", "cancelled"],
    registration_open: ["registration_closed", "cancelled"],
    registration_closed: ["in_progress", "cancelled"],
    in_progress: ["completed", "cancelled"],
    completed: ["archived"],
  };
  const choices = transitions[meet.status] ?? [];
  if (!choices.length) return null;
  return (
    <form action={action} className="mt-4 flex flex-wrap items-end gap-2">
      <input type="hidden" name="id" value={meet.id} />
      <label className="text-xs font-medium">
        Next status
        <select className={inputClass} name="status">
          {choices.map((status) => (
            <option value={status} key={status}>
              {status.replaceAll("_", " ")}
            </option>
          ))}
        </select>
      </label>
      <SubmitButton idleLabel="Apply" pendingLabel="Updating" />
      <ActionMessage state={state} />
    </form>
  );
}

export function MeetManager({ meets }: { meets: MeetSummary[] }) {
  const [state, action] = useActionState(createMeetAction, initialActionState);
  return (
    <div className="grid gap-6 xl:grid-cols-[22rem_1fr]">
      <form
        action={action}
        className="h-fit space-y-4 rounded-xl border bg-surface p-5 shadow-sm"
      >
        <h2 className="font-semibold">Create sports meet</h2>
        <label className="block text-xs font-medium">
          Meet name
          <input className={inputClass} name="name" required />
        </label>
        <label className="block text-xs font-medium">
          Year
          <input
            className={inputClass}
            name="year"
            type="number"
            defaultValue="2026"
            required
          />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="text-xs font-medium">
            Start date
            <input
              className={inputClass}
              name="startsOn"
              type="date"
              required
            />
          </label>
          <label className="text-xs font-medium">
            End date
            <input className={inputClass} name="endsOn" type="date" required />
          </label>
        </div>
        <label className="block text-xs font-medium">
          Registration opens
          <input
            className={inputClass}
            name="registrationOpensAt"
            type="datetime-local"
            required
          />
        </label>
        <label className="block text-xs font-medium">
          Registration closes
          <input
            className={inputClass}
            name="registrationClosesAt"
            type="datetime-local"
            required
          />
        </label>
        <ActionMessage state={state} />
        <SubmitButton idleLabel="Create draft meet" pendingLabel="Creating" />
      </form>
      <div className="space-y-4">
        {meets.length ? (
          meets.map((meet) => (
            <article
              className="rounded-xl border bg-surface p-5 shadow-sm"
              key={meet.id}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold">{meet.name}</h2>
                  <p className="mt-1 text-sm text-muted">
                    {meet.starts_on} to {meet.ends_on}
                  </p>
                </div>
                <StatusBadge
                  tone={
                    meet.status === "cancelled"
                      ? "danger"
                      : meet.status === "registration_open"
                        ? "success"
                        : "neutral"
                  }
                >
                  {meet.status.replaceAll("_", " ")}
                </StatusBadge>
              </div>
              <div className="mt-4">
                <Link
                  className="text-sm font-semibold text-primary underline"
                  href={`/admin/meets/${meet.id}`}
                >
                  Configure houses and events
                </Link>
              </div>
              <MeetStatusForm meet={meet} />
            </article>
          ))
        ) : (
          <p className="rounded-xl border bg-surface p-6 text-sm text-muted">
            No sports meets have been configured.
          </p>
        )}
      </div>
    </div>
  );
}
