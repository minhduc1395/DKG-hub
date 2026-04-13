import { supabase } from './src/lib/supabaseClient';
import * as fs from 'fs';
import * as path from 'path';

async function runMigration() {
  console.log('Starting migration: add_total_days_to_requests.sql');
  
  const sqlPath = path.join(process.cwd(), 'add_total_days_to_requests.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  // We use the rpc 'exec_sql' if it exists, otherwise we'll have to ask the user to run it manually.
  // Based on previous logs, exec_sql might not exist.
  // Let's try to see if we can run it via a direct query if we have service role.
  
  const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

  if (error) {
    console.error('Error running migration:', error);
    console.log('\n--- MANUAL ACTION REQUIRED ---');
    console.log('Please run the following SQL in your Supabase SQL Editor:');
    console.log('\n' + sql);
  } else {
    console.log('Migration completed successfully!');
  }
}

runMigration();
