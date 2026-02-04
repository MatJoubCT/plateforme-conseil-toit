#!/usr/bin/env ts-node

/**
 * Script to test which entreprise type values are accepted by the database
 */

// Load environment variables first
import * as dotenv from 'dotenv'
import * as path from 'path'
import { createClient } from '@supabase/supabase-js'

dotenv.config({ path: path.join(__dirname, '..', '.env.local') })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing environment variables')
  console.error('NEXT_PUBLIC_SUPABASE_URL:', SUPABASE_URL ? '✓' : '✗')
  console.error('SUPABASE_SERVICE_ROLE_KEY:', SUPABASE_SERVICE_KEY ? '✓' : '✗')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

const testValues = [
  'consultant',
  'Consultant',
  'CONSULTANT',
  'couvreur',
  'Couvreur',
  'fournisseur',
  'entrepreneur_general',
  'sous_traitant',
  'autre',
  'Autre',
]

async function testEntrepriseTypes() {
  console.log('🧪 Testing which type values are accepted by the database...\n')

  for (const typeValue of testValues) {
    const testData = {
      type: typeValue,
      nom: `Test ${typeValue}`,
      actif: true,
    }

    console.log(`Testing type: "${typeValue}"`)

    const { data, error } = await supabase
      .from('entreprises')
      .insert(testData)
      .select()
      .single()

    if (error) {
      console.log(`  ❌ REJECTED: ${error.message}`)
    } else {
      console.log(`  ✅ ACCEPTED (ID: ${data.id})`)
      // Clean up - delete the test record
      await supabase.from('entreprises').delete().eq('id', data.id)
      console.log(`  🧹 Cleaned up test record`)
    }
    console.log('')
  }

  // Query existing records to see what values are actually stored
  console.log('\n📊 Querying existing entreprise types in database...\n')

  const { data: existing, error: existingError } = await supabase
    .from('entreprises')
    .select('type')
    .limit(100)

  if (existingError) {
    console.log('Could not query existing records:', existingError.message)
  } else if (existing && existing.length > 0) {
    const uniqueTypes = [...new Set(existing.map(e => e.type))]
    console.log('Existing type values in database:')
    uniqueTypes.forEach(type => {
      console.log(`  - "${type}"`)
    })
    console.log(`\nTotal: ${existing.length} records, ${uniqueTypes.length} unique types`)
  } else {
    console.log('No existing entreprises found in database')
  }
}

testEntrepriseTypes()
  .then(() => {
    console.log('\n✅ Test complete')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Test failed:', error)
    process.exit(1)
  })
