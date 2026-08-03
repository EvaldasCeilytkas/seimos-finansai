create extension if not exists pgcrypto;

create table if not exists public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  join_code text not null unique,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.household_members (
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner','member')),
  created_at timestamptz not null default now(),
  primary key (household_id, user_id),
  unique (user_id)
);

create table if not exists public.household_state (
  household_id uuid primary key references public.households(id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

create or replace function public.add_household_creator()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.household_members (household_id, user_id, role)
  values (new.id, new.created_by, 'owner');

  insert into public.household_state (household_id, payload, updated_by)
  values (new.id, '{}'::jsonb, new.created_by)
  on conflict (household_id) do nothing;

  return new;
end;
$$;

drop trigger if exists household_creator_trigger on public.households;
create trigger household_creator_trigger
after insert on public.households
for each row execute function public.add_household_creator();

create or replace function public.join_household_by_code(requested_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  target_household uuid;
begin
  select id into target_household
  from public.households
  where upper(join_code) = upper(trim(requested_code));

  if target_household is null then
    raise exception 'Šeimos kodas nerastas';
  end if;

  if exists (select 1 from public.household_members where user_id = auth.uid()) then
    raise exception 'Naudotojas jau priklauso šeimai';
  end if;

  insert into public.household_members (household_id, user_id, role)
  values (target_household, auth.uid(), 'member');

  return target_household;
end;
$$;

grant execute on function public.join_household_by_code(text) to authenticated;

alter table public.households enable row level security;
alter table public.household_members enable row level security;
alter table public.household_state enable row level security;

create policy "authenticated can create household"
on public.households for insert
to authenticated
with check (created_by = auth.uid());

create policy "members can read household"
on public.households for select
to authenticated
using (
  exists (
    select 1 from public.household_members m
    where m.household_id = households.id
      and m.user_id = auth.uid()
  )
);

create policy "members can read memberships"
on public.household_members for select
to authenticated
using (
  user_id = auth.uid()
  or exists (
    select 1 from public.household_members me
    where me.household_id = household_members.household_id
      and me.user_id = auth.uid()
  )
);

create policy "members can read state"
on public.household_state for select
to authenticated
using (
  exists (
    select 1 from public.household_members m
    where m.household_id = household_state.household_id
      and m.user_id = auth.uid()
  )
);

create policy "members can insert state"
on public.household_state for insert
to authenticated
with check (
  exists (
    select 1 from public.household_members m
    where m.household_id = household_state.household_id
      and m.user_id = auth.uid()
  )
);

create policy "members can update state"
on public.household_state for update
to authenticated
using (
  exists (
    select 1 from public.household_members m
    where m.household_id = household_state.household_id
      and m.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.household_members m
    where m.household_id = household_state.household_id
      and m.user_id = auth.uid()
  )
);
