import Link from 'next/link'

export default function HomePage() {
  return (
    <main style={{ padding: 32, fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ fontSize: 28, fontWeight: 'bold', marginBottom: 16 }}>
        Plateforme Conseil-Toit
      </h1>

      <p style={{ marginBottom: 24 }}>
        Portail de gestion des bâtiments, bassins de toiture, rapports et garanties.
      </p>

      <p style={{ marginBottom: 12 }}>
        <Link href="/login">Se connecter</Link>
      </p>

      <ul style={{ display: 'flex', gap: 16, listStyle: 'none', padding: 0 }}>
        <li>
          <Link href="/admin">Espace administrateur (temporaire)</Link>
        </li>
        <li>
          <Link href="/client">Espace client (temporaire)</Link>
        </li>
        <li>
          <Link href="/test-supabase">Test Supabase (technique)</Link>
        </li>
      </ul>
    </main>
  )
}
