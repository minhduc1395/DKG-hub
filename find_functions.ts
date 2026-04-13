import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY!);

async function findFunctions() {
  const { data, error } = await supabase.from('pg_proc').select('proname').ilike('proname', '%sql%');
  console.log('Functions:', data, error);
}
findFunctions();
