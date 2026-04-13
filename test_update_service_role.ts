import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY!);

async function testUpdate() {
  const { data, error } = await supabase
    .from('time_off_balances')
    .upsert({ 
      employee_id: '00000000-0000-0000-0000-000000000000', 
      year: 2026,
      used: 0,
      total: 14,
      remaining: 14
    }, { onConflict: 'employee_id,year' });
  
  console.log('Update result:', data, error);
}
testUpdate();
