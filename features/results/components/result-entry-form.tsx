"use client";

import { useActionState } from "react";

import { ActionMessage } from "@/components/ui/action-message";
import { SubmitButton } from "@/components/ui/submit-button";
import { saveResultAction } from "@/features/results/actions";
import { initialActionState } from "@/features/shared/action-state";

type Entrant = { id: string; label: string; kind: "registration" | "team" };
const inputClass =
  "mt-1 min-h-10 w-full rounded-md border bg-white px-3 py-2 text-sm";

export function ResultEntryForm({
  eventId,
  entrants,
}: {
  eventId: string;
  entrants: Entrant[];
}) {
  const [state, action] = useActionState(saveResultAction, initialActionState);
  return (
    <form
      action={action}
      className="grid gap-4 rounded-xl border bg-surface p-5 shadow-sm md:grid-cols-3"
    >
      <input type="hidden" name="eventId" value={eventId} />
      <label className="text-xs font-medium md:col-span-2">
        Checked-in participant or approved team
        <select className={inputClass} name="entrant" required>
          <option value="">Select an entrant</option>
          {entrants.map((entrant) => (
            <option
              key={`${entrant.kind}:${entrant.id}`}
              value={`${entrant.kind}:${entrant.id}`}
            >
              {entrant.label}
            </option>
          ))}
        </select>
      </label>
      <label className="text-xs font-medium">
        Outcome
        <select className={inputClass} name="outcome" defaultValue="ranked">
          <option value="ranked">Ranked</option>
          <option value="did_not_start">Did not start</option>
          <option value="did_not_finish">Did not finish</option>
          <option value="disqualified">Disqualified</option>
          <option value="withdrawn">Withdrawn</option>
          <option value="abandoned">Abandoned</option>
        </select>
      </label>
      <label className="text-xs font-medium">
        Placement
        <input className={inputClass} name="placement" type="number" min="1" />
      </label>
      <label className="text-xs font-medium">
        Time (milliseconds)
        <input
          className={inputClass}
          name="timeMilliseconds"
          type="number"
          min="1"
        />
      </label>
      <label className="text-xs font-medium">
        Distance (millimetres)
        <input
          className={inputClass}
          name="distanceMillimetres"
          type="number"
          min="1"
        />
      </label>
      <label className="text-xs font-medium">
        Height (millimetres)
        <input
          className={inputClass}
          name="heightMillimetres"
          type="number"
          min="1"
        />
      </label>
      <label className="text-xs font-medium">
        Score
        <input
          className={inputClass}
          name="performanceScore"
          type="number"
          step="0.0001"
        />
      </label>
      <label className="text-xs font-medium">
        Tie group
        <input
          className={inputClass}
          name="tieGroup"
          placeholder="Only when rules permit a tie"
        />
      </label>
      <label className="text-xs font-medium md:col-span-3">
        Anomaly / review note
        <textarea
          className={inputClass}
          name="anomalyNote"
          rows={2}
          placeholder="Flag unusual values for human review without alleging misconduct"
        />
      </label>
      <div className="flex flex-wrap gap-2 md:col-span-3">
        <SubmitButton
          idleLabel="Save draft"
          pendingLabel="Saving"
          name="intent"
          value="draft"
        />
        <SubmitButton
          idleLabel="Submit for verification"
          pendingLabel="Submitting"
          name="intent"
          value="submit"
        />
      </div>
      <div className="md:col-span-3">
        <ActionMessage state={state} />
      </div>
    </form>
  );
}
