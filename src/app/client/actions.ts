"use server";
import { revalidatePath } from "next/cache";
import { requireClientRecord } from "@/lib/auth";
import { today } from "@/lib/dates";

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();

export async function requestLeave(_: unknown, f: FormData): Promise<{ error?: string; ok?: boolean }> {
  const { supabase, client } = await requireClientRecord();
  const start_date = str(f, "start_date");
  const end_date = str(f, "end_date");
  const reason = str(f, "reason");
  if (!ISO.test(start_date) || !ISO.test(end_date) || !reason) return { error: "Dates and reason are required." };
  if (end_date < start_date) return { error: "End date is before start date." };
  if (start_date < today()) return { error: "Leave cannot start in the past." };
  const r = await supabase.from("leave_requests").insert({
    client_id: client.id, start_date, end_date, reason, notes: str(f, "notes") || null, status: "pending",
  });
  if (r.error) return { error: r.error.message };
  revalidatePath("/client/leave");
  return { ok: true };
}

/** Saves all sets for one exercise on one day. Volume is computed from the stored sets. */
export async function logSets(f: FormData) {
  const { supabase, client } = await requireClientRecord();
  const exerciseId = str(f, "exercise_id");
  const logDate = str(f, "log_date");
  if (!ISO.test(logDate) || logDate > today()) return;

  const { data: ex } = await supabase.from("workout_exercises")
    .select("id, name, workout_plans!inner(client_id)").eq("id", exerciseId).single();
  if (!ex) return;

  const sets: { set_number: number; weight_kg: number; reps: number }[] = [];
  const n = Number(str(f, "set_count")) || 0;
  for (let i = 0; i < Math.min(n, 20); i++) {
    const w = str(f, `w_${i}`), r = str(f, `r_${i}`);
    if (w === "" && r === "") continue;
    const weight = Number(w), reps = Number(r);
    if (!Number.isFinite(weight) || weight < 0 || !Number.isInteger(reps) || reps < 0) return;
    sets.push({ set_number: sets.length + 1, weight_kg: weight, reps });
  }

  const log = await supabase.from("workout_logs").upsert({
    client_id: client.id, plan_exercise_id: ex.id, exercise_name: ex.name, log_date: logDate,
    completed: f.get("completed") === "on",
    notes: str(f, "notes") || null,
  }, { onConflict: "client_id,plan_exercise_id,log_date" }).select("id").single();
  if (log.error) return;

  await supabase.from("workout_sets").delete().eq("log_id", log.data.id);
  if (sets.length) await supabase.from("workout_sets").insert(sets.map((s) => ({ ...s, log_id: log.data.id })));
  revalidatePath("/client/workout");
  revalidatePath("/client");
}

export async function markNotificationsRead() {
  const { supabase, user } = await requireClientRecord();
  await supabase.from("notifications").update({ is_read: true }).eq("user_id", user.id).eq("is_read", false);
  revalidatePath("/client");
}
