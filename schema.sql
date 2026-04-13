-- Patient Companion Complete Schema for Supabase

-- 1. Profiles Table (extends auth.users)
create table profiles (
  id uuid references auth.users on delete cascade not null primary key,
  role text not null check (role in ('patient', 'doctor')),
  name text not null,
  email text not null,
  age int,
  gender text,
  blood_group text,
  phone text,
  allergies text[] default '{}',
  chronic_conditions text[] default '{}',
  specialization text,
  qualification text,
  hospital text,
  consultation_fee int default 500,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Turn on Security
alter table profiles enable row level security;
-- Everyone can view profiles (so users can find doctors, doctors can see patient details)
create policy "Public profiles are viewable by everyone." on profiles for select using (true);
create policy "Users can insert their own profile." on profiles for insert with check (auth.uid() = id);
create policy "Users can update own profile." on profiles for update using (auth.uid() = id);


-- 2. Appointments
create table appointments (
  id uuid default gen_random_uuid() primary key,
  patient_id uuid references profiles(id) on delete cascade not null,
  doctor_id uuid references profiles(id) on delete cascade not null,
  date date not null,
  time text not null,
  type text not null,
  symptoms text,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'completed', 'cancelled')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table appointments enable row level security;
create policy "Users can view their own appointments" on appointments 
  for select using (auth.uid() = patient_id or auth.uid() = doctor_id);
create policy "Users can insert their own appointments" on appointments 
  for insert with check (auth.uid() = patient_id or auth.uid() = doctor_id);
create policy "Users can update their own appointments" on appointments 
  for update using (auth.uid() = patient_id or auth.uid() = doctor_id);


-- 3. Prescriptions
create table prescriptions (
  id uuid default gen_random_uuid() primary key,
  patient_id uuid references profiles(id) on delete cascade not null,
  doctor_id uuid references profiles(id) on delete cascade not null,
  appointment_id uuid references appointments(id) on delete set null,
  diagnosis text not null,
  advice text,
  medicines jsonb not null default '[]'::jsonb,
  status text not null default 'active',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table prescriptions enable row level security;
create policy "Users can view their own prescriptions" on prescriptions 
  for select using (auth.uid() = patient_id or auth.uid() = doctor_id);
create policy "Doctors can insert prescriptions" on prescriptions 
  for insert with check (auth.uid() = doctor_id);
create policy "Users can update their own prescriptions" on prescriptions 
  for update using (auth.uid() = patient_id or auth.uid() = doctor_id);


-- 4. Lab Tests
create table lab_tests (
  id uuid default gen_random_uuid() primary key,
  patient_id uuid references profiles(id) on delete cascade not null,
  doctor_id uuid references profiles(id) on delete cascade not null,
  test_name text not null,
  category text not null,
  priority text default 'routine',
  status text default 'pending',
  results jsonb,
  notes text,
  report_url text, -- Supabase Storage link
  ordered_at timestamp with time zone default timezone('utc'::text, now()),
  completed_at timestamp with time zone
);

alter table lab_tests enable row level security;
create policy "Users can view their own lab tests" on lab_tests 
  for select using (auth.uid() = patient_id or auth.uid() = doctor_id);
create policy "Doctors can insert lab tests" on lab_tests 
  for insert with check (auth.uid() = doctor_id);
create policy "Doctors can update lab tests" on lab_tests 
  for update using (auth.uid() = doctor_id);


-- 5. Organ Donations
create table organ_donations (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  type text not null check (type in ('donor', 'recipient')),
  organ_type text not null,
  blood_group text not null,
  urgency text default 'normal',
  medical_history text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table organ_donations enable row level security;
-- Allow authenticated users to view organ donations (for matching logic)
create policy "Any authenticated user can view donations" on organ_donations 
  for select to authenticated using (true);
create policy "Users can insert their own donation entries" on organ_donations 
  for insert with check (auth.uid() = user_id);
create policy "Users can update their own donation entries" on organ_donations 
  for update using (auth.uid() = user_id);


-- 6. Alerts
create table alerts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  title text not null,
  message text not null,
  severity text default 'info',
  read boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table alerts enable row level security;
create policy "Users can view their own alerts" on alerts 
  for select using (auth.uid() = user_id);
create policy "Users can insert alerts" on alerts 
  for insert with check (auth.uid() = user_id);
create policy "Users can update their own alerts" on alerts 
  for update using (auth.uid() = user_id);


-- 7. Storage Bucket setup
-- Note: the actual bucket 'lab_reports' must be created in the Storage UI or via API
-- but these are example policies for it:
-- CREATE POLICY "Give authenticated users access to read lab_reports" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'lab_reports');
-- CREATE POLICY "Give authenticated users access to insert lab_reports" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'lab_reports');
