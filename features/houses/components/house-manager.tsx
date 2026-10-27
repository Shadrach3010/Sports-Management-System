"use client";

import { useActionState } from "react";

import { ActionMessage } from "@/components/ui/action-message";
import { SubmitButton } from "@/components/ui/submit-button";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  createHouseAction,
  setHouseStatusAction,
  updateHouseAction,
} from "@/features/houses/actions";
import { initialActionState } from "@/features/shared/action-state";

export type HouseSummary = {
  id: string;
  name: string;
  code: string;
  officialColor: string | null;
  isActive: boolean;
  studentCount: number;
};

const inputClass =
  "min-h-10 w-full rounded-md border bg-white px-3 py-2 text-sm";

function HouseRow({ house }: { house: HouseSummary }) {
  const [editState, editAction] = useActionState(
    updateHouseAction,
    initialActionState,
  );
  const [statusState, statusAction] = useActionState(
    setHouseStatusAction,
    initialActionState,
  );
  return (
    <article className="rounded-xl border bg-surface p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            className="size-5 rounded-full border"
            style={{ backgroundColor: house.officialColor ?? "#EEF1F5" }}
            aria-label={
              house.officialColor
                ? `Official color ${house.officialColor}`
                : "No official color"
            }
          />
          <div>
            <h2 className="font-semibold">{house.name}</h2>
            <p className="text-xs text-muted">
              {house.code} · {house.studentCount}{" "}
              {house.studentCount === 1 ? "student" : "students"}
            </p>
          </div>
        </div>
        <StatusBadge tone={house.isActive ? "success" : "neutral"}>
          {house.isActive ? "Active" : "Inactive"}
        </StatusBadge>
      </div>
      <details className="mt-4 border-t pt-4">
        <summary className="cursor-pointer text-sm font-semibold text-primary">
          Edit house
        </summary>
        <form action={editAction} className="mt-4 grid gap-3 sm:grid-cols-3">
          <input type="hidden" name="id" value={house.id} />
          <label className="text-xs font-medium">
            Name
            <input
              className={`${inputClass} mt-1`}
              name="name"
              defaultValue={house.name}
              required
            />
          </label>
          <label className="text-xs font-medium">
            Code
            <input
              className={`${inputClass} mt-1`}
              name="code"
              defaultValue={house.code}
              required
            />
          </label>
          <label className="text-xs font-medium">
            Official color
            <input
              className={`${inputClass} mt-1`}
              name="officialColor"
              defaultValue={house.officialColor ?? ""}
              placeholder="#173B66"
            />
          </label>
          <div className="sm:col-span-3">
            <ActionMessage state={editState} />
          </div>
          <div className="sm:col-span-3">
            <SubmitButton idleLabel="Save changes" pendingLabel="Saving" />
          </div>
        </form>
      </details>
      <form
        action={statusAction}
        className="mt-4 flex flex-wrap items-center gap-3 border-t pt-4"
      >
        <input type="hidden" name="id" value={house.id} />
        <input type="hidden" name="isActive" value={String(!house.isActive)} />
        <SubmitButton
          idleLabel={house.isActive ? "Deactivate" : "Activate"}
          pendingLabel="Updating"
        />
        <ActionMessage state={statusState} />
      </form>
    </article>
  );
}

export function HouseManager({ houses }: { houses: HouseSummary[] }) {
  const [createState, createAction] = useActionState(
    createHouseAction,
    initialActionState,
  );
  return (
    <div className="space-y-6">
      <section className="rounded-xl border bg-surface p-5 shadow-sm">
        <h2 className="font-semibold">Create a house</h2>
        <p className="mt-1 text-sm text-muted">
          Names and codes must be unique. Official color is optional.
        </p>
        <form action={createAction} className="mt-4 grid gap-3 sm:grid-cols-3">
          <label className="text-xs font-medium">
            Name
            <input className={`${inputClass} mt-1`} name="name" required />
          </label>
          <label className="text-xs font-medium">
            Code
            <input className={`${inputClass} mt-1`} name="code" required />
          </label>
          <label className="text-xs font-medium">
            Official color
            <input
              className={`${inputClass} mt-1`}
              name="officialColor"
              placeholder="#173B66"
            />
          </label>
          <div className="sm:col-span-3">
            <ActionMessage state={createState} />
          </div>
          <div className="sm:col-span-3">
            <SubmitButton idleLabel="Create house" pendingLabel="Creating" />
          </div>
        </form>
      </section>
      <section className="grid gap-4 xl:grid-cols-2">
        {houses.map((house) => (
          <HouseRow key={house.id} house={house} />
        ))}
      </section>
    </div>
  );
}
