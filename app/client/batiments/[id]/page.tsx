'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabaseBrowser } from '@/lib/supabaseBrowser'
import { m2ToFt2 } from '@/lib/units'
import BatimentBassinsMap from '@/components/maps/BatimentBassinsMap'

type GeoJSONPolygon = {
  type: 'Polygon'
  coordinates: number[][][]
}

type BatimentRow = {
  id: string
  name: string | null
  address: string | null
  city: string | null
  postal_code: string | null
  latitude: number | null
  longitude: number | null
}

type ListeChoix = {
  id: string
  categorie: string
  label: string
  couleur: string | null
}

type BassinRow = {
  id: string
  name: string | null
  membrane_type_id: string | null
  surface_m2: number | null
  annee_installation: number | null
  date_derniere_refection: string | null
  etat_id: string | null
  duree_vie_id: string | null
  duree_vie_text: string | null
  reference_interne: string | null
  notes: string | null
  polygone_geojson: GeoJSONPolygon | null
}

type UserProfile = {
  id: string
  user_id: string
  role: string
  client_id: string | null
}

export default function ClientBatimentDetailPage() {
  const params = useParams()
  const router = useRouter()
  const batimentId = params?.id as string

  const [batiment, setBatiment] = useState<BatimentRow | null>(null)
  const [bassins, setBassins] = useState<BassinRow[]>([])
  const [listes, setListes] = useState<ListeChoix[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [hoveredBassinId, setHoveredBassinId] = useState<string | null>(null)

  useEffect(() => {
    if (!batimentId) return

    const fetchData = async () => {
      setLoading(true)
      setErrorMsg(null)

      // 1) Utilisateur courant
      const {
        data: { user },
        error: userError,
      } = await supabaseBrowser.auth.getUser()

      if (userError) {
        setErrorMsg(userError.message)
        setLoading(false)
        return
      }

      if (!user) {
        setErrorMsg('Utilisateur non authentifié.')
        setLoading(false)
        return
      }

      // 2) Profil utilisateur
      const { data: profile, error: profileError } = await supabaseBrowser
        .from('user_profiles')
        .select('id, user_id, role, client_id')
        .eq('user_id', user.id)
        .maybeSingle<UserProfile>()

      if (profileError) {
        setErrorMsg(
          "Impossible de récupérer le profil de l'utilisateur : " +
            profileError.message
        )
        setLoading(false)
        return
      }

      if (!profile || !profile.client_id) {
        setErrorMsg("Aucun client n'est associé à ce profil utilisateur.")
        setLoading(false)
        return
      }

      const clientId = profile.client_id

      // 3) Bâtiment (vérification client)
      const { data: batData, error: batError } = await supabaseBrowser
        .from('batiments')
        .select(
          'id, name, address, city, postal_code, latitude, longitude'
        )
        .eq('id', batimentId)
        .eq('client_id', clientId)
        .maybeSingle<BatimentRow>()

      if (batError) {
        setErrorMsg(
          'Erreur lors du chargement du bâtiment : ' + batError.message
        )
        setLoading(false)
        return
      }

      if (!batData) {
        setErrorMsg("Ce bâtiment n'est pas accessible avec votre compte.")
        setLoading(false)
        return
      }

      // 4) Listes de choix
      const { data: listesData, error: listesError } = await supabaseBrowser
        .from('listes_choix')
        .select('id, categorie, label, couleur')

      if (listesError) {
        setErrorMsg(listesError.message)
        setLoading(false)
        return
      }

      // 5) Bassins
      const { data: bassinsData, error: bassinsError } = await supabaseBrowser
        .from('bassins')
        .select(
          'id, name, membrane_type_id, surface_m2, annee_installation, date_derniere_refection, etat_id, duree_vie_id, duree_vie_text, reference_interne, notes, polygone_geojson'
        )
        .eq('batiment_id', batimentId)
        .order('name', { ascending: true })

      if (bassinsError) {
        setErrorMsg(
          'Erreur lors du chargement des bassins : ' + bassinsError.message
        )
        setLoading(false)
        return
      }

      setBatiment(batData)
      setListes(listesData || [])
      setBassins(bassinsData || [])
      setLoading(false)
    }

    void fetchData()
  }, [batimentId])

  // Maps pour labels / couleurs
  const membranes = listes.filter(l => l.categorie === 'membrane')
  const etats = listes.filter(l => l.categorie === 'etat_bassin')
  const durees = listes.filter(l => l.categorie === 'duree_vie')

  const labelFromId = (
    category: 'membrane' | 'etat_bassin' | 'duree_vie',
    id: string | null
  ) => {
    if (!id) return ''
    const arr =
      category === 'membrane'
        ? membranes
        : category === 'etat_bassin'
        ? etats
        : durees
    return arr.find(l => l.id === id)?.label ?? ''
  }

  const couleurEtat = (id: string | null) => {
    if (!id) return undefined
    const etat = etats.find(e => e.id === id)
    return etat?.couleur || undefined
  }

  if (loading) {
    return <p>Chargement…</p>
  }

  if (errorMsg) {
    return <p style={{ color: 'red' }}>Erreur : {errorMsg}</p>
  }

  if (!batiment) {
    return <p>Bâtiment introuvable.</p>
  }

  const center =
    batiment.latitude != null && batiment.longitude != null
      ? { lat: batiment.latitude, lng: batiment.longitude }
      : { lat: 46.35, lng: -72.55 }

  return (
    <section>
      {/* Fiche bâtiment */}
      <h2 style={{ fontSize: 22, fontWeight: 'bold', marginBottom: 8 }}>
        {batiment.name}
      </h2>
      <p style={{ marginBottom: 16, color: '#555' }}>
        {batiment.address} {batiment.city} {batiment.postal_code}
      </p>

      {/* Carte multi-bassins */}
      <div style={{ marginBottom: 24 }}>
        <h3 style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 8 }}>
          Carte des bassins de toiture
        </h3>
        <p style={{ fontSize: 13, color: '#555', marginBottom: 8 }}>
          Survolez un bassin sur la carte pour le repérer dans le tableau.
          Cliquez sur un bassin pour accéder au détail complet.
        </p>

        <BatimentBassinsMap
          center={center}
          bassins={bassins.map(b => ({
            id: b.id,
            name: b.name ?? '',
            polygon: b.polygone_geojson,
            color: couleurEtat(b.etat_id) ?? '#22c55e',
          }))}
          onHoverBassin={(id: string | null) => setHoveredBassinId(id)}
          onClickBassin={(id: string) => router.push(`/client/bassins/${id}`)}
        />
      </div>

      {/* Tableau bassins */}
      <div
        style={{
          marginBottom: 12,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <h3 style={{ fontSize: 18, fontWeight: 'bold' }}>Bassins de toiture</h3>
      </div>

      {bassins.length === 0 ? (
        <p>Aucun bassin pour ce bâtiment pour le moment.</p>
      ) : (
        <table
          style={{
            borderCollapse: 'collapse',
            border: '1px solid #ccc',
            width: '100%',
            fontSize: 14,
          }}
        >
          <thead>
            <tr style={{ backgroundColor: '#f5f5f5' }}>
              <th style={{ border: '1px solid #ccc', padding: 6 }}>Bassin</th>
              <th style={{ border: '1px solid #ccc', padding: 6 }}>Membrane</th>
              <th style={{ border: '1px solid #ccc', padding: 6 }}>
                Surface (pi²)
              </th>
              <th style={{ border: '1px solid #ccc', padding: 6 }}>
                Année installée
              </th>
              <th style={{ border: '1px solid #ccc', padding: 6 }}>
                Dernière réfection
              </th>
              <th style={{ border: '1px solid #ccc', padding: 6 }}>État</th>
              <th style={{ border: '1px solid #ccc', padding: 6 }}>
                Durée de vie
              </th>
              <th style={{ border: '1px solid #ccc', padding: 6 }}>
                Réf. interne
              </th>
              <th style={{ border: '1px solid #ccc', padding: 6 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {bassins.map(b => {
              const etatColor = couleurEtat(b.etat_id)
              const etatLabel = labelFromId('etat_bassin', b.etat_id)
              const membraneLabel = labelFromId('membrane', b.membrane_type_id)
              const dureeLabel =
                b.duree_vie_text || labelFromId('duree_vie', b.duree_vie_id)
              const surfaceFt2 =
                b.surface_m2 != null ? m2ToFt2(b.surface_m2) : null

              const isHovered = hoveredBassinId === b.id

              return (
                <tr
                  key={b.id}
                  style={{
                    backgroundColor: isHovered ? '#eef2ff' : 'transparent',
                    transition: 'background-color 0.15s ease',
                  }}
                  onMouseEnter={() => setHoveredBassinId(b.id)}
                  onMouseLeave={() => setHoveredBassinId(null)}
                >
                  <td style={{ border: '1px solid #ccc', padding: 6 }}>
                    <Link href={`/client/bassins/${b.id}`}>{b.name}</Link>
                  </td>
                  <td style={{ border: '1px solid #ccc', padding: 6 }}>
                    {membraneLabel}
                  </td>
                  <td style={{ border: '1px solid #ccc', padding: 6 }}>
                    {surfaceFt2 != null ? `${surfaceFt2.toFixed(0)} pi²` : ''}
                  </td>
                  <td style={{ border: '1px solid #ccc', padding: 6 }}>
                    {b.annee_installation ?? ''}
                  </td>
                  <td style={{ border: '1px solid #ccc', padding: 6 }}>
                    {b.date_derniere_refection ?? ''}
                  </td>
                  <td style={{ border: '1px solid #ccc', padding: 6 }}>
                    <span
                      style={{
                        display: 'inline-block',
                        padding: '2px 8px',
                        borderRadius: 999,
                        backgroundColor: etatColor || '#e5e7eb',
                        color: etatColor ? '#ffffff' : '#111827',
                        fontSize: 12,
                      }}
                    >
                      {etatLabel || '—'}
                    </span>
                  </td>
                  <td style={{ border: '1px solid #ccc', padding: 6 }}>
                    {dureeLabel}
                  </td>
                  <td style={{ border: '1px solid #ccc', padding: 6 }}>
                    {b.reference_interne}
                  </td>
                  <td style={{ border: '1px solid #ccc', padding: 6 }}>
                    <Link
                      href={`/client/bassins/${b.id}`}
                      className="btn-secondary"
                    >
                      Voir le bassin
                    </Link>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </section>
  )
}
