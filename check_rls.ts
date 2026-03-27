import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkPolicies() {
  const { data, error } = await supabase.rpc('get_policies_for_table', { table_name: 'advance_requests' });
  
  if (error) {
    console.error('RPC failed, trying direct query if service role key is used...');
    // If RPC doesn't exist, we can't easily query pg_policies from the client unless we have a specific RPC.
    // Let's just output instructions for the user.
  } else {
    console.log(data);
  }
}

checkPolicies();
