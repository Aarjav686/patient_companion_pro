-- SQL Migration script to create Blood Donation module tables

-- Blood donors registration
CREATE TABLE IF NOT EXISTS public.blood_donors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) not null,
  blood_group text not null, -- 'A+','A-','B+','B-','O+','O-','AB+','AB-'
  weight numeric not null,
  age integer not null,
  city text not null,
  last_donation_date date,
  is_active boolean default true,
  total_donations integer default 0,
  created_at timestamptz default now()
);

-- Individual donation log
CREATE TABLE IF NOT EXISTS public.blood_donations (
  id uuid primary key default gen_random_uuid(),
  donor_id uuid references public.blood_donors(id) not null,
  donation_date date not null,
  units_donated integer default 1,
  hospital text not null,
  request_id uuid, -- Reference to blood_requests, created below
  notes text,
  created_at timestamptz default now()
);

-- Blood requests from patients
CREATE TABLE IF NOT EXISTS public.blood_requests (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid references public.profiles(id) not null,
  blood_group_needed text not null,
  units_required integer not null,
  urgency text not null, -- 'Routine', 'Urgent', 'Emergency'
  hospital text not null,
  status text default 'pending', -- 'pending','matched','fulfilled'
  matched_donor_id uuid references public.blood_donors(id),
  notes text,
  created_at timestamptz default now()
);

-- Add the missing foreign key to blood_donations
ALTER TABLE public.blood_donations
  ADD CONSTRAINT fk_blood_request
  FOREIGN KEY (request_id) REFERENCES public.blood_requests(id);


-- Row Level Security (RLS) configuration

ALTER TABLE public.blood_donors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blood_donations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blood_requests ENABLE ROW LEVEL SECURITY;

-- Allow read access to all authenticated users for all lists
CREATE POLICY "Enable read access for all users" ON public.blood_donors FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Enable read access for all users" ON public.blood_donations FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Enable read access for all users" ON public.blood_requests FOR SELECT USING (auth.role() = 'authenticated');

-- Allow insert/update access for authenticated users 
-- Since this is an MVP without a strict API gateway, we trust the logged-in users 
-- to insert entries or update their specific properties (RLS could be made stricter with user_id checks later)
CREATE POLICY "Enable insert for authenticated users" ON public.blood_donors FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable update for authenticated users" ON public.blood_donors FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert for authenticated users" ON public.blood_donations FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable update for authenticated users" ON public.blood_donations FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert for authenticated users" ON public.blood_requests FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable update for authenticated users" ON public.blood_requests FOR UPDATE USING (auth.role() = 'authenticated');
