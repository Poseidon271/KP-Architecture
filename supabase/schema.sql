-- ==============================================================================
-- K.P. ARCHITECTS — PRODUCTION SUPABASE POSTGRESQL SCHEMA
-- Table: enquiries
-- ==============================================================================

-- 1. Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Create enquiries table
CREATE TABLE IF NOT EXISTS public.enquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Client Information
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  organization TEXT,
  
  -- Project Details
  project_type TEXT NOT NULL,
  disciplines TEXT[] DEFAULT '{}',
  location TEXT NOT NULL,
  project_requirement TEXT,
  scale TEXT,
  message TEXT,
  
  -- Lead Management & Admin
  status TEXT NOT NULL DEFAULT 'new' 
    CHECK (status IN ('new', 'contacted', 'in_progress', 'site_visit', 'proposal', 'converted', 'closed', 'archived')),
  priority TEXT NOT NULL DEFAULT 'normal' 
    CHECK (priority IN ('normal', 'high', 'urgent')),
  admin_notes TEXT,
  source TEXT NOT NULL DEFAULT 'website',
  last_contacted_at TIMESTAMPTZ,
  consultation_ref TEXT
);

-- 3. Indexes for high-performance searching & filtering
CREATE INDEX IF NOT EXISTS idx_enquiries_status ON public.enquiries (status);
CREATE INDEX IF NOT EXISTS idx_enquiries_priority ON public.enquiries (priority);
CREATE INDEX IF NOT EXISTS idx_enquiries_project_type ON public.enquiries (project_type);
CREATE INDEX IF NOT EXISTS idx_enquiries_created_at ON public.enquiries (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_enquiries_email ON public.enquiries (email);

-- 4. Trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_enquiries_updated_at ON public.enquiries;
CREATE TRIGGER set_enquiries_updated_at
BEFORE UPDATE ON public.enquiries
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

-- Enable RLS
ALTER TABLE public.enquiries ENABLE ROW LEVEL SECURITY;

-- 1. Public / Anon Insert: Anyone can insert a new project enquiry
DROP POLICY IF EXISTS "Public can submit enquiries" ON public.enquiries;
CREATE POLICY "Public can submit enquiries"
ON public.enquiries
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- 2. Authenticated Admin Full Access (SELECT, UPDATE, DELETE)
DROP POLICY IF EXISTS "Authenticated users have full access" ON public.enquiries;
CREATE POLICY "Authenticated users have full access"
ON public.enquiries
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Explicitly disallow public (anon) from reading, updating, or deleting
-- (With RLS enabled, omitting SELECT/UPDATE/DELETE policies for 'anon' automatically denies them)
