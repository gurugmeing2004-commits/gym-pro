import Link from "next/link";
import { UserPlus } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { today } from "@/lib/dates";

const GOALS = ["Muscle Building", "Fat Loss", "Strength Training", "General Fitness", "Body Recomposition", "Endurance"];

export default async function Clients({ searchParams }: { searchParams: { q?: string; status?: string; goal?: string } }) {
  const { supabase } = await requireRole("trainer");
  let query = supabase.from("clients").select("id, full_name, phone, goal, status, membership_expiry").order("full_name");
  const q = (searchParams.q ?? "").replace(/[,()%*]/g, " ").trim();
  if (q) query = query.or(`full_name.ilike.%${q}%,phone.ilike.%${q}%`);
  const s = searchParams.status;
  if (s === "active" || s === "inactive") query = query.eq("status", s);
  if (s === "expired") query = query.lt("membership_expiry", today());
  if (searchParams.goal && GOALS.includes(searchParams.goal)) query = query.eq("goal", searchParams.goal);
  const { data: clients } = await query;

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black">Clients</h1>
        <Link href="/trainer/clients/new" className="btn"><UserPlus size={16} /> Add</Link>
      </div>
      <form className="grid gap-2 sm:grid-cols-4">
        <input name="q" defaultValue={searchParams.q} placeholder="Search name or phone" className="input sm:col-span-2" />
        <select name="status" defaultValue={s ?? ""} className="input">
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="expired">Membership expired</option>
        </select>
        <select name="goal" defaultValue={searchParams.goal ?? ""} className="input">
          <option value="">All goals</option>
          {GOALS.map((g) => <option key={g}>{g}</option>)}
        </select>
        <button className="btn-ghost sm:col-span-4">Apply filters</button>
      </form>
      {!clients?.length ? (
        <p className="card text-center text-neutral-400">No clients found.</p>
      ) : (
        <div className="space-y-2">
          {clients.map((c) => (
            <Link key={c.id} href={`/trainer/clients/${c.id}`} className="card flex items-center justify-between hover:border-lime">
              <div>
                <p className="font-bold">{c.full_name}</p>
                <p className="text-xs text-neutral-400">{c.goal ?? "No goal"} · {c.phone ?? "No phone"}</p>
              </div>
              <div className="text-right text-xs">
                <span className={c.status === "active" ? "text-lime" : "text-neutral-500"}>{c.status}</span>
                {c.membership_expiry && (
                  <p className={c.membership_expiry < today() ? "text-red-400" : "text-neutral-400"}>
                    Exp {c.membership_expiry}
                  </p>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
