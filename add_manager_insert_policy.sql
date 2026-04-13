-- Policy to allow managers to insert time off requests for their employees
DROP POLICY IF EXISTS "Managers can insert time off requests for their employees" ON public.time_off_requests;
CREATE POLICY "Managers can insert time off requests for their employees"
ON public.time_off_requests
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = time_off_requests.employee_id
    AND profiles.manager_id = auth.uid()
  )
);

-- Policy to allow managers to update time off requests for their employees
DROP POLICY IF EXISTS "Managers can update time off requests for their employees" ON public.time_off_requests;
CREATE POLICY "Managers can update time off requests for their employees"
ON public.time_off_requests
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = time_off_requests.employee_id
    AND profiles.manager_id = auth.uid()
  )
);

-- Policy to allow admins to insert time off requests for anyone
DROP POLICY IF EXISTS "Admins can insert time off requests for anyone" ON public.time_off_requests;
CREATE POLICY "Admins can insert time off requests for anyone"
ON public.time_off_requests
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Policy to allow admins to update time off requests for anyone
DROP POLICY IF EXISTS "Admins can update time off requests for anyone" ON public.time_off_requests;
CREATE POLICY "Admins can update time off requests for anyone"
ON public.time_off_requests
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Policy to allow managers to update time off balances for their employees
DROP POLICY IF EXISTS "Managers can update time off balances for their employees" ON public.time_off_balances;
CREATE POLICY "Managers can update time off balances for their employees"
ON public.time_off_balances
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = time_off_balances.employee_id
    AND profiles.manager_id = auth.uid()
  )
);

-- Policy to allow managers to insert time off balances for their employees
DROP POLICY IF EXISTS "Managers can insert time off balances for their employees" ON public.time_off_balances;
CREATE POLICY "Managers can insert time off balances for their employees"
ON public.time_off_balances
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = time_off_balances.employee_id
    AND profiles.manager_id = auth.uid()
  )
);

-- Policy to allow admins to update time off balances for anyone
DROP POLICY IF EXISTS "Admins can update time off balances for anyone" ON public.time_off_balances;
CREATE POLICY "Admins can update time off balances for anyone"
ON public.time_off_balances
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Policy to allow admins to insert time off balances for anyone
DROP POLICY IF EXISTS "Admins can insert time off balances for anyone" ON public.time_off_balances;
CREATE POLICY "Admins can insert time off balances for anyone"
ON public.time_off_balances
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);
