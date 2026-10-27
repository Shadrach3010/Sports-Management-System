"use client";

import { useActionState } from "react";

import { ActionMessage } from "@/components/ui/action-message";
import { SubmitButton } from "@/components/ui/submit-button";
import { initialActionState } from "@/features/shared/action-state";
import { setStudentPublicationAction } from "@/features/students/actions";

export function PublicResultIdentityForm({
  studentId,
  publicName,
  consented,
}: {
  studentId: string;
  publicName: string;
  consented: boolean;
}) {
  const [state, action] = useActionState(
    setStudentPublicationAction,
    initialActionState,
  );
  return (
    <form
      action={action}
      className="space-y-4 rounded-xl border bg-surface p-5 shadow-sm"
    >
      <input type="hidden" name="studentId" value={studentId} />
      <div>
        <h2 className="font-semibold">Public result identity</h2>
        <p className="mt-1 text-sm leading-6 text-muted">
          Names appear publicly only after the college records the appropriate
          consent or publication authority. Otherwise results show “Name
          withheld.”
        </p>
      </div>
      <label className="block text-xs font-medium">
        Approved public name
        <input
          className="mt-1 min-h-10 w-full rounded-md border bg-white px-3 py-2 text-sm"
          defaultValue={publicName}
          name="publicName"
          placeholder="Name approved for publication"
        />
      </label>
      <label className="flex items-start gap-3 rounded-lg bg-surface-muted p-3 text-sm">
        <input
          className="mt-0.5 size-4"
          defaultChecked={consented}
          name="consent"
          type="checkbox"
        />
        <span>Publication authority has been verified and recorded.</span>
      </label>
      <ActionMessage state={state} />
      <SubmitButton
        idleLabel="Save publication decision"
        pendingLabel="Saving"
      />
    </form>
  );
}
