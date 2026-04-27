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
    const montantHT = d.montantEstime ?? 0
    const tva19 = montantHT * 0.19
    const timbre = 1
    const montantTTC = montantHT + tva19 + timbre
    const montant = d.montantEstime != null ? formatMontant(d.montantEstime) : 'A definir'
    const montantTva = d.montantEstime != null ? formatMontant(tva19) : 'A definir'
    const montantTimbre = d.montantEstime != null ? formatMontant(timbre) : 'A definir'
    const montantTotal = d.montantEstime != null ? formatMontant(montantTTC) : 'A definir'
    const phone = d.clientTelephone?.trim() ? d.clientTelephone : '—'
    const vehicle = d.vehicleRef?.trim() ? d.vehicleRef : '—'
    const notes = d.notes?.trim() ? d.notes : '—'
    const validite = d.dateLimite ? formatDate(d.dateLimite) : '—'
    const statut = DEMANDE_DEVIS_STATUT_LABELS[d.statut]
    const statutColor =
      d.statut === 'accepte'
        ? '#047857'
        : d.statut === 'envoye'
          ? '#1d4ed8'
          : d.statut === 'refuse'
            ? '#4b5563'
            : '#b45309'
    const escapeHtml = (s: string) =>
      s
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')

    return `
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Devis - ${escapeHtml(d.clientName)}</title>
          <style>
            * { box-sizing: border-box; }
            body { font-family: Arial, sans-serif; font-size: 12px; color: #111827; background: #e5e7eb; margin: 0; padding: 24px; }
            .wrap { max-width: 900px; margin: 0 auto; }
            .doc { background: #fff; border-radius: 12px; padding: 24px 28px 28px; box-shadow: 0 10px 30px rgba(15, 23, 42, 0.12); }
            .head { display:flex; justify-content:space-between; align-items:flex-start; gap: 24px; border-bottom: 2px solid #059669; padding-bottom: 16px; margin-bottom: 20px; }
            .company { font-size: 18px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; color: #059669; }
            .line { font-size: 11px; color: #6b7280; margin-top: 4px; }
            .title { font-size: 20px; font-weight: 700; text-align: right; letter-spacing: 0.08em; text-transform: uppercase; margin: 0; }
            .meta { margin-top: 6px; font-size: 11px; color: #4b5563; text-align: right; }
            .meta .label { color:#6b7280; display: inline-block; min-width: 90px; }
            .box { border: 1px solid #e5e7eb; border-radius: 10px; padding: 12px 14px; margin-bottom: 14px; background: #f9fafb; }
            .section-title { font-size: 11px; font-weight: 700; text-transform: uppercase; color:#6b7280; margin: 0 0 8px 0; }
            .grid { display:grid; grid-template-columns: 1fr 1fr; gap: 10px 14px; }
            .k { font-size:11px; color:#6b7280; margin-bottom:2px; }
            .v { font-size:13px; font-weight:600; color:#111827; }
            table { width: 100%; border-collapse: collapse; margin-top: 8px; }
            thead th { font-size: 11px; text-transform: uppercase; letter-spacing: .06em; background: #f3f4f6; color: #6b7280; padding: 8px 10px; border-bottom: 1px solid #e5e7eb; text-align: left; }
            tbody td { font-size: 12px; padding: 8px 10px; border-bottom: 1px solid #f3f4f6; vertical-align: top; }
            .text-right { text-align: right; }
            .totaux-wrap { margin-top: 14px; display: flex; justify-content: flex-end; }
            .totaux { width: 320px; border-collapse: collapse; font-size: 11px; }
            .totaux td { padding: 5px 0; }
            .totaux .label { color:#4b5563; }
            .totaux .value { text-align: right; font-variant-numeric: tabular-nums; }
            .totaux .big td { font-size: 14px; font-weight: 700; color: #059669; padding-top: 9px; }
            .notes { white-space: pre-wrap; font-size: 12px; line-height: 1.5; }
            .footer { margin-top: 18px; border-top: 1px solid #e5e7eb; padding-top: 14px; display:flex; justify-content:space-between; gap: 20px; font-size:11px; color:#6b7280; }
            @media print {
              body { background: #fff; padding: 0; }
              .doc { box-shadow: none; border-radius: 0; padding: 16px 22px 22px; }
            }
          </style>
        </head>
        <body>
          <div class="wrap">
            <div class="doc">
              <div class="head">
                <div>
                  <div class="company">EL MECANO GARAGE</div>
                  <div class="line">Devis atelier mecanique</div>
                </div>
                <div style="text-align:right">
                  <h1 class="title">Devis</h1>
                  <div class="meta">
                    <div><span class="label">Ref. demande :</span> #${d.id}</div>
                    <div><span class="label">Date :</span> ${formatDate(d.date)}</div>
                    <div><span class="label">Validite :</span> ${validite}</div>
                    <div><span class="label">Statut :</span> <span style="color:${statutColor};font-weight:700">${statut}</span></div>
                  </div>
                </div>
              </div>

              <div class="box">
                <div class="section-title">Informations client</div>
                <div class="grid">
                  <div><div class="k">Client</div><div class="v">${escapeHtml(d.clientName)}</div></div>
                  <div><div class="k">Telephone</div><div class="v">${escapeHtml(phone)}</div></div>
                  <div><div class="k">Vehicule</div><div class="v">${escapeHtml(vehicle)}</div></div>
                  <div><div class="k">Reference</div><div class="v">Demande #${d.id}</div></div>
                </div>
              </div>

              <div class="box">
                <div class="section-title">Detail de la demande</div>
                <table>
                  <thead>
                    <tr>
                      <th style="width:70%">Description des travaux demandes</th>
                      <th style="width:15%" class="text-right">Qté</th>
                      <th style="width:15%" class="text-right">Montant</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>${escapeHtml(d.description || '—')}</td>
                      <td class="text-right">1</td>
                      <td class="text-right">${montant}</td>
                    </tr>
                  </tbody>
                </table>
                <div class="totaux-wrap">
                  <table class="totaux">
                    <tr>
                      <td class="label">Montant HT</td>
                      <td class="value">${montant}</td>
                    </tr>
                    <tr>
                      <td class="label">TVA 19%</td>
                      <td class="value">${montantTva}</td>
                    </tr>
                    <tr>
                      <td class="label">Timbre fiscal</td>
                      <td class="value">${montantTimbre}</td>
                    </tr>
                    <tr class="big">
                      <td>Total TTC</td>
                      <td class="value">${montantTotal}</td>
                    </tr>
                  </table>
                </div>
              </div>

              <div class="box">
                <div class="section-title">Notes</div>
                <div class="notes">${escapeHtml(notes)}</div>
              </div>

              <div class="footer">
                <div>Bon pour accord client: ______________________</div>
                <div>Date: ____ / ____ / ______</div>
              </div>
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
    const [html2canvas, jspdfModule] = await Promise.all([import('html2canvas'), import('jspdf')])
    const jsPDF = jspdfModule.default

    const iframe = document.createElement('iframe')
    iframe.style.position = 'fixed'
    iframe.style.left = '0'
    iframe.style.top = '0'
    iframe.style.width = '800px'
    iframe.style.height = '1123px'
    iframe.style.opacity = '0'
    iframe.style.pointerEvents = 'none'
    iframe.style.zIndex = '-1'
    document.body.appendChild(iframe)

    const doc = iframe.contentDocument
    if (!doc) {
      document.body.removeChild(iframe)
      throw new Error('Impossible de creer le document PDF')
    }

    doc.open()
    doc.write(buildDevisHtml(d))
    doc.close()

    const body = doc.body
    await new Promise<void>(resolve => setTimeout(() => resolve(), 200))

    try {
      const canvas = await html2canvas.default(body, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: 800,
      })
      const imgData = canvas.toDataURL('image/jpeg', 0.98)
      const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' })
      const pdfW = pdf.internal.pageSize.getWidth()
      const pdfH = pdf.internal.pageSize.getHeight()
      const imgW = canvas.width
      const imgH = canvas.height
      const ratio = Math.min((pdfW - 20) / imgW, (pdfH - 20) / imgH) * 0.95
      const w = imgW * ratio
      const h = imgH * ratio
      const x = (pdfW - w) / 2
      const y = 10
      pdf.addImage(imgData, 'JPEG', x, y, w, h)
      pdf.save(`devis-${d.id}-${d.clientName.replace(/\s+/g, '_')}.pdf`)
    } finally {
      document.body.removeChild(iframe)
    }
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
