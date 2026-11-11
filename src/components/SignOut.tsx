"use client";
import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";

export default function SignOut() {
  const router = useRouter();
  return (
    <button
      className="btn-ghost w-full"
      onClick={async () => {
        await createClient().auth.signOut();
        router.replace("/login");
        router.refresh();
      }}
    >
      <LogOut size={16} /> Sign out
    </button>
  );
}
