"use client";
import { useFormState, useFormStatus } from "react-dom";

const GOALS = ["Muscle Building", "Fat Loss", "Strength Training", "General Fitness", "Body Recomposition", "Endurance"];

type State = { error?: string; ok?: boolean } | undefined;

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return <button className="btn w-full sm:w-auto" disabled={pending}>{pending ? "Saving…" : label}</button>;
}

function F({ label, name, type = "text", defaultValue, required, step }: any) {
  return (
    <div>
      <label className="label">{label}</label>
      <input className="input" name={name} type={type} defaultValue={defaultValue ?? ""} required={required} step={step} />
    </div>
  );
}

export default function ClientForm({
  action, client, medical, withAccount, submitLabel,
}: {
  action: (s: State, f: FormData) => Promise<State>;
  client?: any; medical?: string; withAccount?: boolean; submitLabel: string;
}) {
  const [state, formAction] = useFormState(action, undefined);
  const c = client ?? {};
  return (
    <form action={formAction} className="card grid gap-3 sm:grid-cols-2">
      {client && <input type="hidden" name="id" value={client.id} />}
      <F label="Full name *" name="full_name" defaultValue={c.full_name} required />
      <F label="Phone" name="phone" type="tel" defaultValue={c.phone} />
      {withAccount && (
        <>
          <F label="Login email *" name="email" type="email" required />
          <F label="Temporary password * (min 8)" name="password" type="password" required />
        </>
      )}
      <F label="Date of birth" name="dob" type="date" defaultValue={c.dob} />
      <div>
        <label className="label">Gender (optional)</label>
        <select className="input" name="gender" defaultValue={c.gender ?? ""}>
          <option value="">—</option><option>Male</option><option>Female</option><option>Other</option>
        </select>
      </div>
      <F label="Height (cm)" name="height_cm" type="number" step="0.1" defaultValue={c.height_cm} />
      <F label="Starting weight (kg)" name="starting_weight_kg" type="number" step="0.1" defaultValue={c.starting_weight_kg} />
      <F label="Current weight (kg)" name="current_weight_kg" type="number" step="0.1" defaultValue={c.current_weight_kg} />
      <div>
        <label className="label">Fitness goal</label>
        <select className="input" name="goal" defaultValue={c.goal ?? ""}>
          <option value="">—</option>{GOALS.map((g) => <option key={g}>{g}</option>)}
        </select>
      </div>
      <div>
        <label className="label">Training experience</label>
        <select className="input" name="experience" defaultValue={c.experience ?? ""}>
          <option value="">—</option><option>Beginner</option><option>Intermediate</option><option>Advanced</option>
        </select>
      </div>
      <F label="Emergency contact" name="emergency_contact" defaultValue={c.emergency_contact} />
      <F label="Membership start" name="membership_start" type="date" defaultValue={c.membership_start} />
      <F label="Membership expiry" name="membership_expiry" type="date" defaultValue={c.membership_expiry} />
      <div className="sm:col-span-2">
        <label className="label">Medical / injury notes (trainer only)</label>
        <textarea className="input min-h-[80px] py-2" name="medical_notes" defaultValue={medical ?? ""} />
      </div>
      {state?.error && <p className="text-sm text-red-400 sm:col-span-2">{state.error}</p>}
      {state?.ok && <p className="text-sm text-lime sm:col-span-2">Saved.</p>}
      <div className="sm:col-span-2"><Submit label={submitLabel} /></div>
    </form>
  );
}
