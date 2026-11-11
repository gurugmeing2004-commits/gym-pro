import { requireRole } from "@/lib/auth";
import ClientForm from "@/components/ClientForm";
import { createClientAccount } from "../../actions";

export default async function NewClient() {
  await requireRole("trainer");
  return (
    <>
      <h1 className="text-2xl font-black">Add client</h1>
      <p className="text-sm text-neutral-400">Creates the client and their personal login. Share the email and temporary password with them.</p>
      <ClientForm action={createClientAccount} withAccount submitLabel="Create client" />
    </>
  );
}
