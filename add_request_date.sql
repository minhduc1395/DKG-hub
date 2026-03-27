-- SQL Script to add request_date field to advance_requests table
ALTER TABLE public.advance_requests 
ADD COLUMN IF NOT EXISTS request_date date DEFAULT CURRENT_DATE;

-- Update existing records to have request_date equal to created_at
UPDATE public.advance_requests 
SET request_date = created_at::date 
WHERE request_date IS NULL;
