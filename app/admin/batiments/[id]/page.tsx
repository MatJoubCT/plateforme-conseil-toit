'use client'

import { useEffect, useState, FormEvent } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabaseBrowser'
import Link from 'next/link'
import { m2ToFt2 } from '@/lib/units'
import { GoogleMap, Polygon, useLoadScript } from '@react-google-maps/api'

const MAP_LIBRARIES = ['drawing', 'geometry'] as const

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

export default function AdminBatimentDetailPage() {
  const params = useParams()
  const batimentId = params?.id as string

  const [batiment, setBatiment] = useState<BatimentRow | null>(null)
  const [bassins, setBassins] = useState<BassinRow[]>([])
  const [listes, setListes] = useState<ListeChoix[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // état modal
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editingBassin, setEditingBassin] = useState<BassinRow | null>(null)
  const [modalTitle, setModalTitle] = useState('Nouveau bassin')

  const [formName, setFormName] = useState('')
  const [formMembraneId, setFormMembraneId] = useState('')
  const [formSurface, setFormSurface] = useState('') // en pi² dans l’UI
  const [formAnneeInstalle, setFormAnneeInstalle] = useState('')
  const [formDateDerniere, setFormDateDerniere] = useState('')
  const [formEtatId, setFormEtatId] = useState('')
  const [formDureeVieId, setFormDureeVieId] = useState('')
  const [formReference, setFormReference] = useState('')
  const [formNotes, setFormNotes] = useState('')

  // survol d’un bassin (carte ↔ tableau)
  const [hoveredBassinId, setHoveredBassinId] = useState<string | null>(null)

  useEffect(() => {
    if (!batimentId) return

    const fetchData = async () => {
      setLoading(true)
      setErrorMsg(null)

      // 1) Bâtiment
      const { data: batData, error: batError } = await supabaseBrowser
        .from('batiments')
        .select(
          'id, name, address, city, postal_code, latitude, longitude'
        )
        .eq('id', batimentId)
        .single()

      if (batError) {
        setErrorMsg(batError.message)
        setLoading(false)
        return
      }

      // 2) Listes de choix
      const { data: listesData, error: listesError } = await supabaseBrowser
        .from('listes_choix')
        .select('id, categorie, label, couleur')

      if (listesError) {
        setErrorMsg(listesError.message)
        setLoading(false)
        return
      }

      // 3) Bassins de ce bâtiment
      const { data: bassinsData, error: bassinsError } = await supabaseBrowser
        .from('bassins')
        .select(
          'id, name, membrane_type_id, surface_m2, annee_installation, date_derniere_refection, etat_id, duree_vie_id, duree_vie_text, reference_interne, notes, polygone_geojson'
        )
        .eq('batiment_id', batimentId)
        .order('name', { ascending: true })

      if (bassinsError) {
        setErrorMsg(bassinsError.message)
        setLoading(false)
        return
      }

      setBatiment(batData as BatimentRow)
      setListes(listesData || [])
      setBassins(bassinsData || [])
      setLoading(false)
    }

    void fetchData()
  }, [batimentId])

  // Maps pour retrouver les labels / couleurs
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

  // --------- MODAL : ouverture / fermeture ---------

  const resetForm = () => {
    setFormName('')
    setFormMembraneId('')
    setFormSurface('')
    setFormAnneeInstalle('')
    setFormDateDerniere('')
    setFormEtatId('')
    setFormDureeVieId('')
    setFormReference('')
    setFormNotes('')
  }

  const openCreateModal = () => {
    setEditingBassin(null)
    setModalTitle('Nouveau bassin')
    resetForm()
    setShowModal(true)
  }

  const openEditModal = (bassin: BassinRow) => {
    setEditingBassin(bassin)
    setModalTitle(`Modifier le bassin ${bassin.name ?? ''}`)

    setFormName(bassin.name ?? '')
    setFormMembraneId(bassin.membrane_type_id ?? '')
    const surfaceFt2 = m2ToFt2(bassin.surface_m2)
    setFormSurface(surfaceFt2 != null ? String(surfaceFt2) : '')
    setFormAnneeInstalle(
      bassin.annee_installation != null ? String(bassin.annee_installation) : ''
    )
    setFormDateDerniere(bassin.date_derniere_refection ?? '')
    setFormEtatId(bassin.etat_id ?? '')
    setFormDureeVieId(bassin.duree_vie_id ?? '')
    setFormReference(bassin.reference_interne ?? '')
    setFormNotes(bassin.notes ?? '')

    setShowModal(true)
  }

  const closeModal = () => {
    if (saving) return
    setShowModal(false)
    setEditingBassin(null)
  }

  // --------- SUBMIT (CREATE / UPDATE) ---------

  const handleSubmitBassin = async (e: FormEvent) => {
    e.preventDefault()
    if (!batimentId) return

    setSaving(true)

    const dureeLabel =
      formDureeVieId
        ? durees.find(d => d.id === formDureeVieId)?.label ?? null
        : null

    // formSurface est en pi² → conversion en m² pour la BD
    const surfaceM2 =
      formSurface.trim() !== ''
        ? Number(formSurface) / 10.7639
        : null

    const payload = {
      batiment_id: batimentId,
      name: formName || null,
      membrane_type_id: formMembraneId || null,
      surface_m2: surfaceM2,
      annee_installation: formAnneeInstalle ? Number(formAnneeInstalle) : null,
      date_derniere_refection: formDateDerniere || null,
      etat_id: formEtatId || null,
      duree_vie_id: formDureeVieId || null,
      duree_vie_text: dureeLabel,
      reference_interne: formReference || null,
      notes: formNotes || null,
    }

    let data: BassinRow | null = null
    let error: any = null

    if (editingBassin) {
      // UPDATE
      const res = await supabaseBrowser
        .from('bassins')
        .update(payload)
        .eq('id', editingBassin.id)
        .select(
          'id, name, membrane_type_id, surface_m2, annee_installation, date_derniere_refection, etat_id, duree_vie_id, duree_vie_text, reference_interne, notes, polygone_geojson'
        )
        .single()

      data = res.data as BassinRow | null
      error = res.error
    } else {
      // INSERT
      const res = await supabaseBrowser
        .from('bassins')
        .insert(payload)
        .select(
          'id, name, membrane_type_id, surface_m2, annee_installation, date_derniere_refection, etat_id, duree_vie_id, duree_vie_text, reference_interne, notes, polygone_geojson'
        )
        .single()

      data = res.data as BassinRow | null
      error = res.error
    }

    setSaving(false)

    if (error) {
      alert(
        'Erreur lors de la sauvegarde du bassin : ' +
          (error.message ?? 'Erreur inconnue')
      )
      return
    }

    if (data) {
      if (editingBassin) {
        setBassins(prev => prev.map(b => (b.id === data!.id ? data! : b)))
      } else {
        setBassins(prev => [...prev, data])
      }
      closeModal()
    }
  }

  // --------- RENDU ---------

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
      : null

  return (
    <section>
      {/* Fiche bâtiment */}
      <h2 style={{ fontSize: 22, fontWeight: 'bold', marginBottom: 8 }}>
        {batiment.name}
      </h2>
      <p style={{ marginBottom: 16, color: '#555' }}>
        {batiment.address} {batiment.city} {batiment.postal_code}
      </p>

      {/* Carte d’ensemble des bassins */}
      {center && (
        <div style={{ marginBottom: 24 }}>
          <h3 style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 8 }}>
            Vue d&apos;ensemble des bassins
          </h3>
          <p style={{ fontSize: 13, color: '#555', marginBottom: 8 }}>
            Chaque bassin est affiché avec la couleur correspondant à son état.
            Survole un bassin sur la carte pour surligner la ligne du tableau.
            Clique sur un bassin pour ouvrir sa fiche détaillée.
          </p>
          <BatimentBasinsMap
            center={center}
            bassins={bassins}
            etats={etats}
            hoveredBassinId={hoveredBassinId}
            onHoverBassin={setHoveredBassinId}
          />
        </div>
      )}

      {/* En-tête section bassins */}
      <div
        style={{
          marginBottom: 12,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <h3 style={{ fontSize: 18, fontWeight: 'bold' }}>Bassins de toiture</h3>
        <button
          type="button"
          className="btn-primary"
          onClick={openCreateModal}
        >
          Ajouter un bassin
        </button>
      </div>

      {/* Tableau bassins */}
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
              <th style={{ border: '1px solid #ccc', padding: 6 }}>Surface (pi²)</th>
              <th style={{ border: '1px solid #ccc', padding: 6 }}>Année installée</th>
              <th style={{ border: '1px solid #ccc', padding: 6 }}>
                Dernière réfection
              </th>
              <th style={{ border: '1px solid #ccc', padding: 6 }}>État</th>
              <th style={{ border: '1px solid #ccc', padding: 6 }}>Durée de vie</th>
              <th style={{ border: '1px solid #ccc', padding: 6 }}>Réf. interne</th>
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
              const surfaceFt2 = m2ToFt2(b.surface_m2)
              const isHovered = hoveredBassinId === b.id

              return (
                <tr
                  key={b.id}
                  onMouseEnter={() => setHoveredBassinId(b.id)}
                  onMouseLeave={() => setHoveredBassinId(null)}
                  style={{
                    border: '1px solid #ccc',
                    backgroundColor: isHovered ? '#e0f2fe' : 'transparent',
                    transition: 'background-color 0.15s ease-in-out',
                  }}
                >
                  <td style={{ border: '1px solid #ccc', padding: 6 }}>
                    <Link href={`/admin/bassins/${b.id}`}>{b.name}</Link>
                  </td>
                  <td style={{ border: '1px solid #ccc', padding: 6 }}>
                    {membraneLabel}
                  </td>
                  <td style={{ border: '1px solid #ccc', padding: 6 }}>
                    {surfaceFt2 ?? ''}
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
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => openEditModal(b)}
                    >
                      Modifier
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}

      {/* Modal ajout / modification bassin */}
      {showModal && (
        <div className="modal-backdrop">
          <div className="modal-panel">
            <h3 className="modal-title">{modalTitle}</h3>
            <p className="modal-subtitle">
              Bâtiment : {batiment.name}
            </p>

            <form onSubmit={handleSubmitBassin} className="modal-form">
              <div className="modal-field">
                <label>Nom du bassin</label>
                <input
                  type="text"
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  required
                />
              </div>

              <div className="modal-field">
                <label>Type de membrane</label>
                <select
                  value={formMembraneId}
                  onChange={e => setFormMembraneId(e.target.value)}
                  required
                >
                  <option value="">Sélectionner…</option>
                  {membranes.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="modal-field">
                <label>Surface (pi²)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formSurface}
                  onChange={e => setFormSurface(e.target.value)}
                />
              </div>

              <div className="modal-field">
                <label>Année d’installation</label>
                <input
                  type="number"
                  min="1900"
                  max="2100"
                  value={formAnneeInstalle}
                  onChange={e => setFormAnneeInstalle(e.target.value)}
                />
              </div>

              <div className="modal-field">
                <label>Date de la dernière réfection</label>
                <input
                  type="date"
                  value={formDateDerniere}
                  onChange={e => setFormDateDerniere(e.target.value)}
                />
              </div>

              <div className="modal-field">
                <label>État du bassin</label>
                <select
                  value={formEtatId}
                  onChange={e => setFormEtatId(e.target.value)}
                >
                  <option value="">Sélectionner…</option>
                  {etats.map(e => (
                    <option key={e.id} value={e.id}>
                      {e.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="modal-field">
                <label>Durée de vie résiduelle</label>
                <select
                  value={formDureeVieId}
                  onChange={e => setFormDureeVieId(e.target.value)}
                >
                  <option value="">Sélectionner…</option>
                  {durees.map(d => (
                    <option key={d.id} value={d.id}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="modal-field">
                <label>Référence interne</label>
                <input
                  type="text"
                  value={formReference}
                  onChange={e => setFormReference(e.target.value)}
                />
              </div>

              <div className="modal-field">
                <label>Notes</label>
                <textarea
                  value={formNotes}
                  onChange={e => setFormNotes(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={closeModal}
                  disabled={saving}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={saving}
                >
                  {saving ? 'Enregistrement…' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  )
}

/**
 * Carte de synthèse des bassins d’un bâtiment (interactive)
 */
type BatimentBasinsMapProps = {
  center: { lat: number; lng: number }
  bassins: BassinRow[]
  etats: ListeChoix[]
  hoveredBassinId: string | null
  onHoverBassin: (id: string | null) => void
}

function BatimentBasinsMap({
  center,
  bassins,
  etats,
  hoveredBassinId,
  onHoverBassin,
}: BatimentBasinsMapProps) {
  const router = useRouter()

  const { isLoaded } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '',
    libraries: MAP_LIBRARIES as unknown as string[],
  })

  if (!isLoaded) {
    return <div>Chargement de la carte…</div>
  }

  const polygons = bassins
    .filter(b => b.polygone_geojson && b.polygone_geojson.coordinates?.[0]?.length)
    .map(b => {
      const coords = b.polygone_geojson!.coordinates[0]
      const path = coords.map(([lng, lat]) => ({ lat, lng }))
      const etat = etats.find(e => e.id === b.etat_id)
      const color = etat?.couleur || '#22c55e' // défaut vert

      return {
        id: b.id,
        path,
        color,
        name: b.name ?? '',
      }
    })

  return (
    <div style={{ width: '100%', height: 400, borderRadius: 8, overflow: 'hidden' }}>
      <GoogleMap
        mapContainerStyle={{ width: '100%', height: '100%' }}
        center={center}
        zoom={19}
        options={{
          mapTypeId: 'satellite',
          streetViewControl: false,
          fullscreenControl: true,
          rotateControl: false,
          tilt: 0,
        }}
        onLoad={map => {
          map.setTilt(0)
        }}
      >
        {polygons.map(poly => {
          const isHovered = hoveredBassinId === poly.id

          return (
            <Polygon
              key={poly.id}
              paths={poly.path}
              options={{
                fillColor: poly.color,
                fillOpacity: isHovered ? 0.6 : 0.4,
                strokeColor: poly.color,
                strokeOpacity: 0.9,
                strokeWeight: isHovered ? 3 : 2,
                clickable: true,
              }}
              onMouseOver={() => onHoverBassin(poly.id)}
              onMouseOut={() => onHoverBassin(null)}
              onClick={() => router.push(`/admin/bassins/${poly.id}`)}
            />
          )
        })}
      </GoogleMap>
    </div>
  )
}
