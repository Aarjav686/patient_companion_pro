create table health_assessments (
  id uuid default gen_random_uuid() primary key,
  patient_id uuid references profiles(id) on delete cascade not null,
  symptoms jsonb not null default '[]'::jsonb,
  predictions jsonb not null default '[]'::jsonb,
  risk_score int not null,
  risk_level text not null,
  risk_factors jsonb not null default '[]'::jsonb,
  recommendations jsonb not null default '{}'::jsonb,
  alerts jsonb not null default '[]'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table health_assessments enable row level security;

create policy "Users can view their own assessments" on health_assessments 
  for select using (auth.uid() = patient_id);

create policy "Users can insert their own assessments" on health_assessments 
  for insert with check (auth.uid() = patient_id);
