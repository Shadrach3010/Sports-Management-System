import { CircleAlert, CircleCheck } from "lucide-react";

import type { ActionState } from "@/features/shared/action-state";

export function ActionMessage({ state }: { state: ActionState<unknown> }) {
  if (state.status === "idle" || !state.message) return null;
  const success = state.status === "success";
  return (
    <div
      role={success ? "status" : "alert"}
      className={
        success
          ? "flex gap-2 rounded-md bg-emerald-50 p-3 text-sm text-emerald-900"
          : "flex gap-2 rounded-md bg-red-50 p-3 text-sm text-red-900"
      }
    >
      {success ? (
        <CircleCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      ) : (
        <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      )}
      <span>{state.message}</span>
    </div>
  );
}
