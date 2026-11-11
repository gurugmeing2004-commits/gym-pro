import { requireRole } from "@/lib/auth";
import SimpleForm from "@/components/SimpleForm";
import { decideLeave, addManualLeave } from "../actions";

export default async function LeavePage() {
  const { supabase } = await requireRole("trainer");
  const [{ data: reqs }, { data: clients }] = await Promise.all([
    supabase.from("leave_requests")
      .select("id, start_date, end_date, reason, notes, status, created_at, clients(full_name)")
      .order("created_at", { ascending: false }).limit(100),
    supabase.from("clients").select("id, full_name").eq("status", "active").order("full_name"),
  ]);
  const pending = (reqs ?? []).filter((r) => r.status === "pending");
  const history = (reqs ?? []).filter((r) => r.status !== "pending");
  const name = (r: any) => (Array.isArray(r.clients) ? r.clients[0]?.full_name : r.clients?.full_name) ?? "Client";

  return (
    <>
      <h1 className="text-2xl font-black">Leave management</h1>

      <h2 className="font-bold">Pending ({pending.length})</h2>
      {!pending.length && <p className="card text-sm text-neutral-400">No pending requests.</p>}
      {pending.map((r) => (
        <div key={r.id} className="card space-y-2">
          <p className="font-bold">{name(r)}</p>
          <p className="text-sm">{r.start_date} → {r.end_date}</p>
          <p className="text-sm text-neutral-400">{r.reason}{r.notes ? ` — ${r.notes}` : ""}</p>
          <div className="grid grid-cols-2 gap-2">
            {(["approved", "rejected"] as const).map((d) => (
              <form key={d} action={decideLeave}>
                <input type="hidden" name="id" value={r.id} />
                <input type="hidden" name="decision" value={d} />
                <button className={d === "approved" ? "btn w-full" : "btn-danger w-full"}>
                  {d === "approved" ? "Approve" : "Reject"}
                </button>
              </form>
            ))}
          </div>
        </div>
      ))}

      <h2 className="font-bold">Add leave manually</h2>
      <div className="card">
        <SimpleForm action={addManualLeave} label="Add approved leave" className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label">Client</label>
            <select name="client_id" required className="input">
              <option value="">Select…</option>
              {clients?.map((c) => <option key={c.id} value={c.id}>{c.full_name}</option>)}
            </select>
          </div>
          <div><label className="label">Reason</label><input name="reason" required className="input" /></div>
          <div><label className="label">Start</label><input type="date" name="start_date" required className="input" /></div>
          <div><label className="label">End</label><input type="date" name="end_date" required className="input" /></div>
        </SimpleForm>
      </div>

      <h2 className="font-bold">History</h2>
      {!history.length && <p className="card text-sm text-neutral-400">Nothing yet.</p>}
      {history.map((r) => (
        <div key={r.id} className="card flex items-center justify-between text-sm">
          <div><p className="font-semibold">{name(r)}</p><p className="text-xs text-neutral-400">{r.start_date} → {r.end_date} · {r.reason}</p></div>
          <span className={r.status === "approved" ? "text-lime" : "text-red-400"}>{r.status}</span>
        </div>
      ))}
    </>
  );
}
