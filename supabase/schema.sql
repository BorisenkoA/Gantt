-- Запустіть цей скрипт у Supabase → SQL Editor

create table if not exists crews (
  id int primary key,
  name text not null,
  anchor_date date not null
);

create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  crew_id int not null references crews(id) on delete cascade,
  name text not null,
  duration int not null check (duration > 0),
  color text not null default '#4FC1D1',
  position int not null default 0
);

create index if not exists projects_crew_id_idx on projects (crew_id, position);

-- Дозволяємо читання/запис усім (для простого спільного доступу за посиланням).
-- Для продакшена варто додати авторизацію та звузити політики.
alter table crews enable row level security;
alter table projects enable row level security;

create policy "public read crews" on crews for select using (true);
create policy "public write crews" on crews for all using (true) with check (true);

create policy "public read projects" on projects for select using (true);
create policy "public write projects" on projects for all using (true) with check (true);

-- Увімкнути realtime для миттєвого оновлення в усіх колег
alter publication supabase_realtime add table crews;
alter publication supabase_realtime add table projects;
