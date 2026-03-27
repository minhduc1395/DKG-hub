-- Update RLS policies for advance_requests to handle Needs_Edit

-- 1. Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view their own advance requests" ON public.advance_requests;
DROP POLICY IF EXISTS "Accountants and BOD can view all advance requests" ON public.advance_requests;
DROP POLICY IF EXISTS "Users can create their own advance requests" ON public.advance_requests;
DROP POLICY IF EXISTS "Users can update their own pending advance requests" ON public.advance_requests;
DROP POLICY IF EXISTS "Accountants and BOD can update advance requests" ON public.advance_requests;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.advance_requests;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.advance_requests;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON public.advance_requests;
DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON public.advance_requests;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.advance_requests;

-- 2. Create new comprehensive policies
-- We will just enable all access for authenticated users for now to avoid RLS issues, 
-- or we can create proper policies. Let's create proper policies.

-- Select: Users can see their own, Accountants and BOD can see all
CREATE POLICY "Select advance_requests" 
ON public.advance_requests FOR SELECT 
USING (
  auth.uid() = requester_id 
  OR EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND (department = 'Accountant' OR department = 'BOD' OR role IN ('ceo', 'chairman', 'bod', 'accountant'))
  )
);

-- Insert: Users can insert their own
CREATE POLICY "Insert advance_requests" 
ON public.advance_requests FOR INSERT 
WITH CHECK (
  auth.uid() = requester_id
);

-- Update: Users can update their own if Pending_Accountant or Needs_Edit. Accountants/BOD can update any.
CREATE POLICY "Update advance_requests" 
ON public.advance_requests FOR UPDATE 
USING (
  (auth.uid() = requester_id AND status IN ('Pending_Accountant', 'Needs_Edit'))
  OR EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND (department = 'Accountant' OR department = 'BOD' OR role IN ('ceo', 'chairman', 'bod', 'accountant'))
  )
)
WITH CHECK (
  (auth.uid() = requester_id AND status IN ('Pending_Accountant', 'Needs_Edit'))
  OR EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND (department = 'Accountant' OR department = 'BOD' OR role IN ('ceo', 'chairman', 'bod', 'accountant'))
  )
);

-- Delete: Users can delete their own if Pending_Accountant or Needs_Edit
CREATE POLICY "Delete advance_requests" 
ON public.advance_requests FOR DELETE 
USING (
  auth.uid() = requester_id AND status IN ('Pending_Accountant', 'Needs_Edit')
);
