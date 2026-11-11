import Link from "next/link";
import { requireClientRecord } from "@/lib/auth";
import { today, weekStart, monthStart } from "@/lib/dates";
import { attendanceSummary, volumeSummary } from "@/lib/stats";
import { markNotificationsRead } from "./actions";

export default async function ClientHome() {
  const { supabase, user, client } = await requireClientRecord();
  const t = today();
  const ws = weekStart(t);

  const [att, sets, plan, notes] = await Promise.all([
    supabase.from("attendance").select("date, status").eq("client_id", client.id),
    supabase.from("v_set_volume").select("log_date, weight_kg, reps").eq("client_id", client.id).gte("log_date", monthStart(t)),
    supabase.from("workout_plans").select("muscle_group, workout_exercises(id)").eq("client_id", client.id).eq("workout_date", t).maybeSingle(),
    supabase.from("notifications").select("id, title, body, is_read, created_at").eq("user_id", user.id)
      .order("created_at", { ascending: false }).limit(5),
  ]);
  const sum = attendanceSummary((att.data ?? []) as any[]);
  const all = sets.data ?? [];
  const day = volumeSummary(all.filter((s) => s.log_date === t));
  const week = volumeSummary(all.filter((s) => s.log_date >= ws));
  const mon = volumeSummary(all);
  const unread = (notes.data ?? []).some((n) => !n.is_read);

  const tiles: [string, string | number][] = [
    ["Lifted today (kg)", Math.round(day.volume).toLocaleString()],
    ["Lifted this week (kg)", Math.round(week.volume).toLocaleString()],
    ["Lifted this month (kg)", Math.round(mon.volume).toLocaleString()],
    ["Best weight today (kg)", day.maxWeight],
    ["Attendance", sum.pct + "%"],
    ["Streak (days)", sum.streak],
  ];

  return (
    <>
      <div className="card">
        <p className="text-xs uppercase text-neutral-400">Today</p>
        <p className="text-xl font-black text-lime">{plan.data?.muscle_group ?? "No workout assigned"}</p>
        {plan.data && <p className="text-sm text-neutral-400">{plan.data.workout_exercises?.length ?? 0} exercises</p>}
        <Link href="/client/workout" className="btn mt-3 w-full">Open workout</Link>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {tiles.map(([l, v]) => (
          <div key={l} className="card"><p className="stat !text-2xl">{v}</p><p className="text-xs text-neutral-400">{l}</p></div>
        ))}
      </div>

      <div className="card space-y-1 text-sm">
        <h2 className="font-bold">My profile</h2>
        <p>Goal: {client.goal ?? "—"}</p>
        <p>Weight: {client.starting_weight_kg ?? "—"} kg → {client.current_weight_kg ?? "—"} kg</p>
        <p>Membership: {client.membership_start ?? "—"} to {client.membership_expiry ?? "—"}</p>
      </div>

      <div className="card space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="font-bold">Notifications</h2>
          {unread && (
            <form action={markNotificationsRead}><button className="text-xs text-lime">Mark all read</button></form>
          )}
        </div>
        {!notes.data?.length && <p className="text-sm text-neutral-500">Nothing yet.</p>}
        {notes.data?.map((n) => (
          <div key={n.id} className={`rounded-xl border p-3 text-sm ${n.is_read ? "border-edge" : "border-lime"}`}>
            <p className="font-semibold">{n.title}</p>
            {n.body && <p className="text-neutral-400">{n.body}</p>}
          </div>
        ))}
      </div>
    </>
  );
}
