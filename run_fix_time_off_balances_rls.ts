import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY!);

async function run() {
  const sql = fs.readFileSync('fix_time_off_balances_rls.sql', 'utf8');
  const { error } = await supabase.rpc('exec_sql', { sql });
  if (error) {
    console.error('Error executing SQL:', error);
  } else {
    console.log('Successfully updated RLS policies for time_off_balances');
  }
}
run();
