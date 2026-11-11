export type AttRow = { date: string; status: "present" | "absent" | "on_leave" | "not_marked" };

/**
 * Attendance % = present / (present + absent).
 * Approved-leave and not-marked days are excluded from scheduled training days.
 */
export function attendanceSummary(rows: AttRow[]) {
  const present = rows.filter((r) => r.status === "present").length;
  const absent = rows.filter((r) => r.status === "absent").length;
  const leave = rows.filter((r) => r.status === "on_leave").length;
  const scheduled = present + absent;
  const pct = scheduled === 0 ? 0 : Math.round((present / scheduled) * 100);

  // Streak: consecutive present days going back from the most recent marked day.
  // Approved leave days are skipped (they neither extend nor break the streak).
  const sorted = [...rows]
    .filter((r) => r.status !== "not_marked")
    .sort((a, b) => b.date.localeCompare(a.date));
  let streak = 0;
  for (const r of sorted) {
    if (r.status === "on_leave") continue;
    if (r.status === "present") streak++;
    else break;
  }
  return { present, absent, leave, pct, streak };
}

export type SetRow = { weight_kg: number; reps: number };

/** Volume = Σ (weight × reps) per set. Max weight is reported separately. */
export function volumeSummary(sets: SetRow[]) {
  const volume = sets.reduce((a, s) => a + Number(s.weight_kg) * s.reps, 0);
  const reps = sets.reduce((a, s) => a + s.reps, 0);
  const maxWeight = sets.reduce((a, s) => Math.max(a, Number(s.weight_kg)), 0);
  return { volume, reps, maxWeight };
}
