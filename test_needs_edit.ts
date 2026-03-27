import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();
const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY!);
async function run() {
  const { data, error } = await supabase.from('advance_requests').update({ status: 'Needs_Edit' }).eq('id', '00000000-0000-0000-0000-000000000000');
  console.log(error);
}
run();
