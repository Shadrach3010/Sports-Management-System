"use client";

import { useActionState } from "react";
import { ActionMessage } from "@/components/ui/action-message";
import { StatusBadge } from "@/components/ui/status-badge";
import { SubmitButton } from "@/components/ui/submit-button";
import {
  activateScoringRuleAction,
  addScoringPositionAction,
  assignScoringRuleAction,
  createScoringRuleAction,
  setStandingsStatusAction,
  submitScoringRuleAction,
} from "@/features/scoring/actions";
import { initialActionState } from "@/features/shared/action-state";

type Meet = {
  id: string;
  name: string;
  status: string;
  standings_status: string;
};
type Rule = {
  id: string;
  name: string;
  version: number;
  status: string;
  tie_policy: string;
  sports_meet_id: string;
  created_by: string;
  positions: { placement: number; points: number }[];
};
type Event = {
  id: string;
  name: string;
  code: string;
  sports_meet_id: string;
  scoring_rule_id: string | null;
};
const inputClass =
  "mt-1 min-h-10 w-full rounded-md border bg-white px-3 py-2 text-sm";

function RuleCard({ rule, currentUser }: { rule: Rule; currentUser: string }) {
  const [positionState, positionAction] = useActionState(
    addScoringPositionAction,
    initialActionState,
  );
  const [submitState, submitAction] = useActionState(
    submitScoringRuleAction,
    initialActionState,
  );
  const [activateState, activateAction] = useActionState(
    activateScoringRuleAction,
    initialActionState,
  );
  return (
    <article className="rounded-xl border bg-surface p-5 shadow-sm">
      <div className="flex justify-between gap-3">
        <div>
          <h3 className="font-semibold">
            {rule.name} v{rule.version}
          </h3>
          <p className="text-xs text-muted">
            Tie policy: {rule.tie_policy.replaceAll("_", " ")}
          </p>
        </div>
        <StatusBadge tone={rule.status === "active" ? "success" : "warning"}>
          {rule.status}
        </StatusBadge>
      </div>
      <p className="mt-3 text-sm text-muted">
        {rule.positions.length
          ? rule.positions
              .sort((a, b) => a.placement - b.placement)
              .map((item) => `${item.placement}: ${item.points}`)
              .join(" · ")
          : "No position values configured."}
      </p>
      {rule.status === "draft" && rule.created_by === currentUser ? (
        <>
          <form
            action={positionAction}
            className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_auto]"
          >
            <input type="hidden" name="ruleId" value={rule.id} />
            <label className="text-xs font-medium">
              Placement
              <input
                className={inputClass}
                name="placement"
                type="number"
                min="1"
              />
            </label>
            <label className="text-xs font-medium">
              Points
              <input
                className={inputClass}
                name="points"
                type="number"
                min="0"
                step="0.01"
              />
            </label>
            <SubmitButton idleLabel="Save value" pendingLabel="Saving" />
            <div className="sm:col-span-3">
              <ActionMessage state={positionState} />
            </div>
          </form>
          <form action={submitAction} className="mt-2">
            <input type="hidden" name="ruleId" value={rule.id} />
            <SubmitButton
              idleLabel="Submit for approval"
              pendingLabel="Submitting"
            />
            <ActionMessage state={submitState} />
          </form>
        </>
      ) : null}
      {rule.status === "pending_approval" && rule.created_by !== currentUser ? (
        <form action={activateAction} className="mt-3">
          <input type="hidden" name="ruleId" value={rule.id} />
          <SubmitButton
            idleLabel="Independently approve"
            pendingLabel="Activating"
          />
          <ActionMessage state={activateState} />
        </form>
      ) : null}
    </article>
  );
}

export function ScoringManager({
  meets,
  rules,
  events,
  currentUser,
}: {
  meets: Meet[];
  rules: Rule[];
  events: Event[];
  currentUser: string;
}) {
  const [createState, createAction] = useActionState(
    createScoringRuleAction,
    initialActionState,
  );
  const [assignState, assignAction] = useActionState(
    assignScoringRuleAction,
    initialActionState,
  );
  const [declarationState, declarationAction] = useActionState(
    setStandingsStatusAction,
    initialActionState,
  );
  const activeRules = rules.filter((rule) => rule.status === "active");
  return (
    <div className="space-y-8">
      <section>
        <h2 className="mb-3 text-lg font-semibold">Scoring versions</h2>
        <p className="mb-4 text-sm text-muted">
          No values are supplied by the application. Enter only the
          college-approved position table; a second authorized manager must
          activate it.
        </p>
        <form
          action={createAction}
          className="grid gap-3 rounded-xl border bg-surface p-5 shadow-sm md:grid-cols-4"
        >
          <label className="text-xs font-medium">
            Meet
            <select className={inputClass} name="meetId">
              {meets.map((meet) => (
                <option key={meet.id} value={meet.id}>
                  {meet.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-medium">
            Rule name
            <input className={inputClass} name="name" required />
          </label>
          <label className="text-xs font-medium">
            Version
            <input
              className={inputClass}
              name="version"
              type="number"
              min="1"
              required
            />
          </label>
          <label className="text-xs font-medium">
            Tie policy
            <select className={inputClass} name="tiePolicy">
              <option value="manual">Manual decision</option>
              <option value="equal_points">Equal points</option>
              <option value="shared_average">Average shared places</option>
            </select>
          </label>
          <label className="text-xs font-medium md:col-span-3">
            Approval notes
            <input className={inputClass} name="notes" />
          </label>
          <SubmitButton idleLabel="Create draft" pendingLabel="Creating" />
          <div className="md:col-span-4">
            <ActionMessage state={createState} />
          </div>
        </form>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {rules.map((rule) => (
            <RuleCard key={rule.id} rule={rule} currentUser={currentUser} />
          ))}
        </div>
      </section>
      <section>
        <h2 className="mb-3 text-lg font-semibold">
          Assign approved rule to event
        </h2>
        <form
          action={assignAction}
          className="grid gap-3 rounded-xl border bg-surface p-5 shadow-sm md:grid-cols-3"
        >
          <label className="text-xs font-medium">
            Event
            <select className={inputClass} name="eventId">
              {events.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.code} · {event.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-medium">
            Active scoring version
            <select className={inputClass} name="ruleId">
              {activeRules.map((rule) => (
                <option key={rule.id} value={rule.id}>
                  {rule.name} v{rule.version}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-medium">
            Assignment reason
            <input className={inputClass} name="reason" required />
          </label>
          <div className="md:col-span-3">
            <SubmitButton idleLabel="Assign rule" pendingLabel="Assigning" />
            <ActionMessage state={assignState} />
          </div>
        </form>
      </section>
      <section>
        <h2 className="mb-3 text-lg font-semibold">Standings declaration</h2>
        <p className="mb-4 text-sm text-muted">
          Standings begin as provisional. Confirmation and final declaration are
          explicit, audited transitions; final requires a completed meet with no
          disputed result.
        </p>
        <form
          action={declarationAction}
          className="grid gap-3 rounded-xl border bg-surface p-5 shadow-sm md:grid-cols-3"
        >
          <label className="text-xs font-medium">
            Meet
            <select className={inputClass} name="meetId">
              {meets.map((meet) => (
                <option key={meet.id} value={meet.id}>
                  {meet.name} · {meet.standings_status}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-medium">
            Next declaration
            <select className={inputClass} name="status">
              <option value="confirmed">Confirmed</option>
              <option value="final">Final</option>
            </select>
          </label>
          <label className="text-xs font-medium">
            Declaration reason
            <input className={inputClass} name="reason" required />
          </label>
          <div className="md:col-span-3">
            <SubmitButton
              idleLabel="Record declaration"
              pendingLabel="Recording"
            />
            <ActionMessage state={declarationState} />
          </div>
        </form>
      </section>
    </div>
  );
}
