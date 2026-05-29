create extension if not exists pgcrypto;

create type public.user_role as enum ('resident', 'shipper', 'admin');
create type public.parcel_status as enum ('created', 'stored', 'picked_up', 'cancelled');
create type public.compartment_status as enum ('available', 'reserved', 'occupied', 'maintenance');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  phone text,
  role public.user_role not null default 'resident',
  building text,
  created_at timestamptz not null default now()
);

create table public.lockers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  location text not null,
  qr_code text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.compartments (
  id uuid primary key default gen_random_uuid(),
  locker_id uuid not null references public.lockers(id) on delete cascade,
  code text not null,
  size text not null check (size in ('S', 'M', 'L')),
  status public.compartment_status not null default 'available',
  unique (locker_id, code)
);

create table public.parcels (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  receiver_id uuid references public.profiles(id),
  shipper_id uuid references public.profiles(id),
  receiver_label text not null,
  locker_id uuid references public.lockers(id),
  compartment_id uuid references public.compartments(id),
  compartment_code text,
  size text not null check (size in ('S', 'M', 'L')),
  cod_amount integer not null default 0,
  status public.parcel_status not null default 'created',
  pickup_otp text not null default lpad((floor(random() * 1000000))::text, 6, '0'),
  stored_at timestamptz,
  picked_up_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id) on delete cascade,
  parcel_id uuid references public.parcels(id) on delete cascade,
  title text not null,
  body text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.access_events (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id),
  parcel_id uuid references public.parcels(id),
  locker_id uuid references public.lockers(id),
  compartment_id uuid references public.compartments(id),
  action text not null,
  result text not null,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.parcels enable row level security;
alter table public.notifications enable row level security;
alter table public.lockers enable row level security;
alter table public.compartments enable row level security;
alter table public.access_events enable row level security;

create policy "profiles read own" on public.profiles
  for select using (auth.uid() = id);

create policy "profiles update own" on public.profiles
  for update using (auth.uid() = id);

create policy "profiles insert own" on public.profiles
  for insert with check (auth.uid() = id);

create policy "lockers public read" on public.lockers
  for select using (is_active = true);

create policy "compartments public read" on public.compartments
  for select using (true);

create policy "parcels read participant" on public.parcels
  for select using (auth.uid() = receiver_id or auth.uid() = shipper_id);

create policy "shipper creates parcels" on public.parcels
  for insert with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('shipper', 'admin')
    )
  );

create policy "participants update parcels" on public.parcels
  for update using (auth.uid() = receiver_id or auth.uid() = shipper_id);

create policy "notifications read own" on public.notifications
  for select using (auth.uid() = profile_id);

create policy "notifications update own" on public.notifications
  for update using (auth.uid() = profile_id);

create policy "access event read own" on public.access_events
  for select using (auth.uid() = profile_id);

create policy "access event insert own" on public.access_events
  for insert with check (auth.uid() = profile_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

insert into public.lockers (name, location, qr_code)
values ('SmartLocker 05', 'Sảnh A - Bình Dương, Việt Nam', 'SL-LOCKER-05')
on conflict (qr_code) do nothing;

insert into public.compartments (locker_id, code, size)
select id, code, size
from public.lockers
cross join (
  values ('01', 'S'), ('02', 'S'), ('03', 'S'), ('04', 'M'), ('05', 'M'), ('06', 'M'), ('07', 'L'), ('08', 'L'), ('09', 'L')
) as c(code, size)
where qr_code = 'SL-LOCKER-05'
on conflict (locker_id, code) do nothing;
