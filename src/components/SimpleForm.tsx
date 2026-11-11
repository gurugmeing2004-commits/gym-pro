"use client";
import { useFormState, useFormStatus } from "react-dom";
import { useEffect, useRef } from "react";

type State = { error?: string; ok?: boolean } | undefined;

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return <button className="btn" disabled={pending}>{pending ? "Saving…" : label}</button>;
}

/** Generic form wrapper showing server-action errors and resetting on success. */
export default function SimpleForm({
  action, label, children, className = "space-y-3",
}: {
  action: (s: State, f: FormData) => Promise<State>;
  label: string; children: React.ReactNode; className?: string;
}) {
  const [state, formAction] = useFormState(action, undefined);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => { if (state?.ok) ref.current?.reset(); }, [state]);
  return (
    <form ref={ref} action={formAction} className={className}>
      {children}
      {state?.error && <p className="text-sm text-red-400">{state.error}</p>}
      {state?.ok && <p className="text-sm text-lime">Saved.</p>}
      <Submit label={label} />
    </form>
  );
}
