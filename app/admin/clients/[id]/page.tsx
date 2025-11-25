'use client'

import { useEffect, useState, FormEvent } from 'react'
import { useParams } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabaseBrowser'
import Link from 'next/link'

type ClientRow = {
  id: string
  name: string | null
  type: string | null
  address: string | null
  city: string | null
  postal_code: string | null
  contact_name: string | null
  contact_email: string | null
  contact_phone: string | null
  notes: string | null
}

type BatimentRow = {
  id: string
  name: string | null
  address: string | null
  city: string | null
  postal_code: string | null
}

export default function AdminClientDetailPage() {
  const params = useParams()
  const clientId = params?.id as string

  const [client, setClient] = useState<ClientRow | null>(null)
  const [batiments, setBatiments] = useState<BatimentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // État pour le modal d’ajout
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formName, setFormName] = useState('')
  const [formAddress, setFormAddress] = useState('')
  const [formCity, setFormCity] = useState('')
  const [formPostalCode, setFormPostalCode] = useState('')

  useEffect(() => {
    if (!clientId) return

    const fetchData = async () => {
      setLoading(true)
      setErrorMsg(null)

      // 1) Client
      const { data: clientData, error: clientError } = await supabaseBrowser
        .from('clients')
        .select(
          'id, name, type, address, city, postal_code, contact_name, contact_email, contact_phone, notes'
        )
        .eq('id', clientId)
        .single()

      if (clientError) {
        setErrorMsg(clientError.message)
        setLoading(false)
        return
      }

      // 2) Bâtiments
      const { data: batimentsData, error: batimentsError } =
        await supabaseBrowser
          .from('batiments')
          .select('id, name, address, city, postal_code')
          .eq('client_id', clientId)
          .order('name', { ascending: true })

      if (batimentsError) {
        setErrorMsg(batimentsError.message)
        setLoading(false)
        return
      }

      setClient(clientData)
      setBatiments(batimentsData || [])
      setLoading(false)
    }

    void fetchData()
  }, [clientId])

  const openModal = () => {
    setFormName('')
    setFormAddress('')
    setFormCity('')
    setFormPostalCode('')
    setShowModal(true)
  }

  const closeModal = () => {
    if (saving) return
    setShowModal(false)
  }

  const handleSubmitBatiment = async (e: FormEvent) => {
    e.preventDefault()
    if (!clientId) return

    setSaving(true)

    const { data, error } = await supabaseBrowser
      .from('batiments')
      .insert({
        client_id: clientId,
        name: formName || null,
        address: formAddress || null,
        city: formCity || null,
        postal_code: formPostalCode || null,
      })
      .select('id, name, address, city, postal_code')
      .single()

    setSaving(false)

    if (error) {
      // simple message pour l’instant, on pourra raffiner
      alert('Erreur lors de la création du bâtiment : ' + error.message)
      return
    }

    if (data) {
      // Ajout dans la liste en mémoire
      setBatiments(prev => [...prev, data])
      closeModal()
    }
  }

  if (loading) {
    return <p>Chargement…</p>
  }

  if (errorMsg) {
    return <p style={{ color: 'red' }}>Erreur : {errorMsg}</p>
  }

  if (!client) {
    return <p>Client introuvable.</p>
  }

  return (
    <section>
      {/* Fiche client */}
      <h2 style={{ fontSize: 22, fontWeight: 'bold', marginBottom: 8 }}>
        {client.name}
      </h2>
      <p style={{ marginBottom: 16, color: '#555' }}>
        Type : {client.type || 'Non précisé'}
      </p>

      <div
        style={{
          marginBottom: 24,
          fontSize: 14,
          display: 'grid',
          gap: 4,
        }}
      >
        <p>
          <strong>Adresse :</strong>{' '}
          {client.address} {client.city} {client.postal_code}
        </p>
        <p>
          <strong>Contact :</strong>{' '}
          {client.contact_name || 'Non précisé'}
        </p>
        <p>
          <strong>Courriel :</strong>{' '}
          {client.contact_email || 'Non précisé'}
        </p>
        <p>
          <strong>Téléphone :</strong>{' '}
          {client.contact_phone || 'Non précisé'}
        </p>
        {client.notes && (
          <p>
            <strong>Notes :</strong> {client.notes}
          </p>
        )}
      </div>

      {/* En-tête section bâtiments */}
      <div
        style={{
          marginBottom: 12,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <h3 style={{ fontSize: 18, fontWeight: 'bold' }}>Bâtiments</h3>
        <button
          type="button"
          className="btn-primary"
          onClick={openModal}
        >
          Ajouter un bâtiment
        </button>
      </div>

      {/* Tableau bâtiments */}
      {batiments.length === 0 ? (
        <p>Aucun bâtiment pour ce client pour le moment.</p>
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
              <th style={{ border: '1px solid #ccc', padding: 6 }}>Nom</th>
              <th style={{ border: '1px solid #ccc', padding: 6 }}>Adresse</th>
              <th style={{ border: '1px solid #ccc', padding: 6 }}>Ville</th>
              <th style={{ border: '1px solid #ccc', padding: 6 }}>
                Code postal
              </th>
            </tr>
          </thead>
          <tbody>
            {batiments.map(b => (
              <tr key={b.id}>
                <td style={{ border: '1px solid #ccc', padding: 6 }}>
  <Link href={`/admin/batiments/${b.id}`}>
    {b.name}
  </Link>
</td>
                <td style={{ border: '1px solid #ccc', padding: 6 }}>
                  {b.address}
                </td>
                <td style={{ border: '1px solid #ccc', padding: 6 }}>
                  {b.city}
                </td>
                <td style={{ border: '1px solid #ccc', padding: 6 }}>
                  {b.postal_code}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Modal ajout bâtiment */}
      {showModal && (
        <div className="modal-backdrop">
          <div className="modal-panel">
            <h3 className="modal-title">Nouveau bâtiment</h3>
            <p className="modal-subtitle">
              Ajouter un bâtiment pour le client&nbsp;: {client.name}
            </p>

            <form
              onSubmit={handleSubmitBatiment}
              className="modal-form"
            >
              <div className="modal-field">
                <label>Nom du bâtiment</label>
                <input
                  type="text"
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  required
                />
              </div>

              <div className="modal-field">
                <label>Adresse</label>
                <input
                  type="text"
                  value={formAddress}
                  onChange={e => setFormAddress(e.target.value)}
                />
              </div>

              <div className="modal-field">
                <label>Ville</label>
                <input
                  type="text"
                  value={formCity}
                  onChange={e => setFormCity(e.target.value)}
                />
              </div>

              <div className="modal-field">
                <label>Code postal</label>
                <input
                  type="text"
                  value={formPostalCode}
                  onChange={e => setFormPostalCode(e.target.value)}
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
