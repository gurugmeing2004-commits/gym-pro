"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Dumbbell, CalendarCheck, CalendarOff } from "lucide-react";

const items = [
  { href: "/client", label: "Home", icon: Home },
  { href: "/client/workout", label: "Workout", icon: Dumbbell },
  { href: "/client/attendance", label: "Attendance", icon: CalendarCheck },
  { href: "/client/leave", label: "Leave", icon: CalendarOff },
];

export default function ClientNav() {
  const path = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-edge bg-bg/95 backdrop-blur">
      {items.map(({ href, label, icon: Icon }) => {
        const active = href === "/client" ? path === href : path.startsWith(href);
        return (
          <Link
            key={href} href={href}
            className={`flex min-h-[60px] flex-col items-center justify-center gap-1 text-xs font-semibold ${
              active ? "text-lime" : "text-neutral-400"
            }`}
          >
            <Icon size={20} /> {label}
          </Link>
        );
      })}
    </nav>
  );
}
