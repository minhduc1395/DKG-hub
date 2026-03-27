-- SQL Script to add invoice fields to advance_requests table
ALTER TABLE public.advance_requests 
ADD COLUMN IF NOT EXISTS has_invoice boolean DEFAULT false;

ALTER TABLE public.advance_requests 
ADD COLUMN IF NOT EXISTS invoice_link text;

-- Update RLS policies if necessary (usually not needed for new columns unless they are used in WHERE clauses of policies)
