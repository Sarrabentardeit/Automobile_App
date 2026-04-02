import { useState, useMemo } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { useDemandesDevis } from '@/contexts/DemandesDevisContext'
import type { DemandeDevis, DemandeDevisStatut } from '@/types'
import { DEMANDE_DEVIS_STATUTS, DEMANDE_DEVIS_STATUT_LABELS } from '@/types'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import { formatDate } from '@/lib/utils'
import { ClipboardList, Plus, User, Car, ChevronRight, FileText, Printer, Download } from 'lucide-react'
import { cn } from '@/lib/utils'

function formatMontant(n: number): string {
  return n.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' TND'
}

const STATUT_STYLES: Record<DemandeDevisStatut, string> = {
  en_attente: 'bg-amber-100 text-amber-800 border-amber-200',
  envoye: 'bg-blue-100 text-blue-800 border-blue-200',
  accepte: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  refuse: 'bg-gray-100 text-gray-600 border-gray-200',
}

export default function DemandeDevisPage() {
  const { user, permissions } = useAuth()
  const { demandes, loading, addDemande, updateDemande } = useDemandesDevis()
  const toast = useToast()
  const [filterStatut, setFilterStatut] = useState<DemandeDevisStatut | 'toutes'>('toutes')
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<Omit<DemandeDevis, 'id'>>({
    date: '',
    clientName: '',
    clientTelephone: '',
    vehicleRef: '',
    description: '',
    statut: 'en_attente',
    montantEstime: undefined,
    dateLimite: '',
    notes: '',
  })

  const filtered = useMemo(() => {
    let list = demandes
    if (filterStatut !== 'toutes') list = list.filter(d => d.statut === filterStatut)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(
        d =>
          d.clientName.toLowerCase().includes(q) ||
          d.vehicleRef.toLowerCase().includes(q) ||
          d.description.toLowerCase().includes(q)
      )
    }
    return list.sort((a, b) => b.date.localeCompare(a.date))
  }, [demandes, filterStatut, search])

  const stats = useMemo(() => ({
    enAttente: filtered.filter(d => d.statut === 'en_attente').length,
    totalEstime: filtered.filter(d => d.statut === 'accepte' && d.montantEstime != null).reduce((s, d) => s + (d.montantEstime ?? 0), 0),
  }), [filtered])

  const openNew = () => {
    setForm({
      date: new Date().toISOString().slice(0, 10),
      clientName: '',
      clientTelephone: '',
      vehicleRef: '',
      description: '',
      statut: 'en_attente',
      montantEstime: undefined,
      dateLimite: '',
      notes: '',
    })
    setSelectedId(null)
    setShowForm(true)
  }

  const openEdit = (d: DemandeDevis) => {
    setForm({
      date: d.date,
      clientName: d.clientName,
      clientTelephone: d.clientTelephone ?? '',
      vehicleRef: d.vehicleRef,
      description: d.description,
      statut: d.statut,
      montantEstime: d.montantEstime,
      dateLimite: d.dateLimite ?? '',
      notes: d.notes ?? '',
    })
    setSelectedId(d.id)
    setShowForm(true)
  }

  const save = () => {
    if (!form.clientName.trim() || !form.date || !form.description.trim()) return
    const payload = { ...form, clientTelephone: form.clientTelephone || undefined, dateLimite: form.dateLimite || undefined, notes: form.notes || undefined }
    if (selectedId) {
      updateDemande(selectedId, payload)
      toast.success('Demande de devis modifiée avec succès')
    } else {
      addDemande(payload)
      toast.success('Demande de devis ajoutée avec succès')
    }
    setShowForm(false)
  }

  const buildDevisHtml = (d: DemandeDevis) => {
    const montant = d.montantEstime != null ? formatMontant(d.montantEstime) : 'À définir'
    const phone = d.clientTelephone?.trim() ? d.clientTelephone : '—'
    const vehicle = d.vehicleRef?.trim() ? d.vehicleRef : '—'
    const notes = d.notes?.trim() ? d.notes : '—'
    const validite = d.dateLimite ? formatDate(d.dateLimite) : '—'
    return `
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Devis - ${d.clientName}</title>
          <style>
            body { font-family: Arial, sans-serif; color: #111827; margin: 0; padding: 24px; }
            .wrap { max-width: 800px; margin: 0 auto; }
            .head { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:20px; }
            .title { font-size: 26px; font-weight: 700; margin: 0; }
            .muted { color:#6b7280; font-size:12px; }
            .box { border:1px solid #e5e7eb; border-radius:10px; padding:14px; margin-bottom:12px; }
            .grid { display:grid; grid-template-columns: 1fr 1fr; gap: 10px 14px; }
            .k { font-size:12px; color:#6b7280; margin-bottom:3px; }
            .v { font-size:14px; font-weight:600; }
            .section-title { font-size:13px; font-weight:700; margin:0 0 8px 0; color:#374151; }
            .big { font-size:22px; font-weight:700; }
            .footer { margin-top:24px; font-size:12px; color:#6b7280; }
          </style>
        </head>
        <body>
          <div class="wrap">
            <div class="head">
              <div>
                <h1 class="title">DEVIS</h1>
                <div class="muted">Réf. demande #${d.id} · ${formatDate(d.date)}</div>
              </div>
              <div style="text-align:right">
                <div style="font-weight:700">EL MECANO GARAGE</div>
                <div class="muted">Document généré depuis l'application</div>
              </div>
            </div>
            <div class="box">
              <div class="section-title">Informations client</div>
              <div class="grid">
                <div><div class="k">Client</div><div class="v">${d.clientName}</div></div>
                <div><div class="k">Téléphone</div><div class="v">${phone}</div></div>
                <div><div class="k">Véhicule</div><div class="v">${vehicle}</div></div>
                <div><div class="k">Validité</div><div class="v">${validite}</div></div>
              </div>
            </div>
            <div class="box">
              <div class="section-title">Travaux demandés</div>
              <div style="white-space:pre-wrap; font-size:14px; line-height:1.5">${d.description}</div>
            </div>
            <div class="box">
              <div class="section-title">Montant estimé</div>
              <div class="big">${montant}</div>
              <div class="muted">Statut: ${DEMANDE_DEVIS_STATUT_LABELS[d.statut]}</div>
            </div>
            <div class="box">
              <div class="section-title">Notes</div>
              <div style="white-space:pre-wrap; font-size:14px; line-height:1.5">${notes}</div>
            </div>
            <div class="footer">
              Bon pour accord client: ______________________ &nbsp;&nbsp; Date: ____ / ____ / ______
            </div>
          </div>
        </body>
      </html>
    `
  }

  const printDevis = (d: DemandeDevis) => {
    const w = window.open('', '_blank')
    if (!w) return
    w.document.write(buildDevisHtml(d))
    w.document.close()
    w.focus()
    w.print()
  }

  const exportDevisPdf = async (d: DemandeDevis) => {
    const { jsPDF } = await import('jspdf')
    const pdf = new jsPDF({ unit: 'mm', format: 'a4' })
    const pageW = pdf.internal.pageSize.getWidth()
    let y = 14

    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(18)
    pdf.text('DEVIS', 14, y)
    pdf.setFontSize(10)
    pdf.setFont('helvetica', 'normal')
    pdf.text(`Ref. demande #${d.id} - ${formatDate(d.date)}`, 14, y + 5)
    pdf.text('EL MECANO GARAGE', pageW - 14, y, { align: 'right' })
    y += 14

    const line = (label: string, value: string) => {
      pdf.setFont('helvetica', 'bold')
      pdf.text(label, 14, y)
      pdf.setFont('helvetica', 'normal')
      pdf.text(value || '—', 56, y)
      y += 6
    }

    pdf.setFont('helvetica', 'bold')
    pdf.text('Informations client', 14, y)
    y += 7
    line('Client', d.clientName)
    line('Telephone', d.clientTelephone ?? '—')
    line('Vehicule', d.vehicleRef || '—')
    line('Validite', d.dateLimite ? formatDate(d.dateLimite) : '—')

    y += 3
    pdf.setFont('helvetica', 'bold')
    pdf.text('Travaux demandes', 14, y)
    y += 6
    pdf.setFont('helvetica', 'normal')
    const description = pdf.splitTextToSize(d.description || '—', pageW - 28)
    pdf.text(description, 14, y)
    y += description.length * 5 + 4

    pdf.setFont('helvetica', 'bold')
    pdf.text('Montant estime', 14, y)
    y += 6
    pdf.setFont('helvetica', 'normal')
    pdf.text(d.montantEstime != null ? formatMontant(d.montantEstime) : 'A definir', 14, y)
    y += 6
    pdf.text(`Statut: ${DEMANDE_DEVIS_STATUT_LABELS[d.statut]}`, 14, y)
    y += 8

    pdf.setFont('helvetica', 'bold')
    pdf.text('Notes', 14, y)
    y += 6
    pdf.setFont('helvetica', 'normal')
    const notes = pdf.splitTextToSize(d.notes?.trim() || '—', pageW - 28)
    pdf.text(notes, 14, y)
    y += notes.length * 5 + 12

    pdf.setFontSize(10)
    pdf.text('Bon pour accord client: ______________________    Date: ____ / ____ / ______', 14, y)
    pdf.save(`devis-${d.id}-${d.clientName.replace(/\s+/g, '_')}.pdf`)
  }

  if (!user) return null

  if (!permissions?.canViewFinance) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <ClipboardList className="w-12 h-12 text-gray-300 mb-4" />
        <p className="text-gray-500 font-medium">Vous n'avez pas accès aux demandes de devis.</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto pb-12">
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 tracking-tight flex items-center gap-2">
              <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-indigo-500 text-white shadow-lg shadow-indigo-500/25">
                <ClipboardList className="w-5 h-5" />
              </span>
              Demandes Devis
            </h1>
            <p className="text-sm text-gray-500 mt-1">Suivi des demandes de devis clients</p>
          </div>
        </header>
        <div className="flex items-center justify-center py-16">
          <p className="text-gray-500 font-medium">Chargement des demandes de devis...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto pb-12">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 tracking-tight flex items-center gap-2">
            <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-indigo-500 text-white shadow-lg shadow-indigo-500/25">
              <ClipboardList className="w-5 h-5" />
            </span>
            Demandes Devis
          </h1>
          <p className="text-sm text-gray-500 mt-1">Suivi des demandes de devis clients</p>
        </div>
        <Button onClick={openNew} icon={<Plus className="w-4 h-4" />}>
          Nouvelle demande
        </Button>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 mb-6">
        <Card padding="lg" className="bg-gradient-to-br from-indigo-50 to-violet-50 border-indigo-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
              <FileText className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-indigo-700/80">En attente</p>
              <p className="text-xl font-bold text-gray-900 tabular-nums">{stats.enAttente}</p>
            </div>
          </div>
        </Card>
        <Card padding="lg" className="bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
              <ClipboardList className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-emerald-700/80">Total devis acceptés</p>
              <p className="text-xl font-bold text-gray-900 tabular-nums">{formatMontant(stats.totalEstime)}</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="search"
            placeholder="Rechercher (client, véhicule, travaux…)"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
          />
          <div className="inline-flex p-1 rounded-xl bg-gray-100">
            {(['toutes', ...DEMANDE_DEVIS_STATUTS] as const).map(s => (
              <button
                key={s}
                onClick={() => setFilterStatut(s)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
                  filterStatut === s ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                )}
              >
                {s === 'toutes' ? 'Toutes' : DEMANDE_DEVIS_STATUT_LABELS[s]}
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <Card padding="lg" className="text-center py-14">
            <ClipboardList className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">Aucune demande de devis</p>
            <p className="text-sm text-gray-400 mt-1">
              {filterStatut !== 'toutes' || search ? 'Modifiez les filtres ou créez une demande.' : 'Ajoutez une demande de devis pour commencer.'}
            </p>
            <Button className="mt-4" onClick={openNew} icon={<Plus className="w-4 h-4" />}>
              Nouvelle demande
            </Button>
          </Card>
        ) : (
          <ul className="space-y-3">
            {filtered.map(d => (
              <li key={d.id}>
                <Card
                  padding="none"
                  className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer border border-gray-100"
                  onClick={() => openEdit(d)}
                >
                  <div className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1.5">
                        <span className={cn('inline-flex px-2 py-0.5 rounded-lg text-xs font-semibold border', STATUT_STYLES[d.statut])}>
                          {DEMANDE_DEVIS_STATUT_LABELS[d.statut]}
                        </span>
                        <span className="text-xs text-gray-400">{formatDate(d.date)}</span>
                        {d.dateLimite && (
                          <span className="text-xs text-gray-500">Échéance : {formatDate(d.dateLimite)}</span>
                        )}
                      </div>
                      <p className="font-semibold text-gray-900 line-clamp-1">{d.description}</p>
                      <p className="text-sm text-gray-600 flex items-center gap-1.5 mt-0.5">
                        <User className="w-3.5 h-3.5 text-gray-400" />
                        {d.clientName}
                        {d.vehicleRef && (
                          <>
                            <span className="text-gray-300">·</span>
                            <Car className="w-3.5 h-3.5 text-gray-400" />
                            {d.vehicleRef}
                          </>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      {d.montantEstime != null && (
                        <span className="text-sm font-semibold text-indigo-600 tabular-nums">
                          {formatMontant(d.montantEstime)}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          void exportDevisPdf(d)
                        }}
                        className="p-2 rounded-lg hover:bg-indigo-50 text-gray-400 hover:text-indigo-600"
                        title="Exporter PDF"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          printDevis(d)
                        }}
                        className="p-2 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600"
                        title="Imprimer"
                      >
                        <Printer className="w-4 h-4" />
                      </button>
                      <ChevronRight className="w-5 h-5 text-gray-300" />
                    </div>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title={selectedId ? 'Modifier la demande' : 'Nouvelle demande de devis'}
        subtitle={form.date ? formatDate(form.date) : undefined}
        maxWidth="md"
      >
        <div className="space-y-4">
          <Input label="Date" type="date" value={form.date} onChange={e => setForm(prev => ({ ...prev, date: e.target.value }))} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Client" value={form.clientName} onChange={e => setForm(prev => ({ ...prev, clientName: e.target.value }))} placeholder="Nom du client" />
            <Input label="Téléphone" type="tel" value={form.clientTelephone} onChange={e => setForm(prev => ({ ...prev, clientTelephone: e.target.value }))} placeholder="Optionnel" />
          </div>
          <Input label="Véhicule (immat ou modèle)" value={form.vehicleRef} onChange={e => setForm(prev => ({ ...prev, vehicleRef: e.target.value }))} placeholder="Ex. SEAT IBIZA 127 TU 2987" />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Travaux demandés</label>
            <textarea
              value={form.description}
              onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Description des travaux pour le devis…"
              rows={3}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Statut</label>
              <select
                value={form.statut}
                onChange={e => setForm(prev => ({ ...prev, statut: e.target.value as DemandeDevisStatut }))}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                {DEMANDE_DEVIS_STATUTS.map(s => (
                  <option key={s} value={s}>{DEMANDE_DEVIS_STATUT_LABELS[s]}</option>
                ))}
              </select>
            </div>
            <Input
              label="Montant estimé (TND)"
              type="number"
              min={0}
              step={1}
              value={form.montantEstime ?? ''}
              onChange={e => setForm(prev => ({ ...prev, montantEstime: e.target.value ? Number(e.target.value) : undefined }))}
              placeholder="Optionnel"
            />
          </div>
          <Input label="Date limite" type="date" value={form.dateLimite} onChange={e => setForm(prev => ({ ...prev, dateLimite: e.target.value }))} />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={form.notes}
              onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Optionnel"
              rows={2}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={() => setShowForm(false)} className="flex-1">
              Annuler
            </Button>
            <Button onClick={save} className="flex-1" disabled={!form.clientName.trim() || !form.date || !form.description.trim()}>
              Enregistrer
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
