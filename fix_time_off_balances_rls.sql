-- SQL Script to fix RLS policies for time_off_balances table

-- 1. Enable RLS
ALTER TABLE public.time_off_balances ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view their own balance" ON public.time_off_balances;
DROP POLICY IF EXISTS "Managers and BOD can view all balances" ON public.time_off_balances;
DROP POLICY IF EXISTS "Managers and BOD can update balances" ON public.time_off_balances;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.time_off_balances;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.time_off_balances;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.time_off_balances;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.time_off_balances;

-- 3. Create new comprehensive policies

-- Select: Users can see their own, Managers can see their team's, BOD can see all
CREATE POLICY "Select time_off_balances" 
ON public.time_off_balances FOR SELECT 
USING (
  auth.uid() = employee_id 
  OR public.is_bod()
  OR EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = time_off_balances.employee_id 
    AND manager_id = auth.uid()
  )
);

-- Insert: BOD and Managers can insert balances for their team
CREATE POLICY "Insert time_off_balances" 
ON public.time_off_balances FOR INSERT 
WITH CHECK (
  public.is_bod()
  OR EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = employee_id 
    AND manager_id = auth.uid()
  )
);

-- Update: BOD and Managers can update balances for their team
CREATE POLICY "Update time_off_balances" 
ON public.time_off_balances FOR UPDATE 
USING (
  public.is_bod()
  OR EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = time_off_balances.employee_id 
    AND manager_id = auth.uid()
  )
)
WITH CHECK (
  public.is_bod()
  OR EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = time_off_balances.employee_id 
    AND manager_id = auth.uid()
  )
);

-- Delete: ONLY BOD can delete balances
CREATE POLICY "Delete time_off_balances" 
ON public.time_off_balances FOR DELETE 
USING (
  public.is_bod()
);
