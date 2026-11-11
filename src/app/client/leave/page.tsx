import { requireClientRecord } from "@/lib/auth";
import { today } from "@/lib/dates";
import SimpleForm from "@/components/SimpleForm";
import { requestLeave } from "../actions";

export default async function ClientLeave() {
  const { supabase, client } = await requireClientRecord();
  const { data: reqs } = await supabase.from("leave_requests")
    .select("id, start_date, end_date, reason, status").eq("client_id", client.id)
    .order("created_at", { ascending: false });
  const color: Record<string, string> = { pending: "text-yellow-400", approved: "text-lime", rejected: "text-red-400" };
  return (
    <>
      <h1 className="text-2xl font-black">Leave</h1>
      <div className="card">
        <SimpleForm action={requestLeave} label="Request leave">
          <div className="grid grid-cols-2 gap-2">
            <div><label className="label">From</label><input type="date" name="start_date" min={today()} required className="input" /></div>
            <div><label className="label">To</label><input type="date" name="end_date" min={today()} required className="input" /></div>
          </div>
          <div><label className="label">Reason</label><input name="reason" required className="input" /></div>
          <div><label className="label">Notes</label><textarea name="notes" className="input min-h-[70px] py-2" /></div>
        </SimpleForm>
      </div>
      <h2 className="font-bold">My requests</h2>
      {!reqs?.length && <p className="card text-sm text-neutral-400">No requests yet.</p>}
      {reqs?.map((r) => (
        <div key={r.id} className="card flex items-center justify-between text-sm">
          <div><p className="font-semibold">{r.start_date} → {r.end_date}</p><p className="text-xs text-neutral-400">{r.reason}</p></div>
          <span className={color[r.status]}>{r.status}</span>
        </div>
      ))}
    </>
  );
}
