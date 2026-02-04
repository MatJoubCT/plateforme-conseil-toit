// Load environment variables from .env.local
import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(__dirname, '../.env.local') });

import { supabaseAdmin } from '../lib/supabaseAdmin';

async function checkConstraint() {
  console.log('🔍 Investigating entreprises_type_check constraint...\n');

  try {
    // Query 1: Get the constraint definition
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
      console.error('❌ Error querying constraint:', constraintError);
      
      // Alternative: Try direct query using .from() if RPC doesn't exist
      console.log('\n📋 Trying alternative query method...');
      const { data: altData, error: altError } = await supabaseAdmin
        .from('pg_constraint')
        .select('conname, oid')
        .eq('conname', 'entreprises_type_check')
        .single();
      
      if (altError) {
        console.error('❌ Alternative query also failed:', altError);
      } else {
        console.log('✅ Constraint found:', altData);
      }
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
      console.log('✅ Sample row structure:', tableData);
    }

    // Query 3: Try to get column info using information_schema
    console.log('\n📋 Query 3: Getting column information...');
    const { data: columnInfo, error: columnError } = await supabaseAdmin
      .rpc('exec_sql', {
        sql: `
          SELECT 
            column_name,
            data_type,
            is_nullable,
            column_default
          FROM information_schema.columns
          WHERE table_name = 'entreprises' AND column_name = 'type';
        `
      });

    if (columnError) {
      console.error('❌ Error getting column info:', columnError);
    } else {
      console.log('✅ Column info:', columnInfo);
    }

    // Query 4: Get existing type values to see what's currently in the database
    console.log('\n📋 Query 4: Getting distinct type values currently in database...');
    const { data: existingTypes, error: typesError } = await supabaseAdmin
      .from('entreprises')
      .select('type')
      .not('type', 'is', null);

    if (typesError) {
      console.error('❌ Error getting existing types:', typesError);
    } else {
      const uniqueTypes = [...new Set(existingTypes.map((row: any) => row.type))];
      console.log('✅ Existing type values in database:', uniqueTypes);
      console.log(`   Total unique types: ${uniqueTypes.length}`);
    }

    console.log('\n✅ Investigation complete!');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

checkConstraint();
