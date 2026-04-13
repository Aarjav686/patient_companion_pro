-- ============================================================
-- Blood Donation Accept Feature Migration
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Add metadata column to alerts table for action data (blood request IDs, etc.)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'alerts' AND column_name = 'metadata'
  ) THEN
    ALTER TABLE public.alerts ADD COLUMN metadata text;
  END IF;
END $$;

-- 2. Allow any authenticated user to insert alerts (needed for cross-user emergency notifications)
-- Drop the old restrictive policy that only allows self-insert
DROP POLICY IF EXISTS "Users can insert alerts" ON public.alerts;
DROP POLICY IF EXISTS "Authenticated users can insert alerts" ON public.alerts;
CREATE POLICY "Authenticated users can insert alerts" ON public.alerts 
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');
