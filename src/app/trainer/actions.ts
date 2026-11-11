"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { addDays } from "@/lib/dates";

const GOALS = ["Muscle Building", "Fat Loss", "Strength Training", "General Fitness", "Body Recomposition", "Endurance"];
const STATUSES = ["present", "absent", "on_leave", "not_marked"];
const ISO = /^\d{4}-\d{2}-\d{2}$/;

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const num = (f: FormData, k: string) => {
  const v = str(f, k);
  if (v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : NaN;
};
const dateOrNull = (f: FormData, k: string) => {
  const v = str(f, k);
  return v === "" ? null : ISO.test(v) ? v : "invalid";
};

function clientFields(f: FormData) {
  const goal = str(f, "goal");
  const row = {
    full_name: str(f, "full_name"),
    phone: str(f, "phone") || null,
    dob: dateOrNull(f, "dob"),
    gender: str(f, "gender") || null,
    height_cm: num(f, "height_cm"),
    current_weight_kg: num(f, "current_weight_kg"),
    starting_weight_kg: num(f, "starting_weight_kg"),
    goal: goal || null,
    experience: str(f, "experience") || null,
    membership_start: dateOrNull(f, "membership_start"),
    membership_expiry: dateOrNull(f, "membership_expiry"),
    emergency_contact: str(f, "emergency_contact") || null,
  };
  let error = "";
  if (!row.full_name) error = "Name is required.";
  else if (row.goal && !GOALS.includes(row.goal)) error = "Invalid goal.";
  else if ([row.height_cm, row.current_weight_kg, row.starting_weight_kg].some((n) => Number.isNaN(n))) error = "Numbers must be 0 or more.";
  else if ([row.dob, row.membership_start, row.membership_expiry].includes("invalid")) error = "Invalid date.";
  else if (row.membership_start && row.membership_expiry && row.membership_expiry < row.membership_start)
    error = "Expiry must be after start.";
  return { row, error };
}

/* ───────── Clients ───────── */
export async function createClientAccount(_: unknown, f: FormData): Promise<{ error?: string }> {
  await requireRole("trainer");
  const email = str(f, "email").toLowerCase();
  const password = str(f, "password");
  const { row, error } = clientFields(f);
  if (error) return { error };
  if (!/^\S+@\S+\.\S+$/.test(email)) return { error: "Enter a valid email." };
  if (password.length < 8) return { error: "Password must be at least 8 characters." };

  const admin = createAdminClient();
  const { data: created, error: aerr } = await admin.auth.admin.createUser({
    email, password, email_confirm: true,
  });
  if (aerr || !created.user) return { error: aerr?.message ?? "Could not create login." };
  const uid = created.user.id;

  const rollback = async (msg: string) => {
    await admin.auth.admin.deleteUser(uid);
    return { error: msg };
  };
  const p = await admin.from("profiles").insert({ id: uid, role: "client", full_name: row.full_name, phone: row.phone });
  if (p.error) return rollback(p.error.message);
  const c = await admin.from("clients").insert({ ...row, user_id: uid, email }).select("id").single();
  if (c.error) return rollback(c.error.message);
  const med = str(f, "medical_notes");
  if (med) await admin.from("client_medical_notes").insert({ client_id: c.data.id, notes: med });

  revalidatePath("/trainer/clients");
  redirect(`/trainer/clients/${c.data.id}`);
}

export async function updateClient(_: unknown, f: FormData): Promise<{ error?: string; ok?: boolean }> {
  const { supabase } = await requireRole("trainer");
  const id = str(f, "id");
  const { row, error } = clientFields(f);
  if (error) return { error };
  const u = await supabase.from("clients").update(row).eq("id", id);
  if (u.error) return { error: u.error.message };
  await supabase.from("client_medical_notes").upsert({ client_id: id, notes: str(f, "medical_notes") || null });
  revalidatePath(`/trainer/clients/${id}`);
  return { ok: true };
}

export async function setClientStatus(f: FormData) {
  const { supabase } = await requireRole("trainer");
  const id = str(f, "id");
  const status = str(f, "status") === "inactive" ? "inactive" : "active";
  await supabase.from("clients").update({ status }).eq("id", id);
  revalidatePath(`/trainer/clients/${id}`);
  revalidatePath("/trainer/clients");
}

export async function deleteClient(f: FormData) {
  const { supabase } = await requireRole("trainer");
  const id = str(f, "id");
  const { data: c } = await supabase.from("clients").select("user_id").eq("id", id).single();
  await supabase.from("clients").delete().eq("id", id); // cascades attendance, leave, workouts
  if (c?.user_id) await createAdminClient().auth.admin.deleteUser(c.user_id);
  revalidatePath("/trainer/clients");
  redirect("/trainer/clients");
}

/* ───────── Attendance ───────── */
export async function markAttendance(f: FormData) {
  const { supabase, user } = await requireRole("trainer");
  const clientId = str(f, "client_id");
  const date = str(f, "date");
  const status = str(f, "status");
  if (!ISO.test(date) || !STATUSES.includes(status)) return;
  // unique(client_id, date) guarantees no duplicates; upsert edits the existing row (audited by trigger)
  await supabase.from("attendance").upsert(
    { client_id: clientId, date, status, marked_by: user.id, updated_at: new Date().toISOString() },
    { onConflict: "client_id,date" }
  );
  revalidatePath("/trainer/attendance");
  revalidatePath("/trainer");
}

/* ───────── Leave ───────── */
export async function decideLeave(f: FormData) {
  const { supabase, user } = await requireRole("trainer");
  const id = str(f, "id");
  const decision = str(f, "decision") === "approved" ? "approved" : "rejected";
  await supabase.from("leave_requests")
    .update({ status: decision, decided_by: user.id, decided_at: new Date().toISOString() })
    .eq("id", id).eq("status", "pending"); // trigger notifies client + syncs attendance
  revalidatePath("/trainer/leave");
  revalidatePath("/trainer");
}

export async function addManualLeave(_: unknown, f: FormData): Promise<{ error?: string; ok?: boolean }> {
  const { supabase, user } = await requireRole("trainer");
  const client_id = str(f, "client_id");
  const start_date = str(f, "start_date");
  const end_date = str(f, "end_date");
  const reason = str(f, "reason");
  if (!client_id || !ISO.test(start_date) || !ISO.test(end_date) || !reason) return { error: "Fill all fields." };
  if (end_date < start_date) return { error: "End date is before start date." };
  const ins = await supabase.from("leave_requests")
    .insert({ client_id, start_date, end_date, reason, status: "pending" }).select("id").single();
  if (ins.error) return { error: ins.error.message };
  await supabase.from("leave_requests")
    .update({ status: "approved", decided_by: user.id, decided_at: new Date().toISOString() })
    .eq("id", ins.data.id);
  revalidatePath("/trainer/leave");
  return { ok: true };
}

/* ───────── Workout planner ───────── */
export async function saveExercise(_: unknown, f: FormData): Promise<{ error?: string; ok?: boolean }> {
  const { supabase } = await requireRole("trainer");
  const client_id = str(f, "client_id");
  const workout_date = str(f, "workout_date");
  const muscle_group = str(f, "muscle_group");
  const name = str(f, "name");
  const sets = Number(str(f, "sets"));
  if (!ISO.test(workout_date) || !muscle_group || !name) return { error: "Muscle group and exercise name are required." };
  if (!Number.isInteger(sets) || sets < 1 || sets > 20) return { error: "Sets must be 1–20." };
  const reps = num(f, "target_reps"), wt = num(f, "target_weight_kg"), rest = num(f, "rest_seconds");
  if ([reps, wt, rest].some((n) => Number.isNaN(n))) return { error: "Numbers must be 0 or more." };

  let { data: plan } = await supabase.from("workout_plans").select("id")
    .eq("client_id", client_id).eq("workout_date", workout_date).maybeSingle();
  if (!plan) {
    const p = await supabase.from("workout_plans")
      .insert({ client_id, workout_date, muscle_group }).select("id").single();
    if (p.error) return { error: p.error.message };
    plan = p.data;
    const { data: c } = await supabase.from("clients").select("user_id").eq("id", client_id).single();
    if (c?.user_id) {
      await supabase.from("notifications").insert({
        user_id: c.user_id, title: "New workout assigned", body: `${muscle_group} on ${workout_date}`,
      });
    }
  } else {
    await supabase.from("workout_plans").update({ muscle_group }).eq("id", plan.id);
  }
  const { count } = await supabase.from("workout_exercises").select("id", { count: "exact", head: true }).eq("plan_id", plan.id);
  const ins = await supabase.from("workout_exercises").insert({
    plan_id: plan.id, name, sets, target_reps: reps, target_weight_kg: wt, rest_seconds: rest,
    instructions: str(f, "instructions") || null, trainer_notes: str(f, "trainer_notes") || null,
    position: count ?? 0,
  });
  if (ins.error) return { error: ins.error.message };
  revalidatePath(`/trainer/workouts/${client_id}`);
  return { ok: true };
}

export async function updateExercise(f: FormData) {
  const { supabase } = await requireRole("trainer");
  const id = str(f, "id");
  const sets = Number(str(f, "sets"));
  if (!str(f, "name") || !Number.isInteger(sets) || sets < 1) return;
  await supabase.from("workout_exercises").update({
    name: str(f, "name"), sets,
    target_reps: num(f, "target_reps"), target_weight_kg: num(f, "target_weight_kg"),
    rest_seconds: num(f, "rest_seconds"),
    instructions: str(f, "instructions") || null, trainer_notes: str(f, "trainer_notes") || null,
  }).eq("id", id);
  revalidatePath(`/trainer/workouts/${str(f, "client_id")}`);
}

export async function deleteExercise(f: FormData) {
  const { supabase } = await requireRole("trainer");
  await supabase.from("workout_exercises").delete().eq("id", str(f, "id"));
  revalidatePath(`/trainer/workouts/${str(f, "client_id")}`);
}

/** Copy last week's plan into this week for days that have no plan yet. */
export async function duplicatePreviousWeek(f: FormData) {
  const { supabase } = await requireRole("trainer");
  const client_id = str(f, "client_id");
  const week = str(f, "week");
  if (!ISO.test(week)) return;
  const prev = addDays(week, -7);
  const { data: plans } = await supabase.from("workout_plans")
    .select("id, workout_date, muscle_group, notes, workout_exercises(*)")
    .eq("client_id", client_id).gte("workout_date", prev).lt("workout_date", week);
  for (const p of plans ?? []) {
    const date = addDays(p.workout_date, 7);
    const { data: exists } = await supabase.from("workout_plans").select("id")
      .eq("client_id", client_id).eq("workout_date", date).maybeSingle();
    if (exists) continue;
    const np = await supabase.from("workout_plans")
      .insert({ client_id, workout_date: date, muscle_group: p.muscle_group, notes: p.notes }).select("id").single();
    if (np.error) continue;
    const rows = (p.workout_exercises ?? []).map((e: any) => ({
      plan_id: np.data.id, name: e.name, sets: e.sets, target_reps: e.target_reps,
      target_weight_kg: e.target_weight_kg, rest_seconds: e.rest_seconds,
      instructions: e.instructions, trainer_notes: e.trainer_notes, position: e.position,
    }));
    if (rows.length) await supabase.from("workout_exercises").insert(rows);
  }
  revalidatePath(`/trainer/workouts/${client_id}`);
}
