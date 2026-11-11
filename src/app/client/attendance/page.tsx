import { requireClientRecord } from "@/lib/auth";
import { today, monthStart } from "@/lib/dates";
import { attendanceSummary } from "@/lib/stats";
import AttendanceCalendar from "@/components/AttendanceCalendar";

export default async function ClientAttendance() {
  const { supabase, client } = await requireClientRecord();
  const { data } = await supabase.from("attendance").select("date, status").eq("client_id", client.id);
  const rows = (data ?? []) as any[];
  const sum = attendanceSummary(rows);
  const statuses = Object.fromEntries(rows.map((r) => [r.date, r.status]));
  const tiles: [string, string | number][] = [
    ["Present", sum.present], ["Absent", sum.absent], ["Leave", sum.leave], ["Attendance", sum.pct + "%"], ["Streak", sum.streak],
  ];
  return (
    <>
      <h1 className="text-2xl font-black">Attendance</h1>
      <div className="grid grid-cols-3 gap-3">
        {tiles.map(([l, v]) => (
          <div key={l} className="card"><p className="stat !text-2xl">{v}</p><p className="text-xs text-neutral-400">{l}</p></div>
        ))}
      </div>
      <p className="text-xs text-neutral-500">Approved leave days are not counted against your percentage.</p>
      <div className="card"><AttendanceCalendar month={monthStart(today())} statuses={statuses} /></div>
    </>
  );
}
