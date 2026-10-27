"use client";

import { useActionState } from "react";

import { ActionMessage } from "@/components/ui/action-message";
import { SubmitButton } from "@/components/ui/submit-button";
import { verifyEligibilityAction } from "@/features/students/actions";
import { initialActionState } from "@/features/shared/action-state";

export function EligibilityForm({
  studentId,
  currentStatus,
}: {
  studentId: string;
  currentStatus: string;
}) {
  const [state, action] = useActionState(
    verifyEligibilityAction,
    initialActionState,
  );
  return (
    <form
      action={action}
      className="space-y-4 rounded-xl border bg-surface p-5 shadow-sm"
    >
      <input type="hidden" name="studentId" value={studentId} />
      <div>
        <h2 className="font-semibold">Eligibility verification</h2>
        <p className="mt-1 text-sm text-muted">
          Academic status does not determine competition eligibility. Record a
          separate decision here.
        </p>
      </div>
      <label className="block text-xs font-medium">
        Decision
        <select
          name="status"
          defaultValue={currentStatus}
          className="mt-1 min-h-10 w-full rounded-md border bg-white px-3 py-2 text-sm"
        >
          <option value="unverified">Unverified</option>
          <option value="eligible">Eligible</option>
          <option value="ineligible">Ineligible</option>
        </select>
      </label>
      <label className="block text-xs font-medium">
        Reason or note
        <textarea
          name="reason"
          rows={3}
          className="mt-1 w-full rounded-md border bg-white px-3 py-2 text-sm"
          placeholder="Required for an ineligible decision"
        />
      </label>
      <ActionMessage state={state} />
      <SubmitButton idleLabel="Record decision" pendingLabel="Recording" />
    </form>
  );
}
