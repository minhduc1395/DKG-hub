import { supabase } from './src/lib/supabaseClient';

async function checkSchema() {
  const { data, error } = await supabase
    .from('time_off_requests')
    .select('*')
    .limit(1);

  if (error) {
    console.error('Error fetching time_off_requests:', error);
  } else {
    console.log('Columns in time_off_requests:', Object.keys(data[0] || {}));
  }
}

checkSchema();
