
import { supabase } from './src/lib/supabaseClient';

async function checkSchema() {
  const { data, error } = await supabase.from('payslips').select('*').limit(1);
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Columns:', Object.keys(data[0] || {}));
    console.log('Sample Data:', data[0]);
  }
}

checkSchema();
