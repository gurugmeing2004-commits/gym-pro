import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { today, addDays, weekStart, monthStart } from "@/lib/dates";
import { attendanceSummary, volumeSummary } from "@/lib/stats";
import ClientForm from "@/components/ClientForm";
import AttendanceCalendar from "@/components/AttendanceCalendar";
import ConfirmButton from "@/components/ConfirmButton";
import { updateClient, setClientStatus, deleteClient } from "../../actions";

export default async function ClientProfile({ params }: { params: { id: string } }) {
  const { supabase } = await requireRole("trainer");
  const { data: client } = await supabase.from("clients").select("*").eq("id", params.id).single();
  if (!client) notFound();
  const t = today();
  const month = monthStart(t);

  const [med, att, sets] = await Promise.all([
    supabase.from("client_medical_notes").select("notes").eq("client_id", client.id).maybeSingle(),
    supabase.from("attendance").select("date, status").eq("client_id", client.id),
    supabase.from("v_set_volume").select("log_date, weight_kg, reps").eq("client_id", client.id).gte("log_date", monthStart(t)),
  ]);
  const attRows = (att.data ?? []) as any[];
  const sum = attendanceSummary(attRows);
  const statuses = Object.fromEntries(attRows.map((r) => [r.date, r.status]));
  const all = sets.data ?? [];
  const ws = weekStart(t);
  const day = volumeSummary(all.filter((s) => s.log_date === t));
  const week = volumeSummary(all.filter((s) => s.log_date >= ws));
  const mon = volumeSummary(all);

  const tiles: [string, string | number][] = [
    ["Present days", sum.present], ["Absent days", sum.absent], ["Leave days", sum.leave],
    ["Attendance", sum.pct + "%"], ["Streak", sum.streak],
    ["Volume today (kg)", Math.round(day.volume).toLocaleString()],
    ["Volume week (kg)", Math.round(week.volume).toLocaleString()],
    ["Volume month (kg)", Math.round(mon.volume).toLocaleString()],
    ["Best weight month (kg)", mon.maxWeight],
    ["Total reps month", mon.reps],
  ];

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-black">{client.full_name}</h1>
          <p className="text-sm text-neutral-400">{client.email} · <span className={client.status === "active" ? "text-lime" : ""}>{client.status}</span></p>
        </div>
        <a href={`/trainer/workouts/${client.id}`} className="btn">Weekly workouts</a>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {tiles.map(([l, v]) => (
          <div key={l} className="card"><p className="stat !text-2xl">{v}</p><p className="text-xs text-neutral-400">{l}</p></div>
        ))}
      </div>
      <p className="text-xs text-neutral-500">
        Volume = Σ(weight × reps) per set. Best weight is the heaviest single set and is shown separately from volume.
        Attendance % excludes approved-leave days.
      </p>

      <div className="card"><AttendanceCalendar month={month} statuses={statuses} /></div>

      <h2 className="text-lg font-bold">Edit details</h2>
      <ClientForm action={updateClient} client={client} medical={med.data?.notes ?? ""} submitLabel="Save changes" />

      <div className="card flex flex-wrap gap-2">
        <form action={setClientStatus}>
          <input type="hidden" name="id" value={client.id} />
          <input type="hidden" name="status" value={client.status === "active" ? "inactive" : "active"} />
          <ConfirmButton className="btn-ghost" message={client.status === "active" ? "Deactivate this client?" : "Reactivate this client?"}>
            {client.status === "active" ? "Deactivate" : "Reactivate"}
          </ConfirmButton>
        </form>
        <form action={deleteClient}>
          <input type="hidden" name="id" value={client.id} />
          <ConfirmButton message="Permanently delete this client and ALL their attendance, leave and workout data? This cannot be undone.">
            Delete permanently
          </ConfirmButton>
        </form>
      </div>
    </>
  );
}
