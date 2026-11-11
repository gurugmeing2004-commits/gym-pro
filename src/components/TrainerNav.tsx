"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { LayoutDashboard, Users, CalendarCheck, CalendarOff, Dumbbell, Menu, X } from "lucide-react";
import SignOut from "./SignOut";

const items = [
  { href: "/trainer", label: "Dashboard", icon: LayoutDashboard },
  { href: "/trainer/clients", label: "Clients", icon: Users },
  { href: "/trainer/attendance", label: "Attendance", icon: CalendarCheck },
  { href: "/trainer/leave", label: "Leave", icon: CalendarOff },
  { href: "/trainer/workouts", label: "Workouts", icon: Dumbbell },
];

export default function TrainerNav({ name, pendingLeave }: { name: string; pendingLeave: number }) {
  const [open, setOpen] = useState(false);
  const path = usePathname();
  return (
    <>
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-edge bg-bg/95 p-3 backdrop-blur md:hidden">
        <span className="text-lg font-black">GYM <span className="text-lime">PRO</span></span>
        <button aria-label="Menu" className="btn-ghost !px-3" onClick={() => setOpen(!open)}>
          {open ? <X size={18} /> : <Menu size={18} />}
        </button>
      </header>
      <aside
        className={`${open ? "block" : "hidden"} fixed inset-x-0 top-[61px] z-20 border-b border-edge bg-bg p-3 md:static md:block md:min-h-screen md:w-60 md:shrink-0 md:border-b-0 md:border-r`}
      >
        <div className="mb-4 hidden text-xl font-black md:block">GYM <span className="text-lime">PRO</span></div>
        <nav className="space-y-1">
          {items.map(({ href, label, icon: Icon }) => {
            const active = href === "/trainer" ? path === href : path.startsWith(href);
            return (
              <Link
                key={href} href={href} onClick={() => setOpen(false)}
                className={`flex min-h-[44px] items-center gap-3 rounded-xl px-3 text-sm font-semibold transition ${
                  active ? "bg-lime text-black" : "text-neutral-300 hover:bg-card"
                }`}
              >
                <Icon size={18} /> {label}
                {label === "Leave" && pendingLeave > 0 && (
                  <span className="ml-auto rounded-full bg-red-500 px-2 text-xs text-white">{pendingLeave}</span>
                )}
              </Link>
            );
          })}
        </nav>
        <div className="mt-4 space-y-2 border-t border-edge pt-3">
          <p className="truncate text-xs text-neutral-400">{name}</p>
          <SignOut />
        </div>
      </aside>
    </>
  );
}
