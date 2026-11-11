import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { today, addDays, weekStart, weekDays, dayName, shortDate } from "@/lib/dates";
import SimpleForm from "@/components/SimpleForm";
import ConfirmButton from "@/components/ConfirmButton";
import { saveExercise, updateExercise, deleteExercise, duplicatePreviousWeek } from "../../actions";

// Sample starting point only; the trainer can type any muscle group per day.
const SAMPLE: Record<string, string> = {
  Monday: "Chest", Tuesday: "Back", Wednesday: "Arms", Thursday: "Shoulders",
  Friday: "Legs & Abs", Saturday: "Cardio / Conditioning", Sunday: "Rest Day",
};

export default async function PlanWeek({
  params, searchParams,
}: { params: { clientId: string }; searchParams: { week?: string } }) {
  const { supabase } = await requireRole("trainer");
  const { data: client } = await supabase.from("clients").select("id, full_name").eq("id", params.clientId).single();
  if (!client) notFound();

  const ws = weekStart(/^\d{4}-\d{2}-\d{2}$/.test(searchParams.week ?? "") ? searchParams.week! : today());
  const days = weekDays(ws);
  const { data: plans } = await supabase.from("workout_plans")
    .select("id, workout_date, muscle_group, workout_exercises(*)")
    .eq("client_id", client.id).gte("workout_date", ws).lte("workout_date", days[6]);
  const byDate = new Map((plans ?? []).map((p) => [p.workout_date, p]));

  return (
    <>
      <h1 className="text-2xl font-black">{client.full_name} – week of {shortDate(ws)}</h1>
      <div className="flex flex-wrap gap-2">
        <a className="btn-ghost" href={`?week=${addDays(ws, -7)}`}>← Prev</a>
        <a className="btn-ghost" href={`?week=${addDays(ws, 7)}`}>Next →</a>
        <form action={duplicatePreviousWeek}>
          <input type="hidden" name="client_id" value={client.id} />
          <input type="hidden" name="week" value={ws} />
          <button className="btn-ghost">Copy previous week</button>
        </form>
      </div>

      {days.map((d) => {
        const plan = byDate.get(d);
        const exercises = [...(plan?.workout_exercises ?? [])].sort((a: any, b: any) => a.position - b.position);
        return (
          <section key={d} className="card space-y-3">
            <div className="flex items-baseline justify-between">
              <h2 className="font-bold">{dayName(d)} <span className="text-xs font-normal text-neutral-500">{shortDate(d)}</span></h2>
              <span className="text-sm text-lime">{plan?.muscle_group ?? "Not planned"}</span>
            </div>

            {exercises.map((e: any) => (
              <details key={e.id} className="rounded-xl border border-edge p-3">
                <summary className="cursor-pointer text-sm font-semibold">
                  {e.name} — {e.sets} × {e.target_reps ?? "?"}{e.target_weight_kg ? ` @ ${e.target_weight_kg}kg` : ""}
                </summary>
                <form action={updateExercise} className="mt-3 grid gap-2 sm:grid-cols-3">
                  <input type="hidden" name="id" value={e.id} />
                  <input type="hidden" name="client_id" value={client.id} />
                  <input name="name" defaultValue={e.name} className="input sm:col-span-3" required />
                  <input name="sets" type="number" min={1} defaultValue={e.sets} className="input" placeholder="Sets" />
                  <input name="target_reps" type="number" min={0} defaultValue={e.target_reps ?? ""} className="input" placeholder="Reps" />
                  <input name="target_weight_kg" type="number" step="0.5" min={0} defaultValue={e.target_weight_kg ?? ""} className="input" placeholder="kg" />
                  <input name="rest_seconds" type="number" min={0} defaultValue={e.rest_seconds ?? ""} className="input" placeholder="Rest (s)" />
                  <input name="instructions" defaultValue={e.instructions ?? ""} className="input" placeholder="Instructions" />
                  <input name="trainer_notes" defaultValue={e.trainer_notes ?? ""} className="input" placeholder="Trainer notes" />
                  <button className="btn sm:col-span-3">Save changes</button>
                </form>
                <form action={deleteExercise} className="mt-2">
                  <input type="hidden" name="id" value={e.id} />
                  <input type="hidden" name="client_id" value={client.id} />
                  <ConfirmButton message={`Remove ${e.name}?`}>Remove exercise</ConfirmButton>
                </form>
              </details>
            ))}

            <details>
              <summary className="btn-ghost cursor-pointer">+ Add exercise</summary>
              <SimpleForm action={saveExercise} label="Add" className="mt-3 grid gap-2 sm:grid-cols-3">
                <input type="hidden" name="client_id" value={client.id} />
                <input type="hidden" name="workout_date" value={d} />
                <input name="muscle_group" required defaultValue={plan?.muscle_group ?? SAMPLE[dayName(d)]} placeholder="Muscle group" className="input sm:col-span-3" />
                <input name="name" required placeholder="Exercise (e.g. Bench Press)" className="input sm:col-span-3" />
                <input name="sets" type="number" min={1} defaultValue={3} className="input" placeholder="Sets" />
                <input name="target_reps" type="number" min={0} className="input" placeholder="Target reps" />
                <input name="target_weight_kg" type="number" step="0.5" min={0} className="input" placeholder="Target kg" />
                <input name="rest_seconds" type="number" min={0} className="input" placeholder="Rest (s)" />
                <input name="instructions" className="input" placeholder="Instructions" />
                <input name="trainer_notes" className="input" placeholder="Trainer notes" />
              </SimpleForm>
            </details>
          </section>
        );
      })}
    </>
  );
}
