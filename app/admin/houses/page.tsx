import { EmptyState } from "@/components/admin/empty-state";
import { PageHeader } from "@/components/admin/page-header";
import {
  HouseManager,
  type HouseSummary,
} from "@/features/houses/components/house-manager";
import { requireRoles } from "@/lib/auth/authorization";
import { houseManagerRoles } from "@/lib/auth/roles";

type HouseRow = {
  id: string;
  name: string;
  code: string;
  official_color: string | null;
  is_active: boolean;
  students: { count: number }[];
};

export default async function HousesPage() {
  const { supabase } = await requireRoles(houseManagerRoles);
  const { data, error } = await supabase
    .from("houses")
    .select("id,name,code,official_color,is_active,students(count)")
    .order("name");
  if (error) throw new Error("Houses could not be loaded.");
  const houses: HouseSummary[] = ((data ?? []) as HouseRow[]).map((house) => ({
    id: house.id,
    name: house.name,
    code: house.code,
    officialColor: house.official_color,
    isActive: house.is_active,
    studentCount: house.students[0]?.count ?? 0,
  }));
  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Administration"
        title="Houses"
        description="Create and maintain competing houses. Deactivation preserves linked student and competition records."
      />
      {houses.length === 0 ? (
        <>
          <EmptyState
            title="No houses yet"
            description="Create the first house using the form below."
          />
          <HouseManager houses={[]} />
        </>
      ) : (
        <HouseManager houses={houses} />
      )}
    </div>
  );
}
