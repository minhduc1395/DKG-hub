-- Add approved_by column to time_off_requests table
ALTER TABLE public.time_off_requests 
ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES public.profiles(id);

-- Update RLS policies if necessary
-- Usually, if the table is already enabled for RLS, the new column will be covered by existing policies.
