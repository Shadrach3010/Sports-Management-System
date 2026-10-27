"use client";

import { useActionState } from "react";

import { ActionMessage } from "@/components/ui/action-message";
import { StatusBadge } from "@/components/ui/status-badge";
import { SubmitButton } from "@/components/ui/submit-button";
import {
  decideResultCorrectionAction,
  finalizeResultAction,
  requestResultCorrectionAction,
  reviewResultAction,
  scoreResultAction,
} from "@/features/results/actions";
import { initialActionState } from "@/features/shared/action-state";

type ResultRow = {
  id: string;
  status: string;
  outcome: string;
  placement: number | null;
  time_milliseconds: number | null;
  distance_millimetres: number | null;
  height_millimetres: number | null;
  performance_score: number | null;
  tie_group: string | null;
  is_suspicious: boolean;
  event: { name: string; code: string } | null;
  house: { name: string; code: string } | null;
};
type Correction = {
  id: string;
  result_id: string;
  reason: string;
  requested_at: string;
};
const inputClass =
  "mt-1 min-h-10 w-full rounded-md border bg-white px-3 py-2 text-sm";

function ReviewControls({
  result,
  canVerify,
  canFinalize,
}: {
  result: ResultRow;
  canVerify: boolean;
  canFinalize: boolean;
}) {
  const [reviewState, reviewAction] = useActionState(
    reviewResultAction,
    initialActionState,
  );
  const [finalState, finalAction] = useActionState(
    finalizeResultAction,
    initialActionState,
  );
  const [scoreState, scoreAction] = useActionState(
    scoreResultAction,
    initialActionState,
  );
  return (
    <div className="mt-4 space-y-3">
      {canVerify && ["submitted", "under_review"].includes(result.status) ? (
        <form
          action={reviewAction}
          className="grid gap-2 sm:grid-cols-[auto_1fr_auto]"
        >
          <input type="hidden" name="resultId" value={result.id} />
          <select className={inputClass} name="decision">
            <option value="verified">Verify</option>
            <option value="rejected">Reject</option>
          </select>
          <input
            className={inputClass}
            name="reason"
            placeholder="Independent review reason"
            required
          />
          <SubmitButton idleLabel="Record review" pendingLabel="Saving" />
          <div className="sm:col-span-3">
            <ActionMessage state={reviewState} />
          </div>
        </form>
      ) : null}
      {canFinalize &&
      ["verified", "approved", "final"].includes(result.status) ? (
        <form
          action={finalAction}
          className="grid gap-2 sm:grid-cols-[auto_1fr_auto]"
        >
          <input type="hidden" name="resultId" value={result.id} />
          <select className={inputClass} name="publish">
            <option value="false">Approve / finalize next state</option>
            <option value="true">Publish publicly</option>
          </select>
          <input
            className={inputClass}
            name="reason"
            placeholder="Authorization reason"
            required
          />
          <SubmitButton idleLabel="Apply decision" pendingLabel="Saving" />
          <div className="sm:col-span-3">
            <ActionMessage state={finalState} />
          </div>
        </form>
      ) : null}
      {canFinalize &&
      ["approved", "final", "published"].includes(result.status) ? (
        <form action={scoreAction} className="flex flex-wrap items-end gap-2">
          <input type="hidden" name="resultId" value={result.id} />
          <label className="min-w-64 flex-1 text-xs font-medium">
            Scoring / recalculation reason
            <input className={inputClass} name="reason" required />
          </label>
          <SubmitButton idleLabel="Generate points" pendingLabel="Scoring" />
          <div className="w-full">
            <ActionMessage state={scoreState} />
          </div>
        </form>
      ) : null}
      {["approved", "final", "published", "disputed"].includes(
        result.status,
      ) ? (
        <CorrectionRequest result={result} />
      ) : null}
    </div>
  );
}

function CorrectionRequest({ result }: { result: ResultRow }) {
  const [state, action] = useActionState(
    requestResultCorrectionAction,
    initialActionState,
  );
  return (
    <details className="rounded-lg border p-3">
      <summary className="cursor-pointer text-sm font-medium">
        Request a controlled correction
      </summary>
      <form action={action} className="mt-3 grid gap-2 sm:grid-cols-4">
        <input type="hidden" name="resultId" value={result.id} />
        <select
          className={inputClass}
          name="outcome"
          defaultValue={result.outcome}
        >
          <option value="ranked">Ranked</option>
          <option value="did_not_start">Did not start</option>
          <option value="did_not_finish">Did not finish</option>
          <option value="disqualified">Disqualified</option>
          <option value="withdrawn">Withdrawn</option>
          <option value="abandoned">Abandoned</option>
        </select>
        <input
          className={inputClass}
          name="placement"
          defaultValue={result.placement ?? ""}
          placeholder="Placement"
          type="number"
          min="1"
        />
        <input
          className={inputClass}
          name="time"
          defaultValue={result.time_milliseconds ?? ""}
          placeholder="Time ms"
          type="number"
          min="1"
        />
        <input
          className={inputClass}
          name="distance"
          defaultValue={result.distance_millimetres ?? ""}
          placeholder="Distance mm"
          type="number"
          min="1"
        />
        <input
          className={inputClass}
          name="height"
          defaultValue={result.height_millimetres ?? ""}
          placeholder="Height mm"
          type="number"
          min="1"
        />
        <input
          className={inputClass}
          name="score"
          defaultValue={result.performance_score ?? ""}
          placeholder="Score"
          type="number"
          step="0.0001"
        />
        <input
          className={inputClass}
          name="tieGroup"
          defaultValue={result.tie_group ?? ""}
          placeholder="Tie group"
        />
        <input
          className={inputClass}
          name="reason"
          placeholder="Correction reason"
          required
        />
        <div className="sm:col-span-4">
          <SubmitButton
            idleLabel="Request correction"
            pendingLabel="Requesting"
          />
          <ActionMessage state={state} />
        </div>
      </form>
    </details>
  );
}

function CorrectionDecision({ correction }: { correction: Correction }) {
  const [state, action] = useActionState(
    decideResultCorrectionAction,
    initialActionState,
  );
  return (
    <form
      action={action}
      className="mt-3 grid gap-2 sm:grid-cols-[auto_1fr_auto]"
    >
      <input type="hidden" name="requestId" value={correction.id} />
      <select className={inputClass} name="approve">
        <option value="true">Approve correction</option>
        <option value="false">Reject correction</option>
      </select>
      <input
        className={inputClass}
        name="reason"
        placeholder="Independent decision reason"
        required
      />
      <SubmitButton idleLabel="Decide" pendingLabel="Saving" />
      <div className="sm:col-span-3">
        <ActionMessage state={state} />
      </div>
    </form>
  );
}

export function ResultReview({
  results,
  corrections,
  canVerify,
  canFinalize,
}: {
  results: ResultRow[];
  corrections: Correction[];
  canVerify: boolean;
  canFinalize: boolean;
}) {
  if (!results.length)
    return (
      <p className="rounded-lg border bg-surface p-4 text-sm text-muted">
        No results are available for your review scope.
      </p>
    );
  return (
    <div className="space-y-4">
      {canFinalize && corrections.length ? (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Pending result corrections</h2>
          {corrections.map((correction) => (
            <article
              className="rounded-xl border border-amber-200 bg-amber-50 p-5"
              key={correction.id}
            >
              <p className="text-sm font-medium">{correction.reason}</p>
              <p className="text-xs text-muted">
                Requested {new Date(correction.requested_at).toLocaleString()}
              </p>
              <CorrectionDecision correction={correction} />
            </article>
          ))}
        </section>
      ) : null}
      {results.map((result) => (
        <article
          className="rounded-xl border bg-surface p-5 shadow-sm"
          key={result.id}
        >
          <div className="flex flex-wrap justify-between gap-3">
            <div>
              <p className="font-mono text-xs text-muted">
                {result.event?.code} · {result.house?.code}
              </p>
              <h2 className="font-semibold">{result.event?.name}</h2>
            </div>
            <StatusBadge
              tone={
                result.status === "published"
                  ? "success"
                  : result.status === "rejected" || result.status === "disputed"
                    ? "danger"
                    : "warning"
              }
            >
              {result.status}
            </StatusBadge>
          </div>
          <p className="mt-3 text-sm text-muted">
            {result.outcome.replaceAll("_", " ")} · placement{" "}
            {result.placement ?? "—"} · time {result.time_milliseconds ?? "—"}{" "}
            ms · distance {result.distance_millimetres ?? "—"} mm · height{" "}
            {result.height_millimetres ?? "—"} mm · score{" "}
            {result.performance_score ?? "—"}
            {result.tie_group ? ` · tie ${result.tie_group}` : ""}
          </p>
          {result.is_suspicious ? (
            <p className="mt-2 rounded-md bg-amber-50 p-2 text-sm text-amber-900">
              Flagged for human review. This flag is not an allegation.
            </p>
          ) : null}
          <ReviewControls
            result={result}
            canVerify={canVerify}
            canFinalize={canFinalize}
          />
        </article>
      ))}
    </div>
  );
}
