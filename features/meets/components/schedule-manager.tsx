"use client";

import { useActionState } from "react";
import { ActionMessage } from "@/components/ui/action-message";
import { SubmitButton } from "@/components/ui/submit-button";
import {
  createVenueAction,
  createHeatAction,
  recordScheduleAction,
  setProtestDeadlineAction,
} from "@/features/meets/schedule-actions";
import { initialActionState } from "@/features/shared/action-state";

type Venue = { id: string; code: string; name: string };
type Event = {
  id: string;
  code: string;
  name: string;
  starts_at: string | null;
  ends_at: string | null;
  protest_deadline_at: string | null;
};
const inputClass =
  "mt-1 min-h-10 w-full rounded-md border bg-white px-3 py-2 text-sm";

export function ScheduleManager({
  meetId,
  venues,
  events,
}: {
  meetId: string;
  venues: Venue[];
  events: Event[];
}) {
  const [venueState, venueAction] = useActionState(
    createVenueAction,
    initialActionState,
  );
  const [scheduleState, scheduleAction] = useActionState(
    recordScheduleAction,
    initialActionState,
  );
  const [deadlineState, deadlineAction] = useActionState(
    setProtestDeadlineAction,
    initialActionState,
  );
  const [heatState, heatAction] = useActionState(
    createHeatAction,
    initialActionState,
  );
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold">
        Venues, schedule changes and protest windows
      </h2>
      <div className="grid gap-4 xl:grid-cols-2">
        <form
          action={venueAction}
          className="space-y-3 rounded-xl border bg-surface p-5 shadow-sm"
        >
          <h3 className="font-semibold">Add venue</h3>
          <input type="hidden" name="meetId" value={meetId} />
          <label className="block text-xs font-medium">
            Code
            <input className={inputClass} name="code" required />
          </label>
          <label className="block text-xs font-medium">
            Name
            <input className={inputClass} name="name" required />
          </label>
          <label className="block text-xs font-medium">
            Location note
            <input className={inputClass} name="locationNote" />
          </label>
          <SubmitButton idleLabel="Add venue" pendingLabel="Adding" />
          <ActionMessage state={venueState} />
        </form>
        <form
          action={heatAction}
          className="space-y-3 rounded-xl border bg-surface p-5 shadow-sm"
        >
          <h3 className="font-semibold">Schedule heat or fixture</h3>
          <input type="hidden" name="meetId" value={meetId} />
          <label className="block text-xs font-medium">
            Event
            <select className={inputClass} name="eventId">
              {events.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.code} · {event.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs font-medium">
            Number
            <input
              className={inputClass}
              name="heatNumber"
              type="number"
              min="1"
              required
            />
          </label>
          <label className="block text-xs font-medium">
            Name
            <input
              className={inputClass}
              name="name"
              placeholder="Heat 1 or Semi-final A"
              required
            />
          </label>
          <label className="block text-xs font-medium">
            Venue
            <select className={inputClass} name="venueId">
              <option value="">Use event venue</option>
              {venues.map((venue) => (
                <option key={venue.id} value={venue.id}>
                  {venue.code} · {venue.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs font-medium">
            Starts
            <input
              className={inputClass}
              name="startsAt"
              type="datetime-local"
              required
            />
          </label>
          <label className="block text-xs font-medium">
            Ends
            <input
              className={inputClass}
              name="endsAt"
              type="datetime-local"
              required
            />
          </label>
          <label className="block text-xs font-medium">
            Official advancement rule
            <textarea
              className={inputClass}
              name="advancementRule"
              rows={2}
              placeholder="Do not invent an unconfirmed progression rule"
            />
          </label>
          <SubmitButton idleLabel="Schedule" pendingLabel="Scheduling" />
          <ActionMessage state={heatState} />
        </form>
        <form
          action={scheduleAction}
          className="space-y-3 rounded-xl border bg-surface p-5 shadow-sm"
        >
          <h3 className="font-semibold">Record schedule change</h3>
          <input type="hidden" name="meetId" value={meetId} />
          <label className="block text-xs font-medium">
            Event
            <select className={inputClass} name="eventId">
              {events.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.code} · {event.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs font-medium">
            Venue
            <select className={inputClass} name="venueId">
              {venues.map((venue) => (
                <option key={venue.id} value={venue.id}>
                  {venue.code} · {venue.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs font-medium">
            Starts
            <input
              className={inputClass}
              name="startsAt"
              type="datetime-local"
              required
            />
          </label>
          <label className="block text-xs font-medium">
            Ends
            <input
              className={inputClass}
              name="endsAt"
              type="datetime-local"
              required
            />
          </label>
          <label className="block text-xs font-medium">
            Reason
            <input className={inputClass} name="reason" required />
          </label>
          <SubmitButton idleLabel="Update schedule" pendingLabel="Updating" />
          <ActionMessage state={scheduleState} />
        </form>
        <form
          action={deadlineAction}
          className="space-y-3 rounded-xl border bg-surface p-5 shadow-sm"
        >
          <h3 className="font-semibold">Set protest deadline</h3>
          <input type="hidden" name="meetId" value={meetId} />
          <label className="block text-xs font-medium">
            Event
            <select className={inputClass} name="eventId">
              {events.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.code} · {event.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs font-medium">
            Deadline
            <input
              className={inputClass}
              name="protestDeadline"
              type="datetime-local"
              required
            />
          </label>
          <p className="text-xs text-muted">
            Use the officially approved protest window. No default is assumed.
          </p>
          <SubmitButton idleLabel="Set deadline" pendingLabel="Saving" />
          <ActionMessage state={deadlineState} />
        </form>
      </div>
    </section>
  );
}
