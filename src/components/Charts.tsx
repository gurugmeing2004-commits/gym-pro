"use client";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, LineChart, Line,
} from "recharts";

const axis = { stroke: "#737373", fontSize: 11 };
const tip = { contentStyle: { background: "#141414", border: "1px solid #262626", borderRadius: 12 } };

export function AttendanceBar({ data }: { data: { label: string; present: number; absent: number }[] }) {
  if (!data.length) return <Empty />;
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data}>
        <CartesianGrid stroke="#262626" vertical={false} />
        <XAxis dataKey="label" {...axis} />
        <YAxis allowDecimals={false} {...axis} />
        <Tooltip {...tip} />
        <Bar dataKey="present" fill="#c6ff00" radius={[4, 4, 0, 0]} />
        <Bar dataKey="absent" fill="#ef4444" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function VolumeLine({ data }: { data: { label: string; volume: number }[] }) {
  if (!data.length) return <Empty />;
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data}>
        <CartesianGrid stroke="#262626" vertical={false} />
        <XAxis dataKey="label" {...axis} />
        <YAxis {...axis} />
        <Tooltip {...tip} formatter={(v: number) => [`${v.toLocaleString()} kg`, "Volume"]} />
        <Line type="monotone" dataKey="volume" stroke="#c6ff00" strokeWidth={2} dot={{ fill: "#c6ff00" }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

function Empty() {
  return <p className="py-10 text-center text-sm text-neutral-500">No data yet.</p>;
}
