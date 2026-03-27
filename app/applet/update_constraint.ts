import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();
const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY!);
async function run() {
  const { error } = await supabase.rpc('exec_sql', { sql: "ALTER TABLE public.advance_requests DROP CONSTRAINT IF EXISTS advance_requests_status_check; ALTER TABLE public.advance_requests ADD CONSTRAINT advance_requests_status_check CHECK (status = ANY (ARRAY['Draft'::text, 'Needs_Edit'::text, 'Pending_Accountant'::text, 'Pending_BOD'::text, 'Approved'::text, 'Rejected'::text, 'Completed'::text]));" });
  console.log(error ? error : 'Success');
}
run();
