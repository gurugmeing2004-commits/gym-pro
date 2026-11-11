import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type Role = "trainer" | "client";

export async function requireRole(role: Role) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase
    .from("profiles").select("id, role, full_name").eq("id", user.id).single();
  if (!profile) redirect("/login");
  if (profile.role !== role) redirect(profile.role === "trainer" ? "/trainer" : "/client");
  return { supabase, user, profile };
}

/** Client record for the signed-in member (RLS guarantees it is their own). */
export async function requireClientRecord() {
  const ctx = await requireRole("client");
  const { data: client } = await ctx.supabase
    .from("clients").select("*").eq("user_id", ctx.user.id).single();
  if (!client) redirect("/login");
  return { ...ctx, client };
}
