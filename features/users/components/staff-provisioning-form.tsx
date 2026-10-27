"use client";

import { useActionState } from "react";

import { ActionMessage } from "@/components/ui/action-message";
import { SubmitButton } from "@/components/ui/submit-button";
import { initialActionState } from "@/features/shared/action-state";
import { provisionStaffUserAction } from "@/features/users/actions";
import { applicationRoles } from "@/lib/auth/roles";

const inputClass =
  "mt-1 min-h-11 w-full rounded-lg border bg-white px-3 py-2 text-sm";

export function StaffProvisioningForm({
  houses,
  events,
}: {
  houses: { id: string; code: string; name: string }[];
  events: { id: string; code: string; name: string }[];
}) {
  const [state, action] = useActionState(
    provisionStaffUserAction,
    initialActionState,
  );
  return (
    <form
      action={action}
      className="grid gap-4 rounded-2xl border bg-surface p-5 shadow-sm md:grid-cols-2 xl:grid-cols-3"
    >
      <div className="md:col-span-2 xl:col-span-3">
        <p className="section-kicker">Controlled provisioning</p>
        <h2 className="mt-1 text-xl font-black">Add staff access</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
          Create the identity in Supabase Auth first. This form adds only the
          application profile and an explicit role; it never handles passwords.
        </p>
      </div>
      <label className="text-xs font-bold uppercase tracking-wider text-muted">
        Supabase Auth user UUID
        <input className={inputClass} name="userId" required />
      </label>
      <label className="text-xs font-bold uppercase tracking-wider text-muted">
        Display name
        <input className={inputClass} name="displayName" required />
      </label>
      <label className="text-xs font-bold uppercase tracking-wider text-muted">
        Role
        <select className={inputClass} name="role">
          {applicationRoles.map((role) => (
            <option key={role} value={role}>
              {role.replaceAll("_", " ")}
            </option>
          ))}
        </select>
      </label>
      <label className="text-xs font-bold uppercase tracking-wider text-muted">
        House scope (representatives only)
        <select className={inputClass} name="houseId">
          <option value="">No house scope</option>
          {houses.map((house) => (
            <option key={house.id} value={house.id}>
              {house.code} · {house.name}
            </option>
          ))}
        </select>
      </label>
      <label className="text-xs font-bold uppercase tracking-wider text-muted">
        Event scope (judges only)
        <select className={inputClass} name="eventId">
          <option value="">No event scope</option>
          {events.map((event) => (
            <option key={event.id} value={event.id}>
              {event.code} · {event.name}
            </option>
          ))}
        </select>
      </label>
      <label className="text-xs font-bold uppercase tracking-wider text-muted">
        Optional expiry
        <input className={inputClass} name="expiresAt" type="datetime-local" />
      </label>
      <div className="md:col-span-2 xl:col-span-3">
        <SubmitButton
          idleLabel="Provision access"
          pendingLabel="Provisioning"
        />
        <ActionMessage state={state} />
      </div>
    </form>
  );
}
