/** Month calendar: green present, red absent, yellow approved leave, grey not marked. */
const COLORS: Record<string, string> = {
  present: "bg-green-500 text-black",
  absent: "bg-red-500 text-white",
  on_leave: "bg-yellow-400 text-black",
  not_marked: "bg-neutral-700 text-neutral-200",
};

export default function AttendanceCalendar({
  month, statuses,
}: { month: string; statuses: Record<string, string> }) {
  const first = new Date(month.slice(0, 8) + "01T00:00:00Z");
  const days = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
  const offset = (first.getUTCDay() + 6) % 7;
  const cells: (number | null)[] = [...Array(offset).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  return (
    <div>
      <p className="mb-2 text-sm font-bold">
        {first.toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" })}
      </p>
      <div className="grid grid-cols-7 gap-1 text-center text-xs">
        {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
          <span key={i} className="text-neutral-500">{d}</span>
        ))}
        {cells.map((d, i) => {
          if (d === null) return <span key={i} />;
          const iso = `${month.slice(0, 8)}${String(d).padStart(2, "0")}`;
          const s = statuses[iso] ?? "not_marked";
          return (
            <span key={i} className={`flex h-9 items-center justify-center rounded-lg font-semibold ${COLORS[s]}`}>{d}</span>
          );
        })}
      </div>
      <div className="mt-2 flex flex-wrap gap-3 text-xs text-neutral-400">
        <span><i className="mr-1 inline-block h-2 w-2 rounded bg-green-500" />Present</span>
        <span><i className="mr-1 inline-block h-2 w-2 rounded bg-red-500" />Absent</span>
        <span><i className="mr-1 inline-block h-2 w-2 rounded bg-yellow-400" />Leave</span>
        <span><i className="mr-1 inline-block h-2 w-2 rounded bg-neutral-700" />Not marked</span>
      </div>
    </div>
  );
}
