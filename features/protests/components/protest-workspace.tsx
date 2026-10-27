"use client";

import { useActionState } from "react";
import { ActionMessage } from "@/components/ui/action-message";
import { StatusBadge } from "@/components/ui/status-badge";
import { SubmitButton } from "@/components/ui/submit-button";
import {
  addProtestEvidenceAction,
  assignProtestReviewerAction,
  createProtestGroundAction,
  decideProtestAction,
  fileProtestAction,
} from "@/features/protests/actions";
import { initialActionState } from "@/features/shared/action-state";

type ResultOption = {
  id: string;
  event: { name: string } | null;
  house: { code: string } | null;
};
type Reviewer = { id: string; display_name: string };
type Ground = {
  id: string;
  sports_meet_id: string;
  code: string;
  name: string;
  is_active: boolean;
  meet: { name: string } | null;
};
type Meet = { id: string; name: string };
type Protest = {
  id: string;
  status: string;
  grounds: string;
  grounds_code: string | null;
  decision: string | null;
  findings: string | null;
  result: { event: { name: string } | null } | null;
  house: { code: string } | null;
};
const inputClass =
  "mt-1 min-h-10 w-full rounded-md border bg-white px-3 py-2 text-sm";

function EvidenceForm({ protestId }: { protestId: string }) {
  const [state, action] = useActionState(
    addProtestEvidenceAction,
    initialActionState,
  );
  return (
    <form action={action} className="mt-3 grid gap-2 sm:grid-cols-3">
      <input type="hidden" name="protestId" value={protestId} />
      <select className={inputClass} name="referenceType">
        <option value="document">Document reference</option>
        <option value="image">Image reference</option>
        <option value="video">Video reference</option>
        <option value="witness">Witness reference</option>
        <option value="other">Other</option>
      </select>
      <input
        className={inputClass}
        name="reference"
        placeholder="Controlled storage reference, not raw evidence"
        required
      />
      <input
        className={inputClass}
        name="description"
        placeholder="Description"
      />
      <div className="sm:col-span-3">
        <SubmitButton
          idleLabel="Add evidence reference"
          pendingLabel="Saving"
        />
        <ActionMessage state={state} />
      </div>
    </form>
  );
}

function DecisionForm({ protestId }: { protestId: string }) {
  const [state, action] = useActionState(
    decideProtestAction,
    initialActionState,
  );
  return (
    <form action={action} className="mt-3 grid gap-2 sm:grid-cols-2">
      <input type="hidden" name="protestId" value={protestId} />
      <select className={inputClass} name="uphold">
        <option value="true">Uphold</option>
        <option value="false">Dismiss</option>
      </select>
      <input
        className={inputClass}
        name="findings"
        placeholder="Recorded findings"
        required
      />
      <textarea
        className={`${inputClass} sm:col-span-2`}
        name="decision"
        placeholder="Reasoned final decision"
        required
      />
      <div className="sm:col-span-2">
        <SubmitButton idleLabel="Record decision" pendingLabel="Deciding" />
        <ActionMessage state={state} />
      </div>
    </form>
  );
}

export function ProtestWorkspace({
  results,
  protests,
  reviewers,
  grounds,
  meets,
  canFile,
  canAssign,
  canDecide,
  canConfigure,
}: {
  results: ResultOption[];
  protests: Protest[];
  reviewers: Reviewer[];
  grounds: Ground[];
  meets: Meet[];
  canFile: boolean;
  canAssign: boolean;
  canDecide: boolean;
  canConfigure: boolean;
}) {
  const [fileState, fileAction] = useActionState(
    fileProtestAction,
    initialActionState,
  );
  const [assignState, assignAction] = useActionState(
    assignProtestReviewerAction,
    initialActionState,
  );
  const [groundState, groundAction] = useActionState(
    createProtestGroundAction,
    initialActionState,
  );
  return (
    <div className="space-y-8">
      {canConfigure ? (
        <section>
          <h2 className="mb-3 text-lg font-semibold">
            Approved protest grounds
          </h2>
          <form
            action={groundAction}
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
            <div className="md:col-span-4">
              <SubmitButton idleLabel="Add category" pendingLabel="Adding" />
              <ActionMessage state={groundState} />
            </div>
          </form>
        </section>
      ) : null}
      {canFile ? (
        <section>
          <h2 className="mb-3 text-lg font-semibold">File a protest</h2>
          <form
            action={fileAction}
            className="grid gap-3 rounded-xl border bg-surface p-5 shadow-sm md:grid-cols-2"
          >
            <label className="text-xs font-medium">
              Published or approved result
              <select className={inputClass} name="resultId">
                {results.map((result) => (
                  <option key={result.id} value={result.id}>
                    {result.event?.name} · {result.house?.code}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-medium">
              Ground category
              <select className={inputClass} name="groundsCode" required>
                <option value="">Select an approved category</option>
                {grounds.map((ground) => (
                  <option key={ground.id} value={ground.code}>
                    {ground.code} · {ground.name} · {ground.meet?.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-medium md:col-span-2">
              Grounds
              <textarea
                className={inputClass}
                name="grounds"
                rows={4}
                required
              />
            </label>
            <div className="md:col-span-2">
              <SubmitButton idleLabel="File protest" pendingLabel="Filing" />
              <ActionMessage state={fileState} />
            </div>
          </form>
        </section>
      ) : null}
      <section>
        <h2 className="mb-3 text-lg font-semibold">Integrity cases</h2>
        {protests.length ? (
          <div className="space-y-4">
            {protests.map((protest) => (
              <article
                className="rounded-xl border bg-surface p-5 shadow-sm"
                key={protest.id}
              >
                <div className="flex justify-between gap-3">
                  <div>
                    <h3 className="font-semibold">
                      {protest.result?.event?.name}
                    </h3>
                    <p className="text-xs text-muted">
                      Filed by house {protest.house?.code} ·{" "}
                      {protest.grounds_code ?? "Unclassified"}
                    </p>
                  </div>
                  <StatusBadge
                    tone={
                      protest.status === "upheld"
                        ? "success"
                        : protest.status === "dismissed"
                          ? "neutral"
                          : "warning"
                    }
                  >
                    {protest.status}
                  </StatusBadge>
                </div>
                <p className="mt-3 text-sm">{protest.grounds}</p>
                {protest.findings ? (
                  <p className="mt-2 text-sm text-muted">
                    Findings: {protest.findings}
                  </p>
                ) : null}
                {protest.decision ? (
                  <p className="mt-2 text-sm font-medium">
                    Decision: {protest.decision}
                  </p>
                ) : null}
                <EvidenceForm protestId={protest.id} />
                {canAssign && protest.status === "filed" ? (
                  <form
                    action={assignAction}
                    className="mt-3 flex flex-wrap items-end gap-2"
                  >
                    <input type="hidden" name="protestId" value={protest.id} />
                    <label className="text-xs font-medium">
                      Independent reviewer
                      <select className={inputClass} name="reviewerId">
                        {reviewers.map((reviewer) => (
                          <option key={reviewer.id} value={reviewer.id}>
                            {reviewer.display_name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <SubmitButton
                      idleLabel="Assign reviewer"
                      pendingLabel="Assigning"
                    />
                    <ActionMessage state={assignState} />
                  </form>
                ) : null}
                {canDecide && protest.status === "under_review" ? (
                  <DecisionForm protestId={protest.id} />
                ) : null}
              </article>
            ))}
          </div>
        ) : (
          <p className="rounded-lg border bg-surface p-4 text-sm text-muted">
            No protest cases are visible in your authorized scope.
          </p>
        )}
      </section>
    </div>
  );
}
