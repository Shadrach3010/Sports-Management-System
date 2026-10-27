import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  ChevronRight,
  Medal,
  ShieldCheck,
  Sparkles,
  Timer,
  Trophy,
  Users,
} from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";

type Standing = {
  sports_meet_id: string;
  meet_name: string;
  year: number;
  standings_status: string;
  house_code: string;
  house_name: string;
  house_color: string | null;
  total_points: number;
  award_count: number;
  last_updated_at: string | null;
};

type CompetitionResult = {
  result_id: string;
  sports_meet_id: string;
  meet_name: string;
  standings_status: string;
  event_code: string;
  event_name: string;
  event_type: "individual" | "team";
  competitor_name: string;
  house_code: string;
  house_name: string;
  house_color: string | null;
  placement: number | null;
  outcome: string;
  time_milliseconds: number | null;
  distance_millimetres: number | null;
  height_millimetres: number | null;
  performance_score: number | null;
  points: number | null;
  published_at: string;
};

function formatPerformance(result: CompetitionResult) {
  if (result.outcome !== "ranked") return result.outcome.replaceAll("_", " ");
  if (result.time_milliseconds !== null) {
    const seconds = result.time_milliseconds / 1000;
    return `${seconds.toFixed(seconds < 60 ? 2 : 3)}s`;
  }
  if (result.distance_millimetres !== null)
    return `${(result.distance_millimetres / 1000).toFixed(2)}m`;
  if (result.height_millimetres !== null)
    return `${(result.height_millimetres / 1000).toFixed(2)}m`;
  if (result.performance_score !== null)
    return String(result.performance_score);
  return "Recorded";
}

export function CompetitionHome({
  standings,
  results,
}: {
  standings: Standing[];
  results: CompetitionResult[];
}) {
  const meetId = standings[0]?.sports_meet_id ?? results[0]?.sports_meet_id;
  const activeStandings = meetId
    ? standings.filter((row) => row.sports_meet_id === meetId)
    : [];
  const activeResults = meetId
    ? results.filter((row) => row.sports_meet_id === meetId)
    : [];
  const individualResults = activeResults
    .filter((row) => row.event_type === "individual")
    .slice(0, 12);
  const teamResults = activeResults
    .filter((row) => row.event_type === "team")
    .slice(0, 6);
  const meetName =
    activeStandings[0]?.meet_name ??
    activeResults[0]?.meet_name ??
    "November 2026 Sports Meet";
  const declaration =
    activeStandings[0]?.standings_status ??
    activeResults[0]?.standings_status ??
    "provisional";
  const latestUpdate = activeStandings
    .map((row) => row.last_updated_at)
    .filter((value): value is string => Boolean(value))
    .sort()
    .at(-1);

  return (
    <div className="space-y-10 pb-8">
      <section className="relative isolate overflow-hidden rounded-[2rem] bg-scoreboard px-6 py-8 text-white shadow-2xl shadow-slate-950/20 sm:px-10 sm:py-12 lg:px-14 lg:py-16">
        <div className="absolute inset-y-0 right-0 hidden w-[44%] skew-x-[-12deg] bg-track-orange/95 lg:block" />
        <div className="absolute -right-16 -top-28 size-80 rounded-full border-[42px] border-white/10" />
        <div className="relative z-10 grid items-end gap-10 lg:grid-cols-[1.15fr_0.85fr]">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.2em] backdrop-blur">
              <Sparkles
                className="size-3.5 text-track-orange"
                aria-hidden="true"
              />
              Live competition centre
            </div>
            <h1 className="mt-6 max-w-3xl text-4xl font-black uppercase leading-[0.95] tracking-[-0.045em] sm:text-6xl lg:text-7xl">
              Every result.
              <span className="block text-track-orange">Every point.</span>
              Fully traceable.
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-7 text-slate-200 sm:text-lg">
              Follow the house championship and verified event results from the
              college&apos;s official competition integrity system.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                className={buttonVariants({ variant: "sport" })}
                href="#leaderboard"
              >
                View leaderboard <ArrowRight className="ml-2 size-4" />
              </Link>
              <Link
                className={buttonVariants({ variant: "outline" })}
                href="/public/results"
              >
                All published results
              </Link>
            </div>
          </div>
          <div className="relative rounded-2xl border border-white/15 bg-slate-950/35 p-5 backdrop-blur-md lg:ml-12">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-300">
              Current competition
            </p>
            <p className="mt-3 text-2xl font-bold">{meetName}</p>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-white/10 p-4">
                <Trophy
                  className="size-5 text-track-orange"
                  aria-hidden="true"
                />
                <p className="mt-3 text-2xl font-black">
                  {activeStandings.length}
                </p>
                <p className="text-xs text-slate-300">Competing houses</p>
              </div>
              <div className="rounded-xl bg-white/10 p-4">
                <Medal
                  className="size-5 text-track-orange"
                  aria-hidden="true"
                />
                <p className="mt-3 text-2xl font-black">
                  {activeResults.length}
                </p>
                <p className="text-xs text-slate-300">Published results</p>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-4 text-xs">
              <span className="font-bold uppercase tracking-wider">
                {declaration}
              </span>
              <span className="text-right text-slate-300">
                {latestUpdate
                  ? `Updated ${new Date(latestUpdate).toLocaleString()}`
                  : "Awaiting official scores"}
              </span>
            </div>
          </div>
        </div>
      </section>

      <section id="leaderboard" className="scroll-mt-24">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="section-kicker">House championship</p>
            <h2 className="section-title">Leaderboard</h2>
          </div>
          <StatusBadge tone={declaration === "final" ? "success" : "warning"}>
            {declaration} standings
          </StatusBadge>
        </div>
        {activeStandings.length ? (
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(18rem,0.6fr)]">
            <div className="overflow-hidden rounded-2xl border bg-surface shadow-sm">
              <div className="grid grid-cols-[3.5rem_minmax(0,1fr)_5rem_5rem] border-b bg-scoreboard px-4 py-3 text-[0.68rem] font-bold uppercase tracking-[0.14em] text-slate-300 sm:grid-cols-[4rem_minmax(0,1fr)_7rem_7rem] sm:px-6">
                <span>Rank</span>
                <span>House</span>
                <span className="text-right">Awards</span>
                <span className="text-right">Points</span>
              </div>
              <div className="divide-y">
                {activeStandings.map((row, index) => (
                  <article
                    className="group grid grid-cols-[3.5rem_minmax(0,1fr)_5rem_5rem] items-center px-4 py-4 transition hover:bg-surface-muted sm:grid-cols-[4rem_minmax(0,1fr)_7rem_7rem] sm:px-6"
                    key={`${row.sports_meet_id}-${row.house_code}`}
                  >
                    <span
                      className={`font-mono text-xl font-black ${index < 3 ? "text-track-orange" : "text-muted"}`}
                    >
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <div className="flex min-w-0 items-center gap-3">
                      <span
                        className="size-3 shrink-0 rounded-full ring-4 ring-slate-100"
                        style={{
                          backgroundColor: row.house_color ?? "#64748b",
                        }}
                      />
                      <div className="min-w-0">
                        <p className="truncate font-bold">{row.house_name}</p>
                        <p className="text-xs font-semibold uppercase tracking-widest text-muted">
                          {row.house_code}
                        </p>
                      </div>
                    </div>
                    <span className="text-right text-sm text-muted">
                      {row.award_count}
                    </span>
                    <span className="text-right text-xl font-black tabular-nums">
                      {row.total_points}
                    </span>
                  </article>
                ))}
              </div>
            </div>
            <aside className="rounded-2xl bg-track-orange p-6 text-slate-950 shadow-lg shadow-orange-950/10">
              <Trophy className="size-9" aria-hidden="true" />
              <p className="mt-8 text-xs font-black uppercase tracking-[0.18em]">
                Current leader
              </p>
              <p className="mt-2 text-3xl font-black uppercase leading-none">
                {activeStandings[0]?.house_name}
              </p>
              <p className="mt-6 text-6xl font-black tabular-nums">
                {activeStandings[0]?.total_points}
              </p>
              <p className="text-sm font-bold">published points</p>
              <p className="mt-8 border-t border-slate-950/15 pt-4 text-xs leading-5">
                Totals include only active awards linked to approved and
                intentionally published result revisions.
              </p>
            </aside>
          </div>
        ) : (
          <EmptyCompetitionState message="No official house points have been published yet." />
        )}
      </section>

      <section>
        <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="section-kicker">Individual events</p>
            <h2 className="section-title">Top performances</h2>
          </div>
          <Link
            className="inline-flex items-center gap-1 text-sm font-bold text-primary"
            href="/public/results"
          >
            Browse all events <ChevronRight className="size-4" />
          </Link>
        </div>
        {individualResults.length ? (
          <div className="overflow-x-auto rounded-2xl border bg-surface shadow-sm">
            <table className="w-full min-w-[46rem] text-left text-sm">
              <thead className="bg-surface-muted text-[0.68rem] uppercase tracking-[0.14em] text-muted">
                <tr>
                  <th className="px-5 py-4">Rank</th>
                  <th className="px-5 py-4">Competitor</th>
                  <th className="px-5 py-4">House</th>
                  <th className="px-5 py-4">Event</th>
                  <th className="px-5 py-4 text-right">Performance</th>
                  <th className="px-5 py-4 text-right">Points</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {individualResults.map((result) => (
                  <tr
                    className="transition hover:bg-surface-muted"
                    key={result.result_id}
                  >
                    <td className="px-5 py-4 font-mono text-lg font-black text-track-orange">
                      {result.placement ?? "—"}
                    </td>
                    <td className="px-5 py-4 font-bold">
                      {result.competitor_name}
                    </td>
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center gap-2">
                        <span
                          className="size-2.5 rounded-full"
                          style={{
                            backgroundColor: result.house_color ?? "#64748b",
                          }}
                        />
                        {result.house_code}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-muted">
                      {result.event_name}
                    </td>
                    <td className="px-5 py-4 text-right font-mono font-bold">
                      {formatPerformance(result)}
                    </td>
                    <td className="px-5 py-4 text-right font-black">
                      {result.points ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyCompetitionState message="No individual performances have been published yet." />
        )}
      </section>

      <section>
        <div className="mb-5">
          <p className="section-kicker">Team events</p>
          <h2 className="section-title">Latest team results</h2>
        </div>
        {teamResults.length ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {teamResults.map((result) => (
              <article
                className="rounded-2xl border bg-surface p-5 shadow-sm"
                key={result.result_id}
              >
                <div className="flex items-start justify-between gap-4">
                  <span className="grid size-11 place-items-center rounded-xl bg-scoreboard text-white">
                    <Users className="size-5" aria-hidden="true" />
                  </span>
                  <span className="font-mono text-2xl font-black text-track-orange">
                    #{result.placement ?? "—"}
                  </span>
                </div>
                <p className="mt-5 text-xs font-bold uppercase tracking-[0.14em] text-muted">
                  {result.event_code}
                </p>
                <h3 className="mt-1 text-lg font-black">
                  {result.competitor_name}
                </h3>
                <p className="mt-1 text-sm text-muted">
                  {result.house_name} · {result.event_name}
                </p>
                <div className="mt-5 flex items-end justify-between border-t pt-4">
                  <div>
                    <p className="text-xs text-muted">Performance</p>
                    <p className="font-mono font-bold">
                      {formatPerformance(result)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted">Points</p>
                    <p className="text-2xl font-black">
                      {result.points ?? "—"}
                    </p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <EmptyCompetitionState message="No team-event results have been published yet." />
        )}
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        {[
          [
            ShieldCheck,
            "Verified workflow",
            "Judge, verifier and final approver remain separate.",
          ],
          [
            Timer,
            "Live-ready",
            "Schedules, check-in and result states update from one system.",
          ],
          [
            CalendarDays,
            "November 2026",
            "Built for the college's annual sports competition.",
          ],
        ].map(([Icon, title, body]) => {
          const FeatureIcon = Icon as typeof ShieldCheck;
          return (
            <article
              className="rounded-2xl border bg-surface p-5"
              key={String(title)}
            >
              <FeatureIcon
                className="size-5 text-track-orange"
                aria-hidden="true"
              />
              <h3 className="mt-4 font-bold">{String(title)}</h3>
              <p className="mt-2 text-sm leading-6 text-muted">
                {String(body)}
              </p>
            </article>
          );
        })}
      </section>
    </div>
  );
}

function EmptyCompetitionState({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-dashed bg-surface px-6 py-10 text-center">
      <Medal className="mx-auto size-8 text-muted" aria-hidden="true" />
      <p className="mt-3 font-bold">Competition data pending</p>
      <p className="mt-1 text-sm text-muted">{message}</p>
    </div>
  );
}
