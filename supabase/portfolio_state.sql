create table if not exists public.portfolio_state (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_portfolio_state_updated_at on public.portfolio_state;
create trigger set_portfolio_state_updated_at
before update on public.portfolio_state
for each row
execute function public.set_updated_at();

alter table public.portfolio_state enable row level security;

create policy if not exists "Users can read their own portfolio row"
on public.portfolio_state
for select
using (
  auth.uid() is not null
  and id = ('user-' || auth.uid()::text)
);

create policy if not exists "Users can insert their own portfolio row"
on public.portfolio_state
for insert
with check (
  auth.uid() is not null
  and id = ('user-' || auth.uid()::text)
);

create policy if not exists "Users can update their own portfolio row"
on public.portfolio_state
for update
using (
  auth.uid() is not null
  and id = ('user-' || auth.uid()::text)
)
with check (
  auth.uid() is not null
  and id = ('user-' || auth.uid()::text)
);
