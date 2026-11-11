import { requireClientRecord } from "@/lib/auth";
import { today, addDays, dayName } from "@/lib/dates";
import { volumeSummary } from "@/lib/stats";
import { logSets } from "../actions";

export default async function WorkoutPage({ searchParams }: { searchParams: { date?: string } }) {
  const { supabase, client } = await requireClientRecord();
  const t = today();
  const date = /^\d{4}-\d{2}-\d{2}$/.test(searchParams.date ?? "") && searchParams.date! <= t ? searchParams.date! : t;

  const { data: plan } = await supabase.from("workout_plans")
    .select("muscle_group, workout_exercises(*)").eq("client_id", client.id).eq("workout_date", date).maybeSingle();
  const { data: logs } = await supabase.from("workout_logs")
    .select("id, plan_exercise_id, completed, notes, workout_sets(set_number, weight_kg, reps)")
    .eq("client_id", client.id).eq("log_date", date);
  const logBy = new Map((logs ?? []).map((l) => [l.plan_exercise_id, l]));
  const exercises = [...(plan?.workout_exercises ?? [])].sort((a: any, b: any) => a.position - b.position);

  const allSets = (logs ?? []).flatMap((l: any) => l.workout_sets ?? []);
  const total = volumeSummary(allSets);
  const doneCount = (logs ?? []).filter((l) => l.completed).length;
  const pct = exercises.length ? Math.round((doneCount / exercises.length) * 100) : 0;

  return (
    <>
      <div className="flex items-center justify-between">
        <a className="btn-ghost" href={`?date=${addDays(date, -1)}`}>←</a>
        <div className="text-center">
          <p className="font-black">{dayName(date)}</p>
          <p className="text-xs text-neutral-400">{date}</p>
        </div>
        {date < t ? <a className="btn-ghost" href={`?date=${addDays(date, 1)}`}>→</a> : <span className="w-[56px]" />}
      </div>

      {!plan || !exercises.length ? (
        <p className="card text-center text-neutral-400">No workout assigned for this day.</p>
      ) : (
        <>
          <div className="card grid grid-cols-4 gap-2 text-center">
            <div><p className="stat !text-xl">{plan.muscle_group.split(" ")[0]}</p><p className="text-[10px] text-neutral-400">Focus</p></div>
            <div><p className="stat !text-xl">{Math.round(total.volume).toLocaleString()}</p><p className="text-[10px] text-neutral-400">Volume kg</p></div>
            <div><p className="stat !text-xl">{total.maxWeight}</p><p className="text-[10px] text-neutral-400">Best kg</p></div>
            <div><p className="stat !text-xl">{pct}%</p><p className="text-[10px] text-neutral-400">Done</p></div>
          </div>

          {exercises.map((e: any) => {
            const log: any = logBy.get(e.id);
            const saved = [...(log?.workout_sets ?? [])].sort((a: any, b: any) => a.set_number - b.set_number);
            const rows = Math.max(e.sets, saved.length);
            const ex = volumeSummary(saved);
            return (
              <form key={e.id} action={logSets} className="card space-y-3">
                <input type="hidden" name="exercise_id" value={e.id} />
                <input type="hidden" name="log_date" value={date} />
                <input type="hidden" name="set_count" value={rows} />
                <div>
                  <p className="font-bold">{e.name}</p>
                  <p className="text-xs text-neutral-400">
                    Target {e.sets} × {e.target_reps ?? "?"}{e.target_weight_kg ? ` @ ${e.target_weight_kg}kg` : ""}
                    {e.rest_seconds ? ` · rest ${e.rest_seconds}s` : ""}
                  </p>
                  {e.instructions && <p className="text-xs text-lime">{e.instructions}</p>}
                  {e.trainer_notes && <p className="text-xs text-neutral-500">Trainer: {e.trainer_notes}</p>}
                </div>
                {Array.from({ length: rows }, (_, i) => (
                  <div key={i} className="grid grid-cols-[auto_1fr_1fr] items-center gap-2">
                    <span className="w-12 text-xs text-neutral-400">Set {i + 1}</span>
                    <input name={`w_${i}`} type="number" inputMode="decimal" step="0.5" min={0} placeholder="kg"
                      defaultValue={saved[i]?.weight_kg ?? ""} className="input" />
                    <input name={`r_${i}`} type="number" inputMode="numeric" min={0} placeholder="reps"
                      defaultValue={saved[i]?.reps ?? ""} className="input" />
                  </div>
                ))}
                <input name="notes" placeholder="Notes" defaultValue={log?.notes ?? ""} className="input" />
                <label className="flex min-h-[44px] items-center gap-2 text-sm">
                  <input type="checkbox" name="completed" defaultChecked={log?.completed} className="h-5 w-5 accent-lime" />
                  Exercise completed
                </label>
                {saved.length > 0 && (
                  <p className="text-xs text-neutral-400">
                    Saved: volume {Math.round(ex.volume).toLocaleString()} kg · reps {ex.reps} · best {ex.maxWeight} kg
                  </p>
                )}
                <button className="btn w-full">Save sets</button>
              </form>
            );
          })}
          <p className="text-center text-xs text-neutral-500">
            Volume = Σ(weight × reps) for each set. Best weight is your heaviest single set.
          </p>
        </>
      )}
    </>
  );
}
