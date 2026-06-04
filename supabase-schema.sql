create extension if not exists "pgcrypto";

create table if not exists organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  organization_id uuid not null references organizations (id) on delete cascade,
  full_name text not null,
  role text not null default 'sales_rep' check (role in ('admin', 'sales_manager', 'sales_rep')),
  created_at timestamptz not null default now()
);

create table if not exists leads (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  asm_name text not null,
  lead_name text not null,
  mobile text not null,
  status text not null default 'Qualified Not Called' check (status in ('Qualified Not Called', 'Casual Enquiry', 'Franchise', 'Sale Discussion', 'Sale Done', 'Not Responding', 'Quotation Sent', 'Waiting for response', 'Lost')),
  lost_reason text,
  competition_quote text,
  gym_opening_date date,
  sale_value numeric not null default 0,
  layout_plan text,
  call_1_remark text,
  call_2_remark text,
  call_3_remark text,
  remark text,
  next_followup_at timestamptz,
  created_by uuid references profiles (id),
  created_at timestamptz not null default now()
);

create table if not exists followups (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  lead_id uuid not null references leads (id) on delete cascade,
  title text not null,
  priority text not null default 'Medium' check (priority in ('High', 'Medium', 'Low')),
  due_at timestamptz not null,
  completed boolean not null default false,
  created_by uuid references profiles (id),
  created_at timestamptz not null default now()
);

create table if not exists calls (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  lead_id uuid not null references leads (id) on delete cascade,
  outcome text not null,
  summary text not null,
  called_at timestamptz not null,
  created_by uuid references profiles (id),
  created_at timestamptz not null default now()
);

create table if not exists lead_status_history (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  lead_id uuid not null references leads (id) on delete cascade,
  from_status text not null,
  to_status text not null,
  changed_by uuid references profiles (id),
  changed_at timestamptz not null default now()
);

create table if not exists lead_edit_history (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  lead_id uuid not null references leads (id) on delete cascade,
  changed_by uuid references profiles (id),
  changed_at timestamptz not null default now(),
  changes jsonb not null default '[]'::jsonb
);

create table if not exists deleted_leads (
  id uuid primary key default gen_random_uuid(),
  original_lead_id uuid,
  organization_id uuid not null references organizations (id) on delete cascade,
  asm_name text not null,
  lead_name text not null,
  mobile text not null,
  status text not null,
  gym_opening_date date,
  sale_value numeric not null default 0,
  remark text,
  deleted_by uuid references profiles (id),
  deleted_at timestamptz not null default now(),
  lead_snapshot jsonb not null default '{}'::jsonb
);

create table if not exists user_whatsapp_templates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  profile_id uuid not null references profiles (id) on delete cascade,
  catalog_message text not null,
  updated_at timestamptz not null default now(),
  unique (profile_id)
);

alter table leads add column if not exists sale_value numeric not null default 0;
alter table leads add column if not exists layout_plan text;
alter table leads add column if not exists call_1_remark text;
alter table leads add column if not exists call_2_remark text;
alter table leads add column if not exists call_3_remark text;
alter table leads alter column status set default 'Qualified Not Called';

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'leads_status_check'
      and conrelid = 'leads'::regclass
  ) then
    alter table leads drop constraint leads_status_check;
  end if;

  update leads
  set status = 'Qualified Not Called'
  where status = 'Qualified';

  alter table leads
    add constraint leads_status_check
    check (status in ('Qualified Not Called', 'Casual Enquiry', 'Franchise', 'Sale Discussion', 'Sale Done', 'Not Responding', 'Quotation Sent', 'Waiting for response', 'Lost'));
end $$;

alter table profiles enable row level security;
alter table leads enable row level security;
alter table followups enable row level security;
alter table calls enable row level security;
alter table lead_status_history enable row level security;
alter table lead_edit_history enable row level security;
alter table deleted_leads enable row level security;
alter table user_whatsapp_templates enable row level security;

create policy "profiles same org read"
on profiles
for select
using (
  organization_id in (
    select organization_id from profiles where id = auth.uid()
  )
);

create policy "profiles self update"
on profiles
for update
using (id = auth.uid());

create policy "leads same org access"
on leads
for all
using (
  organization_id in (
    select organization_id from profiles where id = auth.uid()
  )
)
with check (
  organization_id in (
    select organization_id from profiles where id = auth.uid()
  )
);

create policy "followups same org access"
on followups
for all
using (
  organization_id in (
    select organization_id from profiles where id = auth.uid()
  )
)
with check (
  organization_id in (
    select organization_id from profiles where id = auth.uid()
  )
);

create policy "calls same org access"
on calls
for all
using (
  organization_id in (
    select organization_id from profiles where id = auth.uid()
  )
)
with check (
  organization_id in (
    select organization_id from profiles where id = auth.uid()
  )
);

create policy "lead status history same org access"
on lead_status_history
for all
using (
  organization_id in (
    select organization_id from profiles where id = auth.uid()
  )
)
with check (
  organization_id in (
    select organization_id from profiles where id = auth.uid()
  )
);

create policy "lead edit history same org access"
on lead_edit_history
for all
using (
  organization_id in (
    select organization_id from profiles where id = auth.uid()
  )
)
with check (
  organization_id in (
    select organization_id from profiles where id = auth.uid()
  )
);

create policy "deleted leads same org access"
on deleted_leads
for all
using (
  organization_id in (
    select organization_id from profiles where id = auth.uid()
  )
)
with check (
  organization_id in (
    select organization_id from profiles where id = auth.uid()
  )
);

create policy "user whatsapp templates same org access"
on user_whatsapp_templates
for all
using (
  organization_id in (
    select organization_id from profiles where id = auth.uid()
  )
)
with check (
  organization_id in (
    select organization_id from profiles where id = auth.uid()
  )
);
