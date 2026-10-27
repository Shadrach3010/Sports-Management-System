import { CompetitionHome } from "@/features/public-scoreboard/components/competition-home";
import { createClient } from "@/lib/supabase/server";

export default async function HomePage() {
  const supabase = await createClient();
  const [{ data: standings }, { data: results }] = await Promise.all([
    supabase
      .from("public_house_standings")
      .select(
        "sports_meet_id,meet_name,year,standings_status,house_code,house_name,house_color,total_points,award_count,last_updated_at",
      )
      .order("year", { ascending: false })
      .order("total_points", { ascending: false }),
    supabase.rpc("get_public_competition_results"),
  ]);

  return (
    <CompetitionHome
      standings={(standings ?? []) as never}
      results={(results ?? []) as never}
    />
  );
}
