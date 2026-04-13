-- ============================================================
-- RLS Policy Hardening for Production Deployment
-- Run this in Supabase SQL Editor BEFORE going live
-- ============================================================

-- ── Blood Donors: Only owner can update their own record ──
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.blood_donors;
CREATE POLICY "Users can update own donor record" ON public.blood_donors 
  FOR UPDATE USING (auth.uid() = user_id);

-- ── Blood Donations: Only donor owner can insert their donations ──
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.blood_donations;
CREATE POLICY "Donor can insert own donations" ON public.blood_donations 
  FOR INSERT WITH CHECK (
    donor_id IN (SELECT id FROM public.blood_donors WHERE user_id = auth.uid())
  );

-- ── Alerts: Allow any authenticated user to insert alerts ──
-- (Needed for cross-user features: emergency alerts, donor matching, etc.)
DROP POLICY IF EXISTS "Users can insert alerts" ON public.alerts;
CREATE POLICY "Authenticated users can insert alerts" ON public.alerts 
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- ── Prevent duplicate donor registrations ──
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'unique_donor_user'
  ) THEN
    ALTER TABLE public.blood_donors ADD CONSTRAINT unique_donor_user UNIQUE (user_id);
  END IF;
END $$;

-- ── Add blood_group CHECK constraint ──
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'valid_blood_group'
  ) THEN
    ALTER TABLE public.blood_donors ADD CONSTRAINT valid_blood_group 
      CHECK (blood_group IN ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'));
  END IF;
END $$;

-- ── Add hospital_city column to blood_requests if missing ──
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'blood_requests' AND column_name = 'hospital_city'
  ) THEN
    ALTER TABLE public.blood_requests ADD COLUMN hospital_city text;
  END IF;
END $$;
