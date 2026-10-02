const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = 'https://glmjghaocpdtvzubqphj.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdsbWpnaGFvY3BkdHZ6dWJxcGhqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDY2MjE2MSwiZXhwIjoyMDk2MjM4MTYxfQ.jkr_phKPpqylebrOMlHpXMxrBlVHmFlamrKSjcIrCuw';

const client = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

async function runMigration() {
  try {
    console.log('Running SQL migration...');

    // Read the SQL file
    const sqlPath = path.join(__dirname, '..', 'supabase', 'fix_admin_rpc.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    // Execute each statement separately
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    for (const stmt of statements) {
      if (stmt.startsWith('--')) continue;
      try {
        console.log(`Executing: ${stmt.substring(0, 60)}...`);
        const { data, error } = await client.rpc('pg_execute_server_program', { sql_query: stmt + ';' });
        if (error) {
          console.log(`  Error: ${error.message}`);
        } else {
          console.log('  OK');
        }
      } catch (err) {
        console.log(`  Exception: ${err.message}`);
      }
    }

    // Test the functions
    console.log('\nTesting functions...');
    const { data: stats, error: statsErr } = await client.rpc('get_admin_dashboard_stats');
    console.log('get_admin_dashboard_stats:', statsErr ? `ERROR: ${statsErr.message}` : 'OK - ' + JSON.stringify(stats).substring(0, 100));

    const { data: users, error: usersErr } = await client.rpc('get_admin_users');
    console.log('get_admin_users:', usersErr ? `ERROR: ${usersErr.message}` : `OK - ${users?.length || 0} users`);

    const { data: logs, error: logsErr } = await client.rpc('get_admin_logs', { limit_count: 5 });
    console.log('get_admin_logs:', logsErr ? `ERROR: ${logsErr.message}` : `OK - ${logs?.length || 0} logs`);

    console.log('\nMigration completed!');
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

runMigration();
