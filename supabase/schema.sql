-- GYM PRO schema (Phase 1: core). Run in Supabase SQL editor.
create extension if not exists "pgcrypto";

-- ───────── Tables ─────────
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('trainer','client')),
  full_name text not null,
  phone text,
  avatar_url text,
  created_at timestamptz not null default now()
);

create table clients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references profiles(id) on delete set null,
  full_name text not null,
  phone text,
  email text,
  dob date,
  gender text,
  height_cm numeric(5,1),
  current_weight_kg numeric(5,1),
  starting_weight_kg numeric(5,1),
  goal text check (goal in ('Muscle Building','Fat Loss','Strength Training','General Fitness','Body Recomposition','Endurance')),
  experience text,
  membership_start date,
  membership_expiry date,
  emergency_contact text,
  status text not null default 'active' check (status in ('active','inactive')),
  created_at timestamptz not null default now()
);

-- Medical notes live in their own table so clients can never read them.
create table client_medical_notes (
  client_id uuid primary key references clients(id) on delete cascade,
  notes text
);

create table attendance (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  date date not null,
  status text not null check (status in ('present','absent','on_leave','not_marked')),
  marked_by uuid references profiles(id),
  updated_at timestamptz not null default now(),
  unique (client_id, date)          -- no duplicate entries per client per day
);

create table attendance_audit (
  id bigserial primary key,
  client_id uuid not null,
  date date not null,
  old_status text,
  new_status text,
  changed_by uuid,
  changed_at timestamptz not null default now()
);

create table leave_requests (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  start_date date not null,
  end_date date not null,
  reason text not null,
  notes text,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  decided_by uuid references profiles(id),
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  check (end_date >= start_date)
);

create table workout_plans (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  workout_date date not null,
  muscle_group text not null,
  notes text,
  unique (client_id, workout_date)
);

create table workout_exercises (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references workout_plans(id) on delete cascade,
  name text not null,
  sets int not null check (sets > 0),
  target_reps int,
  target_weight_kg numeric(6,2),
  rest_seconds int,
  instructions text,
  trainer_notes text,
  position int not null default 0
);

create table workout_logs (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  plan_exercise_id uuid references workout_exercises(id) on delete set null,
  exercise_name text not null,
  log_date date not null,
  completed boolean not null default false,
  notes text,
  unique (client_id, plan_exercise_id, log_date)
);

create table workout_sets (
  id uuid primary key default gen_random_uuid(),
  log_id uuid not null references workout_logs(id) on delete cascade,
  set_number int not null,
  weight_kg numeric(6,2) not null check (weight_kg >= 0),
  reps int not null check (reps >= 0),
  unique (log_id, set_number)
);

create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  title text not null,
  body text,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index on attendance (client_id, date);
create index on workout_logs (client_id, log_date);
create index on workout_plans (client_id, workout_date);

-- ───────── Volume views (per-set weight × reps, summed) ─────────
create view v_set_volume with (security_invoker = true) as
select l.client_id, l.log_date, l.exercise_name,
       s.weight_kg, s.reps, (s.weight_kg * s.reps) as volume_kg
from workout_sets s join workout_logs l on l.id = s.log_id;

create view v_daily_volume with (security_invoker = true) as
select client_id, log_date, sum(volume_kg) as total_volume_kg,
       sum(reps) as total_reps, max(weight_kg) as max_weight_kg
from v_set_volume group by client_id, log_date;

-- ───────── Helper functions ─────────
create or replace function is_trainer() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'trainer');
$$;

create or replace function my_client_id() returns uuid
language sql stable security definer set search_path = public as $$
  select id from clients where user_id = auth.uid();
$$;

-- ───────── Triggers ─────────
create or replace function log_attendance_change() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into attendance_audit(client_id, date, old_status, new_status, changed_by)
  values (new.client_id, new.date, case when tg_op='UPDATE' then old.status end, new.status, auth.uid());
  return new;
end $$;
create trigger trg_attendance_audit after insert or update of status on attendance
for each row execute function log_attendance_change();

-- Notify trainer on new leave request; on decision, notify client and sync attendance.
create or replace function leave_workflow() returns trigger
language plpgsql security definer set search_path = public as $$
declare d date; cuid uuid; cname text;
begin
  select user_id, full_name into cuid, cname from clients where id = new.client_id;
  if tg_op = 'INSERT' then
    insert into notifications(user_id, title, body)
    select id, 'New leave request', cname || ' requested leave ' || new.start_date || ' to ' || new.end_date
    from profiles where role = 'trainer';
  elsif tg_op = 'UPDATE' and old.status = 'pending' and new.status in ('approved','rejected') then
    if cuid is not null then
      insert into notifications(user_id, title, body)
      values (cuid, 'Leave ' || new.status,
              'Your leave ' || new.start_date || ' to ' || new.end_date || ' was ' || new.status);
    end if;
    if new.status = 'approved' then
      for d in select generate_series(new.start_date, new.end_date, interval '1 day')::date loop
        insert into attendance(client_id, date, status, marked_by)
        values (new.client_id, d, 'on_leave', new.decided_by)
        on conflict (client_id, date) do update set status = 'on_leave', updated_at = now();
      end loop;
    end if;
  end if;
  return new;
end $$;
create trigger trg_leave_ins after insert on leave_requests for each row execute function leave_workflow();
create trigger trg_leave_upd after update on leave_requests for each row execute function leave_workflow();

-- ───────── Row Level Security ─────────
alter table profiles enable row level security;
alter table clients enable row level security;
alter table client_medical_notes enable row level security;
alter table attendance enable row level security;
alter table attendance_audit enable row level security;
alter table leave_requests enable row level security;
alter table workout_plans enable row level security;
alter table workout_exercises enable row level security;
alter table workout_logs enable row level security;
alter table workout_sets enable row level security;
alter table notifications enable row level security;

-- profiles
create policy p_self_read on profiles for select using (id = auth.uid() or is_trainer());
create policy p_trainer_all on profiles for all using (is_trainer()) with check (is_trainer());

-- clients: trainer full control; client reads own row only
create policy c_trainer_all on clients for all using (is_trainer()) with check (is_trainer());
create policy c_self_read on clients for select using (user_id = auth.uid());

-- medical notes: trainer only
create policy m_trainer_all on client_medical_notes for all using (is_trainer()) with check (is_trainer());

-- attendance: trainer writes; client reads own
create policy a_trainer_all on attendance for all using (is_trainer()) with check (is_trainer());
create policy a_self_read on attendance for select using (client_id = my_client_id());
create policy aa_trainer_read on attendance_audit for select using (is_trainer());

-- leave: client creates pending requests for self and reads own; trainer all
create policy l_trainer_all on leave_requests for all using (is_trainer()) with check (is_trainer());
create policy l_self_read on leave_requests for select using (client_id = my_client_id());
create policy l_self_insert on leave_requests for insert
  with check (client_id = my_client_id() and status = 'pending');

-- workout plans & exercises: trainer all; client reads own
create policy wp_trainer_all on workout_plans for all using (is_trainer()) with check (is_trainer());
create policy wp_self_read on workout_plans for select using (client_id = my_client_id());
create policy we_trainer_all on workout_exercises for all using (is_trainer()) with check (is_trainer());
create policy we_self_read on workout_exercises for select
  using (exists (select 1 from workout_plans p where p.id = plan_id and p.client_id = my_client_id()));

-- logs & sets: trainer all; client full control of own
create policy wl_trainer_all on workout_logs for all using (is_trainer()) with check (is_trainer());
create policy wl_self_all on workout_logs for all
  using (client_id = my_client_id()) with check (client_id = my_client_id());
create policy ws_trainer_all on workout_sets for all using (is_trainer()) with check (is_trainer());
create policy ws_self_all on workout_sets for all
  using (exists (select 1 from workout_logs l where l.id = log_id and l.client_id = my_client_id()))
  with check (exists (select 1 from workout_logs l where l.id = log_id and l.client_id = my_client_id()));

-- notifications: own only; trainer may create for anyone
create policy n_self_read on notifications for select using (user_id = auth.uid());
create policy n_self_update on notifications for update using (user_id = auth.uid());
create policy n_trainer_insert on notifications for insert with check (is_trainer());

-- ───────── First trainer ─────────
-- 1) Create a user in Supabase Auth → Users (email + password).
-- 2) Run (replace the id and name):
-- insert into profiles (id, role, full_name) values ('<AUTH_USER_UUID>', 'trainer', 'Head Trainer');
