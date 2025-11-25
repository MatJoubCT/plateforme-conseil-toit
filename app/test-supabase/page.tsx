import { supabase } from '@/lib/supabaseClient'

export default async function TestSupabasePage() {
  const { data, error } = await supabase
    .from('listes_choix')
    .select('id, categorie, code, label, couleur, ordre')
    .order('categorie', { ascending: true })
    .order('ordre', { ascending: true, nullsFirst: true })

  if (error) {
    console.error('Supabase error:', error)
  }

  return (
    <main style={{ padding: 24, fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 16 }}>
        Test Supabase – listes_choix
      </h1>

      {error && (
        <p style={{ color: 'red', marginBottom: 16 }}>
          Erreur Supabase : {error.message}
        </p>
      )}

      {!data || data.length === 0 ? (
        <p>Aucune donnée trouvée.</p>
      ) : (
        <table
          style={{
            borderCollapse: 'collapse',
            border: '1px solid #ccc',
            fontSize: 14,
          }}
        >
          <thead>
            <tr style={{ backgroundColor: '#f5f5f5' }}>
              <th style={{ border: '1px solid #ccc', padding: '4px 8px' }}>
                Catégorie
              </th>
              <th style={{ border: '1px solid #ccc', padding: '4px 8px' }}>
                Code
              </th>
              <th style={{ border: '1px solid #ccc', padding: '4px 8px' }}>
                Label
              </th>
              <th style={{ border: '1px solid #ccc', padding: '4px 8px' }}>
                Couleur
              </th>
              <th style={{ border: '1px solid #ccc', padding: '4px 8px' }}>
                Ordre
              </th>
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr key={row.id}>
                <td style={{ border: '1px solid #ccc', padding: '4px 8px' }}>
                  {row.categorie}
                </td>
                <td style={{ border: '1px solid #ccc', padding: '4px 8px' }}>
                  {row.code}
                </td>
                <td style={{ border: '1px solid #ccc', padding: '4px 8px' }}>
                  {row.label}
                </td>
                <td style={{ border: '1px solid #ccc', padding: '4px 8px' }}>
                  {row.couleur}
                </td>
                <td style={{ border: '1px solid #ccc', padding: '4px 8px' }}>
                  {row.ordre}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  )
}
