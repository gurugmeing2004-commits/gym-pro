import { requireRole } from "@/lib/auth";
import { today, addDays } from "@/lib/dates";
import { markAttendance } from "../actions";

const BTNS: [string, string, string][] = [
  ["present", "Present", "bg-green-500 text-black"],
  ["absent", "Absent", "bg-red-500 text-white"],
  ["on_leave", "Leave", "bg-yellow-400 text-black"],
  ["not_marked", "Clear", "bg-neutral-700 text-white"],
];

export default async function AttendancePage({ searchParams }: { searchParams: { date?: string; q?: string } }) {
  const { supabase } = await requireRole("trainer");
  const date = /^\d{4}-\d{2}-\d{2}$/.test(searchParams.date ?? "") ? searchParams.date! : today();
  const q = (searchParams.q ?? "").replace(/[,()%*]/g, " ").trim();

  let cq = supabase.from("clients").select("id, full_name").eq("status", "active").order("full_name");
  if (q) cq = cq.ilike("full_name", `%${q}%`);
  const [clients, att, audit] = await Promise.all([
    cq,
    supabase.from("attendance").select("client_id, status").eq("date", date),
    supabase.from("attendance_audit").select("client_id, old_status, new_status, changed_at").eq("date", date)
      .order("changed_at", { ascending: false }).limit(15),
  ]);
  const status = new Map((att.data ?? []).map((a) => [a.client_id, a.status]));
  const names = new Map((clients.data ?? []).map((c) => [c.id, c.full_name]));

  return (
    <>
      <h1 className="text-2xl font-black">Attendance</h1>
      <form className="flex flex-wrap gap-2">
        <a className="btn-ghost" href={`?date=${addDays(date, -1)}`}>←</a>
        <input type="date" name="date" defaultValue={date} className="input !w-auto" />
        <a className="btn-ghost" href={`?date=${addDays(date, 1)}`}>→</a>
        <input name="q" defaultValue={q} placeholder="Search name" className="input !w-auto flex-1" />
        <button className="btn-ghost">Go</button>
      </form>

      {!clients.data?.length ? (
        <p className="card text-center text-neutral-400">No active clients.</p>
      ) : (
        <div className="space-y-2">
          {clients.data.map((c) => {
            const cur = status.get(c.id) ?? "not_marked";
            return (
              <div key={c.id} className="card space-y-2">
                <p className="font-bold">{c.full_name}</p>
                <div className="grid grid-cols-4 gap-2">
                  {BTNS.map(([val, label, cls]) => (
                    <form key={val} action={markAttendance}>
                      <input type="hidden" name="client_id" value={c.id} />
                      <input type="hidden" name="date" value={date} />
                      <input type="hidden" name="status" value={val} />
                      <button
                        className={`min-h-[44px] w-full rounded-xl text-xs font-bold transition active:scale-95 ${
                          cur === val ? `${cls} ring-2 ring-white` : "border border-edge text-neutral-300"
                        }`}
                      >
                        {label}
                      </button>
                    </form>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="card">
        <h2 className="mb-2 font-bold">Change history for {date}</h2>
        {!audit.data?.length ? (
          <p className="text-sm text-neutral-500">No changes recorded.</p>
        ) : (
          <ul className="space-y-1 text-xs text-neutral-400">
            {audit.data.map((a, i) => (
              <li key={i}>
                {names.get(a.client_id) ?? "Client"}: {a.old_status ?? "new"} → {a.new_status} ·{" "}
                {new Date(a.changed_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
