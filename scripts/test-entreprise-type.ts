#!/usr/bin/env ts-node

/**
 * Script to test which entreprise type values are accepted by the database
 */

// Load environment variables
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.join(__dirname, '..', '.env.local') })

import { supabaseAdmin } from '../lib/supabaseAdmin'

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

    const { data, error } = await supabaseAdmin
      .from('entreprises')
      .insert(testData)
      .select()
      .single()

    if (error) {
      console.log(`  ❌ REJECTED: ${error.message}`)
    } else {
      console.log(`  ✅ ACCEPTED (ID: ${data.id})`)
      // Clean up - delete the test record
      await supabaseAdmin.from('entreprises').delete().eq('id', data.id)
      console.log(`  🧹 Cleaned up test record`)
    }
    console.log('')
  }

  // Also query the database to see what constraint definition exists
  console.log('\n📋 Querying database for constraint definition...\n')

  const { data: constraints, error: constraintError } = await supabaseAdmin
    .rpc('get_table_constraints', { table_name: 'entreprises' })
    .select()

  if (constraintError) {
    console.log('Could not query constraints:', constraintError.message)
  } else {
    console.log('Constraints:', JSON.stringify(constraints, null, 2))
  }

  // Query existing records to see what values are actually stored
  console.log('\n📊 Querying existing entreprise types in database...\n')

  const { data: existing, error: existingError } = await supabaseAdmin
    .from('entreprises')
    .select('type')
    .limit(100)

  if (existingError) {
    console.log('Could not query existing records:', existingError.message)
  } else if (existing) {
    const uniqueTypes = [...new Set(existing.map(e => e.type))]
    console.log('Existing type values in database:')
    uniqueTypes.forEach(type => {
      console.log(`  - "${type}"`)
    })
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
