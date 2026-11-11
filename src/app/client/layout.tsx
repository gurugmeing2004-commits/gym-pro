import { requireClientRecord } from "@/lib/auth";
import ClientNav from "@/components/ClientNav";
import SignOut from "@/components/SignOut";

export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  const { client } = await requireClientRecord();
  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4 pb-24">
      <header className="flex items-center justify-between">
        <span className="text-lg font-black">GYM <span className="text-lime">PRO</span></span>
        <span className="text-sm text-neutral-400">{client.full_name}</span>
      </header>
      {children}
      <SignOut />
      <ClientNav />
    </div>
  );
}
