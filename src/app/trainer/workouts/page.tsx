import Link from "next/link";
import { requireRole } from "@/lib/auth";

export default async function WorkoutsIndex() {
  const { supabase } = await requireRole("trainer");
  const { data: clients } = await supabase.from("clients").select("id, full_name, goal").eq("status", "active").order("full_name");
  return (
    <>
      <h1 className="text-2xl font-black">Workout planner</h1>
      <p className="text-sm text-neutral-400">Pick a client to plan their week.</p>
      {!clients?.length && <p className="card text-neutral-400">No active clients yet.</p>}
      {clients?.map((c) => (
        <Link key={c.id} href={`/trainer/workouts/${c.id}`} className="card block hover:border-lime">
          <p className="font-bold">{c.full_name}</p>
          <p className="text-xs text-neutral-400">{c.goal ?? "No goal set"}</p>
        </Link>
      ))}
    </>
  );
}
