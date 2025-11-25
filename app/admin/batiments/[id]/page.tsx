'use client'

import { useEffect, useState, FormEvent } from 'react'
import { useParams } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabaseBrowser'
import Link from 'next/link'

type BatimentRow = {
  id: string
  name: string | null
  address: string | null
  city: string | null
  postal_code: string | null
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
  const [formName, setFormName] = useState('')
  const [formMembraneId, setFormMembraneId] = useState('')
  const [formSurface, setFormSurface] = useState('')
  const [formAnneeInstalle, setFormAnneeInstalle] = useState('')
  const [formDateDerniere, setFormDateDerniere] = useState('')
  const [formEtatId, setFormEtatId] = useState('')
  const [formDureeVieId, setFormDureeVieId] = useState('')
  const [formReference, setFormReference] = useState('')
  const [formNotes, setFormNotes] = useState('')

  useEffect(() => {
    if (!batimentId) return

    const fetchData = async () => {
      setLoading(true)
      setErrorMsg(null)

      // 1) Bâtiment
      const { data: batData, error: batError } = await supabaseBrowser
        .from('batiments')
        .select('id, name, address, city, postal_code')
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
          'id, name, membrane_type_id, surface_m2, annee_installation, date_derniere_refection, etat_id, duree_vie_id, duree_vie_text, reference_interne, notes'
        )
        .eq('batiment_id', batimentId)
        .order('name', { ascending: true })

      if (bassinsError) {
        setErrorMsg(bassinsError.message)
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

  const openModal = () => {
    setFormName('')
    setFormMembraneId('')
    setFormSurface('')
    setFormAnneeInstalle('')
    setFormDateDerniere('')
    setFormEtatId('')
    setFormDureeVieId('')
    setFormReference('')
    setFormNotes('')
    setShowModal(true)
  }

  const closeModal = () => {
    if (saving) return
    setShowModal(false)
  }

  const handleSubmitBassin = async (e: FormEvent) => {
    e.preventDefault()
    if (!batimentId) return

    setSaving(true)

    const dureeLabel =
      formDureeVieId
        ? durees.find(d => d.id === formDureeVieId)?.label ?? null
        : null

    const { data, error } = await supabaseBrowser
      .from('bassins')
      .insert({
        batiment_id: batimentId,
        name: formName || null,
        membrane_type_id: formMembraneId || null,
        surface_m2: formSurface ? Number(formSurface) : null,
        annee_installation: formAnneeInstalle ? Number(formAnneeInstalle) : null,
        date_derniere_refection: formDateDerniere || null,
        etat_id: formEtatId || null,
        duree_vie_id: formDureeVieId || null,
        duree_vie_text: dureeLabel,
        reference_interne: formReference || null,
        notes: formNotes || null,
      })
      .select(
        'id, name, membrane_type_id, surface_m2, annee_installation, date_derniere_refection, etat_id, duree_vie_id, duree_vie_text, reference_interne, notes'
      )
      .single()

    setSaving(false)

    if (error) {
      alert('Erreur lors de la création du bassin : ' + error.message)
      return
    }

    if (data) {
      setBassins(prev => [...prev, data])
      closeModal()
    }
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

  return (
    <section>
      {/* Fiche bâtiment */}
      <h2 style={{ fontSize: 22, fontWeight: 'bold', marginBottom: 8 }}>
        {batiment.name}
      </h2>
      <p style={{ marginBottom: 16, color: '#555' }}>
        {batiment.address} {batiment.city} {batiment.postal_code}
      </p>

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
          onClick={openModal}
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
              <th style={{ border: '1px solid #ccc', padding: 6 }}>Surface (m²)</th>
              <th style={{ border: '1px solid #ccc', padding: 6 }}>Année installée</th>
              <th style={{ border: '1px solid #ccc', padding: 6 }}>
                Dernière réfection
              </th>
              <th style={{ border: '1px solid #ccc', padding: 6 }}>État</th>
              <th style={{ border: '1px solid #ccc', padding: 6 }}>Durée de vie</th>
              <th style={{ border: '1px solid #ccc', padding: 6 }}>Réf. interne</th>
            </tr>
          </thead>
          <tbody>
            {bassins.map(b => {
              const etatColor = couleurEtat(b.etat_id)
              const etatLabel = labelFromId('etat_bassin', b.etat_id)
              const membraneLabel = labelFromId('membrane', b.membrane_type_id)
              const dureeLabel =
                b.duree_vie_text || labelFromId('duree_vie', b.duree_vie_id)

              return (
                <tr key={b.id}>
                  <td style={{ border: '1px solid #ccc', padding: 6 }}>
  <Link href={`/admin/bassins/${b.id}`}>
    {b.name}
  </Link>
</td>
                  <td style={{ border: '1px solid #ccc', padding: 6 }}>
                    {membraneLabel}
                  </td>
                  <td style={{ border: '1px solid #ccc', padding: 6 }}>
                    {b.surface_m2 ?? ''}
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
                </tr>
              )
            })}
          </tbody>
        </table>
      )}

      {/* Modal ajout bassin */}
      {showModal && (
        <div className="modal-backdrop">
          <div className="modal-panel">
            <h3 className="modal-title">Nouveau bassin</h3>
            <p className="modal-subtitle">
              Ajouter un bassin pour le bâtiment : {batiment.name}
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
                <label>Surface (m²)</label>
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
