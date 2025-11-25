'use client'

import { useEffect, useState, FormEvent, ChangeEvent } from 'react'
import { useParams } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabaseBrowser'

type BassinRow = {
  id: string
  batiment_id: string | null
  name: string | null
  surface_m2: number | null
  annee_installation: number | null
  date_derniere_refection: string | null
  etat_id: string | null
  duree_vie_id: string | null
  duree_vie_text: string | null
  reference_interne: string | null
  notes: string | null
}

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

type GarantieRow = {
  id: string
  bassin_id: string | null
  type_garantie_id: string | null
  fournisseur: string | null
  numero_garantie: string | null
  date_debut: string | null
  date_fin: string | null
  statut_id: string | null
  couverture: string | null
  commentaire: string | null
  fichier_pdf_url: string | null
}

export default function AdminBassinDetailPage() {
  const params = useParams()
  const bassinId = params?.id as string

  const [bassin, setBassin] = useState<BassinRow | null>(null)
  const [batiment, setBatiment] = useState<BatimentRow | null>(null)
  const [listes, setListes] = useState<ListeChoix[]>([])
  const [garanties, setGaranties] = useState<GarantieRow[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Modal ajout garantie
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formTypeGarantieId, setFormTypeGarantieId] = useState('')
  const [formFournisseur, setFormFournisseur] = useState('')
  const [formNumero, setFormNumero] = useState('')
  const [formDateDebut, setFormDateDebut] = useState('')
  const [formDateFin, setFormDateFin] = useState('')
  const [formStatutId, setFormStatutId] = useState('')
  const [formCouverture, setFormCouverture] = useState('')
  const [formCommentaire, setFormCommentaire] = useState('')
  const [pdfFile, setPdfFile] = useState<File | null>(null)

  useEffect(() => {
    if (!bassinId) return

    const fetchData = async () => {
      setLoading(true)
      setErrorMsg(null)

      // 1) Bassin
      const { data: bassinData, error: bassinError } = await supabaseBrowser
        .from('bassins')
        .select(
          'id, batiment_id, name, surface_m2, annee_installation, date_derniere_refection, etat_id, duree_vie_id, duree_vie_text, reference_interne, notes'
        )
        .eq('id', bassinId)
        .single()

      if (bassinError) {
        setErrorMsg(bassinError.message)
        setLoading(false)
        return
      }

      // 2) Bâtiment (pour contexte)
      let batData: BatimentRow | null = null
      if (bassinData?.batiment_id) {
        const { data, error } = await supabaseBrowser
          .from('batiments')
          .select('id, name, address, city, postal_code')
          .eq('id', bassinData.batiment_id)
          .single()
        if (!error) {
          batData = data
        }
      }

      // 3) Listes de choix
      const { data: listesData, error: listesError } = await supabaseBrowser
        .from('listes_choix')
        .select('id, categorie, label, couleur')

      if (listesError) {
        setErrorMsg(listesError.message)
        setLoading(false)
        return
      }

      // 4) Garanties du bassin
      const { data: garantiesData, error: garantiesError } =
        await supabaseBrowser
          .from('garanties')
          .select(
            'id, bassin_id, type_garantie_id, fournisseur, numero_garantie, date_debut, date_fin, statut_id, couverture, commentaire, fichier_pdf_url'
          )
          .eq('bassin_id', bassinId)
          .order('date_debut', { ascending: true })

      if (garantiesError) {
        setErrorMsg(garantiesError.message)
        setLoading(false)
        return
      }

      setBassin(bassinData)
      setBatiment(batData)
      setListes(listesData || [])
      setGaranties(garantiesData || [])
      setLoading(false)
    }

    void fetchData()
  }, [bassinId])

  // Listes de choix
  const typesGarantie = listes.filter(l => l.categorie === 'type_garantie')
  const statutsGarantie = listes.filter(l => l.categorie === 'statut_garantie')

  const labelFromId = (category: 'type_garantie' | 'statut_garantie', id: string | null) => {
    if (!id) return ''
    const arr = category === 'type_garantie' ? typesGarantie : statutsGarantie
    return arr.find(l => l.id === id)?.label ?? ''
  }

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null
    setPdfFile(file)
  }

  const openModal = () => {
    setFormTypeGarantieId('')
    setFormFournisseur('')
    setFormNumero('')
    setFormDateDebut('')
    setFormDateFin('')
    setFormStatutId('')
    setFormCouverture('')
    setFormCommentaire('')
    setPdfFile(null)
    setShowModal(true)
  }

  const closeModal = () => {
    if (saving) return
    setShowModal(false)
  }

  const handleSubmitGarantie = async (e: FormEvent) => {
    e.preventDefault()
    if (!bassinId) return

    setSaving(true)

    let fichierUrl: string | null = null

    // Upload du PDF si présent
    if (pdfFile) {
      const ext = pdfFile.name.split('.').pop() || 'pdf'
      const path = `${bassinId}/${crypto.randomUUID()}.${ext}`

      const { error: uploadError } = await supabaseBrowser.storage
        .from('garanties')
        .upload(path, pdfFile)

      if (uploadError) {
        setSaving(false)
        alert('Erreur lors du téléversement du PDF : ' + uploadError.message)
        return
      }

      const { data: publicData } = supabaseBrowser.storage
        .from('garanties')
        .getPublicUrl(path)

      fichierUrl = publicData?.publicUrl ?? null
    }

    const { data, error } = await supabaseBrowser
      .from('garanties')
      .insert({
        bassin_id: bassinId,
        type_garantie_id: formTypeGarantieId || null,
        fournisseur: formFournisseur || null,
        numero_garantie: formNumero || null,
        date_debut: formDateDebut || null,
        date_fin: formDateFin || null,
        statut_id: formStatutId || null,
        couverture: formCouverture || null,
        commentaire: formCommentaire || null,
        fichier_pdf_url: fichierUrl,
      })
      .select(
        'id, bassin_id, type_garantie_id, fournisseur, numero_garantie, date_debut, date_fin, statut_id, couverture, commentaire, fichier_pdf_url'
      )
      .single()

    setSaving(false)

    if (error) {
      alert('Erreur lors de la création de la garantie : ' + error.message)
      return
    }

    if (data) {
      setGaranties(prev => [...prev, data])
      closeModal()
    }
  }

  if (loading) {
    return <p>Chargement…</p>
  }

  if (errorMsg) {
    return <p style={{ color: 'red' }}>Erreur : {errorMsg}</p>
  }

  if (!bassin) {
    return <p>Bassin introuvable.</p>
  }

  return (
    <section>
      {/* Contexte bâtiment + bassin */}
      {batiment && (
        <p style={{ fontSize: 13, color: '#555', marginBottom: 4 }}>
          Bâtiment : {batiment.name} – {batiment.address} {batiment.city}{' '}
          {batiment.postal_code}
        </p>
      )}

      <h2 style={{ fontSize: 22, fontWeight: 'bold', marginBottom: 4 }}>
        Bassin : {bassin.name}
      </h2>

      <p style={{ marginBottom: 16, color: '#555', fontSize: 14 }}>
        Surface : {bassin.surface_m2 ?? 'n/d'} m² · Année installation :{' '}
        {bassin.annee_installation ?? 'n/d'} · Dernière réfection :{' '}
        {bassin.date_derniere_refection ?? 'n/d'}
      </p>

      {/* En-tête section garanties */}
      <div
        style={{
          marginBottom: 12,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <h3 style={{ fontSize: 18, fontWeight: 'bold' }}>Garanties</h3>
        <button
          type="button"
          className="btn-primary"
          onClick={openModal}
        >
          Ajouter une garantie
        </button>
      </div>

      {/* Tableau garanties */}
      {garanties.length === 0 ? (
        <p>Aucune garantie pour ce bassin pour le moment.</p>
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
              <th style={{ border: '1px solid #ccc', padding: 6 }}>Type</th>
              <th style={{ border: '1px solid #ccc', padding: 6 }}>Fournisseur</th>
              <th style={{ border: '1px solid #ccc', padding: 6 }}>No garantie</th>
              <th style={{ border: '1px solid #ccc', padding: 6 }}>Début</th>
              <th style={{ border: '1px solid #ccc', padding: 6 }}>Fin</th>
              <th style={{ border: '1px solid #ccc', padding: 6 }}>Statut</th>
              <th style={{ border: '1px solid #ccc', padding: 6 }}>Couverture</th>
              <th style={{ border: '1px solid #ccc', padding: 6 }}>PDF</th>
            </tr>
          </thead>
          <tbody>
            {garanties.map(g => {
              const typeLabel = labelFromId('type_garantie', g.type_garantie_id)
              const statutLabel = labelFromId('statut_garantie', g.statut_id)

              return (
                <tr key={g.id}>
                  <td style={{ border: '1px solid #ccc', padding: 6 }}>
                    {typeLabel || '—'}
                  </td>
                  <td style={{ border: '1px solid #ccc', padding: 6 }}>
                    {g.fournisseur || '—'}
                  </td>
                  <td style={{ border: '1px solid #ccc', padding: 6 }}>
                    {g.numero_garantie || '—'}
                  </td>
                  <td style={{ border: '1px solid #ccc', padding: 6 }}>
                    {g.date_debut || '—'}
                  </td>
                  <td style={{ border: '1px solid #ccc', padding: 6 }}>
                    {g.date_fin || '—'}
                  </td>
                  <td style={{ border: '1px solid #ccc', padding: 6 }}>
                    {statutLabel || '—'}
                  </td>
                  <td style={{ border: '1px solid #ccc', padding: 6 }}>
                    {g.couverture || '—'}
                  </td>
                  <td style={{ border: '1px solid #ccc', padding: 6 }}>
                    {g.fichier_pdf_url ? (
                      <a
                        href={g.fichier_pdf_url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Ouvrir
                      </a>
                    ) : (
                      '—'
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}

      {/* Modal ajout garantie */}
      {showModal && (
        <div className="modal-backdrop">
          <div className="modal-panel">
            <h3 className="modal-title">Nouvelle garantie</h3>
            <p className="modal-subtitle">
              Bassin : {bassin.name}
            </p>

            <form onSubmit={handleSubmitGarantie} className="modal-form">
              <div className="modal-field">
                <label>Type de garantie</label>
                <select
                  value={formTypeGarantieId}
                  onChange={e => setFormTypeGarantieId(e.target.value)}
                  required
                >
                  <option value="">Sélectionner…</option>
                  {typesGarantie.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="modal-field">
                <label>Fournisseur</label>
                <input
                  type="text"
                  value={formFournisseur}
                  onChange={e => setFormFournisseur(e.target.value)}
                />
              </div>

              <div className="modal-field">
                <label>Numéro de garantie</label>
                <input
                  type="text"
                  value={formNumero}
                  onChange={e => setFormNumero(e.target.value)}
                />
              </div>

              <div className="modal-field">
                <label>Date de début</label>
                <input
                  type="date"
                  value={formDateDebut}
                  onChange={e => setFormDateDebut(e.target.value)}
                />
              </div>

              <div className="modal-field">
                <label>Date de fin</label>
                <input
                  type="date"
                  value={formDateFin}
                  onChange={e => setFormDateFin(e.target.value)}
                />
              </div>

              <div className="modal-field">
                <label>Statut</label>
                <select
                  value={formStatutId}
                  onChange={e => setFormStatutId(e.target.value)}
                >
                  <option value="">Sélectionner…</option>
                  {statutsGarantie.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="modal-field">
                <label>Couverture (résumé)</label>
                <input
                  type="text"
                  value={formCouverture}
                  onChange={e => setFormCouverture(e.target.value)}
                />
              </div>

              <div className="modal-field">
                <label>Commentaire</label>
                <textarea
                  rows={3}
                  value={formCommentaire}
                  onChange={e => setFormCommentaire(e.target.value)}
                />
              </div>

              <div className="modal-field">
                <label>Fichier PDF de la garantie</label>
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={handleFileChange}
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
