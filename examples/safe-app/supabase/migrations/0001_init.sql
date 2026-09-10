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
alter table posts enable row level security;
create policy "read all posts" on posts for select using (true);
create policy "write own posts" on posts for insert with check (auth.uid() = user_id);
create policy "edit own posts" on posts for update using (auth.uid() = user_id);
create policy "delete own posts" on posts for delete using (auth.uid() = user_id);
