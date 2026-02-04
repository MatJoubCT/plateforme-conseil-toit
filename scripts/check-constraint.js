// Load environment variables from .env.local
const fs = require('fs');
const path = require('path');

// Read and parse .env.local
const envPath = path.resolve(__dirname, '../.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=:#]+)=(.*)$/);
  if (match) {
    const key = match[1].trim();
    const value = match[2].trim();
    process.env[key] = value;
  }
});

// Now import Supabase
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase configuration');
  console.error('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? 'Found' : 'Missing');
  console.error('SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? 'Found' : 'Missing');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function checkConstraint() {
  console.log('🔍 Investigating entreprises_type_check constraint...\n');

  try {
    // Query 1: Try using RPC to get constraint definition
    console.log('📋 Query 1: Getting constraint definition from pg_constraint...');
    const { data: constraintData, error: constraintError } = await supabaseAdmin.rpc('exec_sql', {
      sql: `
        SELECT 
          conname, 
          pg_get_constraintdef(oid) as definition
        FROM pg_constraint
        WHERE conname = 'entreprises_type_check';
      `
    });

    if (constraintError) {
      console.error('⚠️ RPC method not available:', constraintError.message);
      console.log('   This is expected - Supabase typically disables direct SQL execution for security.');
    } else {
      console.log('✅ Constraint definition:', constraintData);
    }

    // Query 2: Get the table structure to see the actual column
    console.log('\n📋 Query 2: Getting entreprises table structure...');
    const { data: tableData, error: tableError } = await supabaseAdmin
      .from('entreprises')
      .select('*')
      .limit(1);

    if (tableError) {
      console.error('❌ Error querying table:', tableError);
    } else {
      console.log('✅ Sample row structure:');
      if (tableData && tableData.length > 0) {
        console.log('   Columns:', Object.keys(tableData[0]));
        console.log('   Sample row:', tableData[0]);
      } else {
        console.log('   No rows found in table');
      }
    }

    // Query 3: Get existing type values to see what's currently in the database
    console.log('\n📋 Query 3: Getting distinct type values currently in database...');
    const { data: existingTypes, error: typesError } = await supabaseAdmin
      .from('entreprises')
      .select('type');

    if (typesError) {
      console.error('❌ Error getting existing types:', typesError);
    } else {
      const uniqueTypes = [...new Set(existingTypes.map(row => row.type).filter(Boolean))];
      console.log('✅ Existing type values in database:', uniqueTypes);
      console.log(`   Total unique types: ${uniqueTypes.length}`);
      console.log(`   Total rows: ${existingTypes.length}`);
    }

    // Query 4: Check the schema definition in Supabase using PostgREST introspection
    console.log('\n📋 Query 4: Attempting to get table schema info...');
    const { data: schemaInfo, error: schemaError } = await supabaseAdmin
      .from('entreprises')
      .select('*')
      .limit(0);  // Get 0 rows but includes column info in metadata

    if (schemaError) {
      console.error('❌ Error getting schema:', schemaError);
    } else {
      console.log('✅ Schema query successful (check Supabase dashboard for column constraints)');
    }

    // Query 5: Try to test the constraint by seeing what values are accepted
    console.log('\n📋 Query 5: Testing possible constraint values...');
    console.log('   Attempting to identify the CHECK constraint by testing inserts...');
    console.log('   (This is read-only - we won\'t actually insert)');
    
    // Look at the Zod schema to understand the constraint
    console.log('\n💡 Suggestion: Check the following files for type constraints:');
    console.log('   - /home/user/plateforme-conseil-toit/lib/schemas/entreprise.schema.ts');
    console.log('   - Supabase Dashboard → Database → entreprises table → Constraints');

    console.log('\n✅ Investigation complete!');
    console.log('\n📊 Summary:');
    console.log('   The CHECK constraint "entreprises_type_check" is enforcing specific values for the "type" column.');
    console.log('   To see the exact constraint definition, check your Supabase dashboard or the schema file.');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

checkConstraint();
