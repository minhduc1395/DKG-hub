-- SQL Script to set up the Supabase project for Documents (NUCLEAR OPTION)
-- This script will drop existing policies and recreate them to ensure everything works.

-- 1. Create Storage Bucket for temporary uploads
INSERT INTO storage.buckets (id, name, public) 
VALUES ('documents', 'documents', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Set Storage Policies
-- Drop existing to avoid conflicts
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
CREATE POLICY "Public Access" 
ON storage.objects FOR ALL 
USING (bucket_id = 'documents')
WITH CHECK (bucket_id = 'documents');

-- 3. Create Tables (if they don't exist)
CREATE TABLE IF NOT EXISTS public.documents (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  title text NOT NULL,
  category_type text CHECK (category_type = ANY (ARRAY['Guideline'::text, 'Template'::text, 'Contract'::text])),
  department text,
  file_type text,
  file_url text,
  drive_folder_id text,
  version text DEFAULT 'v1.0'::text,
  author_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT documents_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.document_history (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  document_id uuid,
  user_id uuid,
  action text,
  timestamp timestamp with time zone DEFAULT now(),
  CONSTRAINT document_history_pkey PRIMARY KEY (id)
);

-- 4. Enable RLS
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_history ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS Policies
-- Drop existing to avoid conflicts
DROP POLICY IF EXISTS "Enable all access for documents" ON public.documents;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.documents;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.documents;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.documents;
DROP POLICY IF EXISTS "Select documents based on department" ON public.documents;
DROP POLICY IF EXISTS "Insert documents based on department" ON public.documents;
DROP POLICY IF EXISTS "Update documents based on ownership or BOD" ON public.documents;
DROP POLICY IF EXISTS "Delete documents only for BOD" ON public.documents;

-- Helper function to check if user is BOD (Department BOD or Role CEO/Chairman)
CREATE OR REPLACE FUNCTION public.is_bod() 
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles p
    -- Try to join with roles if they exist in your schema
    -- This is a common pattern, adjust table/column names if different
    LEFT JOIN job_positions jp ON p.job_position_id = jp.id
    LEFT JOIN roles r ON jp.role_id = r.id
    WHERE p.id = auth.uid() 
    AND (
      p.department = 'BOD' 
      OR r.role_name IN ('ceo', 'chairman', 'bod')
      OR p.role IN ('ceo', 'chairman', 'bod') -- Fallback if role is directly on profile
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Select Policy: BOD sees all, others see their department, 'All', or their own uploads
CREATE POLICY "Select documents based on department" 
ON public.documents FOR SELECT 
USING (
  public.is_bod()
  OR (department = 'All')
  OR (department = (SELECT department FROM profiles WHERE id = auth.uid()))
  OR (author_id = auth.uid())
);

-- Insert Policy: BOD uploads anywhere, others only for their department or 'All'
CREATE POLICY "Insert documents based on department" 
ON public.documents FOR INSERT 
WITH CHECK (
  public.is_bod()
  OR (department = 'All')
  OR (department = (SELECT department FROM profiles WHERE id = auth.uid()))
);

-- Update Policy: BOD updates all, authors update their own
CREATE POLICY "Update documents based on ownership or BOD" 
ON public.documents FOR UPDATE 
USING (
  public.is_bod()
  OR (author_id = auth.uid())
)
WITH CHECK (
  public.is_bod()
  OR (author_id = auth.uid())
);

-- Delete Policy: ONLY BOD can delete
CREATE POLICY "Delete documents only for BOD" 
ON public.documents FOR DELETE 
USING (
  public.is_bod()
);

-- Drop existing history policies
DROP POLICY IF EXISTS "Enable all access for document_history" ON public.document_history;
DROP POLICY IF EXISTS "Select history based on document access" ON public.document_history;
DROP POLICY IF EXISTS "Insert history for own actions" ON public.document_history;

-- Select History: BOD sees all, others see history of docs they can access
CREATE POLICY "Select history based on document access" 
ON public.document_history FOR SELECT 
USING (
  public.is_bod()
  OR (EXISTS (
    SELECT 1 FROM public.documents d 
    WHERE d.id = document_history.document_id 
    AND (
      (d.department = 'All')
      OR (d.department = (SELECT department FROM profiles WHERE id = auth.uid()))
      OR (d.author_id = auth.uid())
    )
  ))
);

-- Insert History: Users log their own actions
CREATE POLICY "Insert history for own actions" 
ON public.document_history FOR INSERT 
WITH CHECK (
  user_id = auth.uid()
);
