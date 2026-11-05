"use client";

import { useActionState } from "react";
import { Pencil, Power, PowerOff, Trash2, X } from "lucide-react";

import { ActionMessage } from "@/components/ui/action-message";
import { SubmitButton } from "@/components/ui/submit-button";
import { initialActionState } from "@/features/shared/action-state";
import { manageStaffUserAction } from "@/features/users/actions";
import { applicationRoles } from "@/lib/auth/roles";

type Scope = { id: string; name: string; code: string };
type Account = {
  id: string;
  email: string;
  display_name: string;
  is_active: boolean;
};
type Assignment = {
  role: string;
  house_id: string | null;
  event_id: string | null;
};
type Operation = "edit" | "activate" | "deactivate" | "archive";
const inputClass =
  "mt-1 min-h-11 w-full rounded-xl border border-slate-200 bg-white/85 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-200";

function AccountForm({
  account,
  assignment,
  houses,
  events,
  operation,
}: {
  account: Account;
  assignment: Assignment | null;
  houses: Scope[];
  events: Scope[];
  operation: Operation;
}) {
  const [state, action] = useActionState(
    manageStaffUserAction,
    initialActionState,
  );
  const destructive = operation === "archive";
  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="targetId" value={account.id} />
      <input type="hidden" name="operation" value={operation} />
      {operation === "edit" ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-xs font-bold text-slate-700">
            Name
            <input
              className={inputClass}
              name="displayName"
              defaultValue={account.display_name}
              required
            />
          </label>
          <label className="text-xs font-bold text-slate-700">
            Email
            <input
              className={inputClass}
              name="email"
              type="email"
              defaultValue={account.email}
              required
            />
          </label>
          <label className="text-xs font-bold text-slate-700">
            Role
            <select
              className={inputClass}
              name="role"
              defaultValue={assignment?.role ?? "public_viewer"}
            >
              {applicationRoles.map((role) => (
                <option key={role} value={role}>
                  {role.replaceAll("_", " ")}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-bold text-slate-700">
            House scope
            <select
              className={inputClass}
              name="houseId"
              defaultValue={assignment?.house_id ?? ""}
            >
              <option value="">None</option>
              {houses.map((house) => (
                <option key={house.id} value={house.id}>
                  {house.code} · {house.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-bold text-slate-700">
            Event scope
            <select
              className={inputClass}
              name="eventId"
              defaultValue={assignment?.event_id ?? ""}
            >
              <option value="">None</option>
              {events.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.code} · {event.name}
                </option>
              ))}
            </select>
          </label>
          <p className="self-end text-xs leading-5 text-slate-600">
            House representatives need a house. Event judges need an event.
            Global roles use neither scope.
          </p>
        </div>
      ) : (
        <div
          className={`rounded-xl border p-4 text-sm ${destructive ? "border-red-200 bg-red-50/80 text-red-900" : "border-slate-200 bg-white/70 text-slate-700"}`}
        >
          {operation === "archive"
            ? "Remove this account from the active directory? Its audit history will be retained."
            : operation === "deactivate"
              ? "Deactivate this account and revoke its active sessions?"
              : "Reactivate this account?"}
        </div>
      )}
      {destructive ? (
        <label className="flex items-start gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            name="confirmArchive"
            required
            className="mt-1"
          />
          I understand this removes the account from the active directory.
        </label>
      ) : null}
      <ActionMessage state={state} />
      <SubmitButton
        idleLabel={
          operation === "edit"
            ? "Save changes"
            : operation === "archive"
              ? "Delete account"
              : operation === "activate"
                ? "Activate account"
                : "Deactivate account"
        }
        pendingLabel="Saving"
      />
    </form>
  );
}

function AccountPopover({
  account,
  assignment,
  houses,
  events,
  operation,
}: {
  account: Account;
  assignment: Assignment | null;
  houses: Scope[];
  events: Scope[];
  operation: Operation;
}) {
  const id = `account-${account.id}-${operation}`;
  const title =
    operation === "edit"
      ? "Edit user account"
      : operation === "archive"
        ? "Delete user account"
        : operation === "activate"
          ? "Activate user account"
          : "Deactivate user account";
  const icon =
    operation === "edit" ? (
      <Pencil size={17} aria-hidden="true" />
    ) : operation === "archive" ? (
      <Trash2 size={17} aria-hidden="true" />
    ) : operation === "activate" ? (
      <Power size={17} aria-hidden="true" />
    ) : (
      <PowerOff size={17} aria-hidden="true" />
    );
  const label =
    operation === "edit"
      ? "Edit"
      : operation === "archive"
        ? "Delete"
        : operation === "activate"
          ? "Activate"
          : "Deactivate";
  return (
    <>
      <button
        type="button"
        popoverTarget={id}
        title={`${label} account`}
        aria-label={`${label} ${account.display_name}`}
        className={`rounded-xl border border-slate-200 bg-white/80 p-2 text-slate-700 transition hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-orange-500 ${operation === "archive" ? "hover:border-red-300 hover:bg-red-50 hover:text-red-700" : "hover:border-orange-300 hover:bg-orange-50 hover:text-orange-700"}`}
      >
        {icon}
      </button>
      <div
        id={id}
        popover="auto"
        role="dialog"
        aria-label={title}
        className="glass-card fixed inset-0 m-auto w-[min(92vw,42rem)] max-h-[88vh] overflow-y-auto rounded-3xl p-6 text-slate-900 shadow-2xl backdrop:bg-slate-950/65 backdrop:backdrop-blur-sm sm:p-8"
      >
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="section-kicker">Account management</p>
            <h2 className="mt-1 text-2xl font-black tracking-tight">{title}</h2>
            <p className="mt-1 text-sm text-slate-600">
              {account.display_name} · {account.email}
            </p>
          </div>
          <button
            type="button"
            popoverTarget={id}
            popoverTargetAction="hide"
            aria-label="Close dialog"
            className="rounded-xl border border-white/80 bg-white/70 p-2 transition hover:bg-white"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>
        <AccountForm
          account={account}
          assignment={assignment}
          houses={houses}
          events={events}
          operation={operation}
        />
      </div>
    </>
  );
}

export function StaffAccountControls({
  account,
  assignment,
  houses,
  events,
}: {
  account: Account;
  assignment: Assignment | null;
  houses: Scope[];
  events: Scope[];
}) {
  const statusOperation = account.is_active ? "deactivate" : "activate";
  return (
    <div
      className="mt-3 flex items-center gap-1"
      aria-label={`Actions for ${account.display_name}`}
    >
      <AccountPopover
        account={account}
        assignment={assignment}
        houses={houses}
        events={events}
        operation="edit"
      />
      <AccountPopover
        account={account}
        assignment={assignment}
        houses={houses}
        events={events}
        operation={statusOperation}
      />
      <AccountPopover
        account={account}
        assignment={assignment}
        houses={houses}
        events={events}
        operation="archive"
      />
    </div>
  );
}
