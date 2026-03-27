-- 1. Update the status check constraint to include 'Needs_Edit'
ALTER TABLE public.advance_requests DROP CONSTRAINT IF EXISTS advance_requests_status_check;
ALTER TABLE public.advance_requests ADD CONSTRAINT advance_requests_status_check 
CHECK (status = ANY (ARRAY['Draft'::text, 'Needs_Edit'::text, 'Pending_Accountant'::text, 'Pending_BOD'::text, 'Approved'::text, 'Rejected'::text, 'Completed'::text]));

-- 2. Update RLS Policies to allow 'Needs_Edit'
-- Drop existing policies that might restrict status
DROP POLICY IF EXISTS "Users can update their own pending advance requests" ON public.advance_requests;

-- Recreate policy to allow updating when status is Pending_Accountant OR Needs_Edit
CREATE POLICY "Users can update their own pending advance requests" 
ON public.advance_requests FOR UPDATE 
USING (
  auth.uid() = requester_id AND status IN ('Pending_Accountant', 'Needs_Edit')
)
WITH CHECK (
  auth.uid() = requester_id AND status IN ('Pending_Accountant', 'Needs_Edit')
);

-- Note: If you have other policies that restrict based on status, you may need to update them as well.
-- For example, if there's a policy for deleting:
DROP POLICY IF EXISTS "Users can delete their own pending advance requests" ON public.advance_requests;
CREATE POLICY "Users can delete their own pending advance requests" 
ON public.advance_requests FOR DELETE 
USING (
  auth.uid() = requester_id AND status IN ('Pending_Accountant', 'Needs_Edit')
);
