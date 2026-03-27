import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY!);

async function run() {
  const { data: requestData, error: requestError } = await supabase
    .from('advance_requests')
    .insert({
      requester_id: '00000000-0000-0000-0000-000000000000',
      bank_account: 'test',
      total_amount: 100,
      items: [],
      type: 'Advance',
      status: 'Pending_Accountant'
    })
    .select()
    .single();
  console.log('Insert:', requestError);

  if (requestData) {
    const { error: updateError } = await supabase
      .from('advance_requests')
      .update({ status: 'Needs_Edit' })
      .eq('id', requestData.id);
    console.log('Update:', updateError);
  }
}
run();
