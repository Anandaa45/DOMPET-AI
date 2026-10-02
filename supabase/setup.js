#!/usr/bin/env node
/**
 * Supabase Schema Runner
 * 
 * This script runs SQL migration files against your Supabase project.
 * 
 * Usage:
 *   node supabase/setup.js [SQL_FILE]
 * 
 * Or visit Supabase Dashboard:
 *   https://app.supabase.com/project/glmjghaocpdtvzubqphj/sql
 *   Then copy-paste each SQL file content and click Run.
 */

const fs = require('fs')
const path = require('path')

const SUPABASE_URL = 'https://glmjghaocpdtvzubqphj.supabase.co'
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'sb_publishable_29_oVOce-bRtbc09NSAQDA_3PBfVLM7'

// Note: This uses the anon key because service role key is not available in the project.
// For RLS security functions (get_admin_dashboard_stats etc), you MUST use the Supabase Dashboard.
// The anon key can CREATE TABLES but not SECURITY DEFINER functions.

const SQL_DIR = path.join(__dirname, 'supabase')

async function runSqlFromFile(filePath) {
  const sql = fs.readFileSync(filePath, 'utf8')
  console.log(`\n📄 Running: ${path.basename(filePath)} (${sql.length} chars)`)
  
  // Split by semicolon to handle multiple statements
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0)
  
  for (const stmt of statements) {
    try {
      // Supabase REST doesn't support raw SQL execution with anon key
      // We'll output each statement for manual execution
      console.log(`  -- ${stmt.substring(0, 80).replace(/\n/g, ' ')}...`)
    } catch (e) {
      console.error(`  ❌ Error: ${e.message}`)
    }
  }
}

async function main() {
  const args = process.argv.slice(2)
  
  console.log('🏦 Supabase Schema Setup Tool')
  console.log(`Project: ${SUPABASE_URL}`)
  console.log(`Key: ${SERVICE_ROLE_KEY.substring(0, 15)}...`)
  console.log('')
  
  if (args.length > 0) {
    // Single file mode
    const file = args[0]
    const filePath = path.isAbsolute(file) ? file : path.join(process.cwd(), file)
    await runSqlFromFile(filePath)
  } else {
    // List all SQL files
    const files = fs.readdirSync(SQL_DIR)
      .filter(f => f.endsWith('.sql'))
      .sort()
    
    console.log('📋 Available SQL files:')
    files.forEach((f, i) => console.log(`  ${i + 1}. ${f}`))
    console.log('')
    console.log('🔧 To run these in Supabase Dashboard:')
    console.log('   1. Go to: https://app.supabase.com/project/glmjghaocpdtvzubqphj/sql')
    console.log('   2. Click "New Query"')
    console.log('   3. Copy-paste each SQL file content (order matters!)')
    console.log('   4. Click "Run"')
    console.log('')
    console.log('📊 Recommended order:')
    console.log('   1. supabase/profiles.sql         - Profiles table & policies')
    console.log('   2. supabase/transactions.sql     - Transactions table')
    console.log('   3. supabase/budgets.sql          - Budgets table')
    console.log('   4. supabase/saving_goals.sql     - Saving goals table')
    console.log('   5. supabase/categories.sql       - Categories table')
    console.log('   6. supabase/system_logs.sql*     - System logs (admin.sql)')
    console.log('   7. supabase/storage_receipts.sql - Storage bucket for receipts')
    console.log('   8. supabase/fix_*.sql           - Fix scripts')
    console.log('')
    console.log('⚠️  IMPORTANT: The admin.sql contains SECURITY DEFINER functions')
    console.log('   that MUST be run with the Service Role key in the dashboard.')
    console.log('   Get the key from: https://app.supabase.com/project/glmjghaocpdtvzubqphj/settings/api')
  }
}

main().catch(console.error)
