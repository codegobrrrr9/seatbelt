create table profiles (
  id uuid primary key references auth.users(id),
  username text unique,
  created_at timestamptz default now()
);
alter table profiles enable row level security;
create policy "own profile" on profiles for all using (auth.uid() = id);

create table posts (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id),
  title text,
  body text,
  created_at timestamptz default now()
);
