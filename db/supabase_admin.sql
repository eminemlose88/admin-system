-- 管理员账号表定义（在 Supabase SQL Editor 执行）

create extension if not exists pgcrypto;

create table if not exists public.admin_accounts (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique,
  email text not null unique,
  name text,
  password_hash text,
  role text not null default 'admin', -- admin | superadmin | viewer
  status text not null default 'active', -- active | disabled
  ip_whitelist text[],
  mfa_enabled boolean default false,
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_admin_accounts_email on public.admin_accounts (email);
create index if not exists idx_admin_accounts_role on public.admin_accounts (role);
create index if not exists idx_admin_accounts_status on public.admin_accounts (status);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_admin_accounts_updated_at on public.admin_accounts;
create trigger trg_admin_accounts_updated_at
before update on public.admin_accounts
for each row execute procedure public.set_updated_at();

alter table public.admin_accounts enable row level security;

-- 示例 RLS 策略（按需开启）
-- 仅服务角色或特定角色可读/写
-- 注意：本项目通过后端使用服务密钥访问，无需为匿名开启
drop policy if exists admin_accounts_service_select on public.admin_accounts;
create policy admin_accounts_service_select on public.admin_accounts
for select using (auth.role() = 'service_role');

drop policy if exists admin_accounts_service_write on public.admin_accounts;
create policy admin_accounts_service_write on public.admin_accounts
for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
