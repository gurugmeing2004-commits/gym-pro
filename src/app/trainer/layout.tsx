import { requireRole } from "@/lib/auth";
import TrainerNav from "@/components/TrainerNav";

export default async function TrainerLayout({ children }: { children: React.ReactNode }) {
  const { supabase, profile } = await requireRole("trainer");
  const { count } = await supabase.from("leave_requests").select("id", { count: "exact", head: true }).eq("status", "pending");
  return (
    <div className="md:flex">
      <TrainerNav name={profile.full_name} pendingLeave={count ?? 0} />
      <main className="mx-auto w-full max-w-6xl flex-1 space-y-4 p-4">{children}</main>
    </div>
  );
}
