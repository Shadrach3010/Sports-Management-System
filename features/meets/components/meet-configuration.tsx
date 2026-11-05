"use client";

import { useActionState } from "react";

import { ActionMessage } from "@/components/ui/action-message";
import { SubmitButton } from "@/components/ui/submit-button";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  createCategoryAction,
  createEventAction,
  setEventRegistrationAction,
  setMeetHouseAction,
  transitionEventAction,
} from "@/features/meets/actions";
import { initialActionState } from "@/features/shared/action-state";

type House = { id: string; name: string; code: string; participating: boolean };
type Category = { id: string; name: string; code: string };
type Event = {
  id: string;
  code: string;
  name: string;
  event_type: string;
  format_code: string | null;
  registration_status: string;
  roster_status: string;
  status: string;
  starts_at: string | null;
  maximum_participants_per_house: number | null;
};
const inputClass =
  "mt-1 min-h-10 w-full rounded-md border bg-white px-3 py-2 text-sm";

function HouseToggle({ meetId, house }: { meetId: string; house: House }) {
  const [state, action] = useActionState(
    setMeetHouseAction,
    initialActionState,
  );
  return (
    <form action={action} className="rounded-lg border p-3">
      <input type="hidden" name="meetId" value={meetId} />
      <input type="hidden" name="houseId" value={house.id} />
      <input type="hidden" name="active" value={String(!house.participating)} />
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium">
          {house.name} ({house.code})
        </span>
        <SubmitButton
          idleLabel={house.participating ? "Remove" : "Add"}
          pendingLabel="Saving"
        />
      </div>
      <ActionMessage state={state} />
    </form>
  );
}

function EventRegistration({
  meetId,
  event,
}: {
  meetId: string;
  event: Event;
}) {
  const [state, action] = useActionState(
    setEventRegistrationAction,
    initialActionState,
  );
  return (
    <form action={action} className="mt-3">
      <input type="hidden" name="id" value={event.id} />
      <input type="hidden" name="meetId" value={meetId} />
      <input
        type="hidden"
        name="status"
        value={event.registration_status === "open" ? "closed" : "open"}
      />
      <SubmitButton
        idleLabel={
          event.registration_status === "open"
            ? "Close registration"
            : "Open registration"
        }
        pendingLabel="Updating"
      />
      <ActionMessage state={state} />
    </form>
  );
}

function EventTransition({
  meetId,
  meetStatus,
  event,
}: {
  meetId: string;
  meetStatus: string;
  event: Event;
}) {
  const [state, action] = useActionState(
    transitionEventAction,
    initialActionState,
  );
  const choices: Record<string, string[]> = {
    scheduled: [
      ...(event.roster_status === "locked" &&
      ["registration_closed", "in_progress"].includes(meetStatus)
        ? ["check_in_open"]
        : []),
      "cancelled",
    ],
    check_in_open: [
      ...(meetStatus === "in_progress" ? ["in_progress"] : []),
      "cancelled",
    ],
    in_progress: [
      ...(meetStatus === "in_progress" ? ["completed"] : []),
      "cancelled",
    ],
  };
  const statuses = ["completed", "cancelled", "archived"].includes(meetStatus)
    ? []
    : (choices[event.status] ?? []);
  if (!statuses.length) return null;
  return (
    <form action={action} className="mt-3 flex flex-wrap items-end gap-2">
      <input type="hidden" name="id" value={event.id} />
      <input type="hidden" name="meetId" value={meetId} />
      <label className="text-xs font-medium">
        Lifecycle
        <select className={inputClass} name="status">
          {statuses.map((status) => (
            <option value={status} key={status}>
              {status.replaceAll("_", " ")}
            </option>
          ))}
        </select>
      </label>
      <SubmitButton idleLabel="Transition" pendingLabel="Updating" />
      <ActionMessage state={state} />
    </form>
  );
}

export function MeetConfiguration({
  meetId,
  meetStatus,
  houses,
  categories,
  events,
}: {
  meetId: string;
  meetStatus: string;
  houses: House[];
  categories: Category[];
  events: Event[];
}) {
  const isDraft = meetStatus === "draft";
  const [categoryState, categoryAction] = useActionState(
    createCategoryAction,
    initialActionState,
  );
  const [eventState, eventAction] = useActionState(
    createEventAction,
    initialActionState,
  );
  return (
    <div className="space-y-8">
      <section>
        <h2 className="mb-3 text-lg font-semibold">Participating houses</h2>
        {!isDraft ? (
          <p className="mb-3 text-sm text-muted">
            Participation and event configuration are locked because
            registration has opened.
            {meetStatus === "registration_open" && events.length === 0
              ? " Return this eventless meet to draft from Sports meets to finish setup."
              : ""}
          </p>
        ) : null}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {isDraft
            ? houses.map((house) => (
                <HouseToggle key={house.id} meetId={meetId} house={house} />
              ))
            : null}
        </div>
      </section>
      {isDraft ? (
        <section className="grid gap-6 xl:grid-cols-2">
          <form
            action={categoryAction}
            className="space-y-3 rounded-xl border bg-surface p-5 shadow-sm"
          >
            <h2 className="font-semibold">Add sport category</h2>
            <input type="hidden" name="meetId" value={meetId} />
            <label className="block text-xs font-medium">
              Name
              <input className={inputClass} name="name" required />
            </label>
            <label className="block text-xs font-medium">
              Code
              <input className={inputClass} name="code" required />
            </label>
            <label className="block text-xs font-medium">
              Description
              <textarea className={inputClass} name="description" rows={3} />
            </label>
            <ActionMessage state={categoryState} />
            <SubmitButton idleLabel="Add category" pendingLabel="Adding" />
          </form>
          <form
            action={eventAction}
            className="grid gap-3 rounded-xl border bg-surface p-5 shadow-sm sm:grid-cols-2"
          >
            <h2 className="font-semibold sm:col-span-2">Create event</h2>
            {categories.length === 0 ? (
              <p className="sm:col-span-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
                Add a sport category first; every event needs one.
              </p>
            ) : null}
            <input type="hidden" name="meetId" value={meetId} />
            <label className="text-xs font-medium">
              Category
              <select className={inputClass} name="categoryId" required>
                <option value="">Select</option>
                {categories.map((category) => (
                  <option value={category.id} key={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-medium">
              Code
              <input className={inputClass} name="code" required />
            </label>
            <label className="text-xs font-medium">
              Name
              <input className={inputClass} name="name" required />
            </label>
            <label className="text-xs font-medium">
              Description
              <input className={inputClass} name="description" />
            </label>
            <label className="text-xs font-medium">
              Entry type
              <select className={inputClass} name="eventType">
                <option value="individual">Individual</option>
                <option value="team">Team</option>
              </select>
            </label>
            <label className="text-xs font-medium">
              Format
              <select className={inputClass} name="formatCode">
                <option value="race">Race</option>
                <option value="jump">Jump</option>
                <option value="throw">Throw</option>
                <option value="relay">Relay</option>
                <option value="team_match">Team match</option>
                <option value="other">Other</option>
              </select>
            </label>
            <label className="text-xs font-medium">
              Max participants / house
              <input
                className={inputClass}
                name="maximumParticipants"
                type="number"
                min="1"
                required
              />
            </label>
            <label className="text-xs font-medium">
              Minimum team size
              <input
                className={inputClass}
                name="minimumTeamSize"
                type="number"
                min="2"
              />
            </label>
            <label className="text-xs font-medium">
              Maximum team size
              <input
                className={inputClass}
                name="maximumTeamSize"
                type="number"
                min="2"
              />
            </label>
            <label className="text-xs font-medium">
              Starts
              <input
                className={inputClass}
                name="startsAt"
                type="datetime-local"
                required
              />
            </label>
            <label className="text-xs font-medium">
              Ends
              <input
                className={inputClass}
                name="endsAt"
                type="datetime-local"
                required
              />
            </label>
            <label className="text-xs font-medium">
              Rules
              <textarea className={inputClass} name="rules" />
            </label>
            <label className="text-xs font-medium">
              Requirements
              <textarea className={inputClass} name="requirements" />
            </label>
            <div className="sm:col-span-2">
              <ActionMessage state={eventState} />
              <SubmitButton
                idleLabel="Create event"
                pendingLabel="Creating"
                disabled={categories.length === 0}
              />
            </div>
          </form>
        </section>
      ) : null}
      <section>
        <h2 className="mb-3 text-lg font-semibold">Events</h2>
        {events.length ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {events.map((event) => (
              <article
                className="rounded-xl border bg-surface p-5 shadow-sm"
                key={event.id}
              >
                <div className="flex justify-between gap-3">
                  <div>
                    <p className="font-mono text-xs text-muted">{event.code}</p>
                    <h3 className="font-semibold">{event.name}</h3>
                    <p className="mt-1 text-sm capitalize text-muted">
                      {event.format_code?.replaceAll("_", " ")} ·{" "}
                      {event.event_type}
                    </p>
                  </div>
                  <div className="flex flex-col gap-1">
                    <StatusBadge
                      tone={
                        event.registration_status === "open"
                          ? "success"
                          : "neutral"
                      }
                    >
                      {event.registration_status}
                    </StatusBadge>
                    <StatusBadge>{event.roster_status} roster</StatusBadge>
                    <StatusBadge
                      tone={
                        event.status === "check_in_open" ? "success" : "neutral"
                      }
                    >
                      Check-in: {event.status.replaceAll("_", " ")}
                    </StatusBadge>
                  </div>
                </div>
                {event.roster_status === "locked" &&
                event.status === "scheduled" ? (
                  <p className="mt-3 rounded-lg bg-amber-50 p-3 text-xs text-amber-900">
                    {meetStatus === "registration_open"
                      ? "Close meet registration before opening event check-in."
                      : "Approved roster locked. Use Lifecycle below to open event check-in before attendance can be recorded."}
                  </p>
                ) : null}
                <p className="mt-3 text-xs text-muted">
                  Limit: {event.maximum_participants_per_house ?? "not set"} per
                  house
                </p>
                {event.registration_status === "open" ||
                (meetStatus === "registration_open" &&
                  event.roster_status === "open" &&
                  event.status === "scheduled") ? (
                  <EventRegistration meetId={meetId} event={event} />
                ) : null}
                <EventTransition
                  meetId={meetId}
                  meetStatus={meetStatus}
                  event={event}
                />
              </article>
            ))}
          </div>
        ) : (
          <p className="rounded-lg border bg-surface p-4 text-sm text-muted">
            No events configured.
          </p>
        )}
      </section>
    </div>
  );
}
