import Link from "next/link";
import { UserPlus, CalendarCheck, Dumbbell, CalendarOff } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { today, addDays, weekStart, shortDate } from "@/lib/dates";
import { AttendanceBar, VolumeLine } from "@/components/Charts";

export default async function TrainerDashboard() {
  const { supabase } = await requireRole("trainer");
  const t = today();
  const ws = weekStart(t);
  const last7 = addDays(t, -6);

  const [clients, attWeek, pending, logsWeek, volWeek] = await Promise.all([
    supabase.from("clients").select("id, status, membership_expiry"),
    supabase.from("attendance").select("client_id, date, status").gte("date", last7).lte("date", t),
    supabase.from("leave_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("workout_logs").select("id", { count: "exact", head: true }).eq("completed", true).gte("log_date", ws),
    supabase.from("v_daily_volume").select("log_date, total_volume_kg").gte("log_date", ws).lte("log_date", t),
  ]);

  const all = clients.data ?? [];
  const active = all.filter((c) => c.status === "active");
  const att = attWeek.data ?? [];
  const todayAtt = att.filter((a) => a.date === t);
  const present = todayAtt.filter((a) => a.status === "present").length;
  const absent = todayAtt.filter((a) => a.status === "absent").length;
  const onLeave = todayAtt.filter((a) => a.status === "on_leave").length;
  const soon = addDays(t, 7);
  const expiring = active.filter((c) => c.membership_expiry && c.membership_expiry >= t && c.membership_expiry <= soon).length;

  const vols = volWeek.data ?? [];
  const volToday = vols.filter((v) => v.log_date === t).reduce((a, v) => a + Number(v.total_volume_kg), 0);
  const volTotal = vols.reduce((a, v) => a + Number(v.total_volume_kg), 0);

  const attChart = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(last7, i);
    const rows = att.filter((a) => a.date === d);
    return {
      label: shortDate(d),
      present: rows.filter((r) => r.status === "present").length,
      absent: rows.filter((r) => r.status === "absent").length,
    };
  });
  const volChart = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(ws, i);
    return { label: shortDate(d), volume: vols.filter((v) => v.log_date === d).reduce((a, v) => a + Number(v.total_volume_kg), 0) };
  });

  const stats: [string, string | number][] = [
    ["Total clients", all.length], ["Active", active.length], ["Inactive", all.length - active.length],
    ["Present today", present], ["Absent today", absent], ["On leave today", onLeave],
    ["Pending leave", pending.count ?? 0], ["Expiring ≤7 days", expiring],
    ["Workouts done (week)", logsWeek.count ?? 0],
    ["Lifted today (kg)", Math.round(volToday).toLocaleString()],
    ["Lifted this week (kg)", Math.round(volTotal).toLocaleString()],
  ];

  return (
    <>
      <h1 className="text-2xl font-black">Dashboard</h1>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Link href="/trainer/clients/new" className="btn"><UserPlus size={16} /> Add Client</Link>
        <Link href="/trainer/attendance" className="btn-ghost"><CalendarCheck size={16} /> Attendance</Link>
        <Link href="/trainer/workouts" className="btn-ghost"><Dumbbell size={16} /> Assign Workout</Link>
        <Link href="/trainer/leave" className="btn-ghost"><CalendarOff size={16} /> Manage Leave</Link>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map(([l, v]) => (
          <div key={l} className="card">
            <p className="stat">{v}</p>
            <p className="text-xs text-neutral-400">{l}</p>
          </div>
        ))}
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        <div className="card"><h2 className="mb-2 font-bold">Attendance – last 7 days</h2><AttendanceBar data={attChart} /></div>
        <div className="card"><h2 className="mb-2 font-bold">Lifting volume – this week</h2><VolumeLine data={volChart} /></div>
      </div>
    </>
  );
}
