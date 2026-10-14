import { useCallback, useEffect, useRef, useState, type FormEvent, type KeyboardEvent, type MouseEvent as ReactMouseEvent, type ReactNode, type UIEvent } from 'react'
import { Link } from 'react-router-dom'
import {
  Archive,
  ArrowRight,
  ArrowUpRight,
  Bell,
  Car,
  Check,
  CheckCircle2,
  ClipboardList,
  Crown,
  Eye,
  LockKeyhole,
  MessageCircle,
  Smartphone,
  Users,
  Wallet,
  Wrench,
  X,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { apiFetch } from '@/lib/api'
import { AtelioLogo, AtelioMark, Browser, CountUp, DesignSwitcher, FEED_LEFT, FEED_RIGHT, FeedCard, MiniAcces, MiniChat, MiniFacture, MiniMoney, MiniReunion, MiniSuivi, PhoneMock, STYLES, SuiviMock } from './PresentationPage'

/**
 * Design 2 — « Atelier en direct »
 * Diaporama plein écran, une section sombre / une section claire.
 * Contenu et visuels propres à ce design (tableau Kanban, parcours d'une voiture,
 * charge par technicien, caisse, permissions, téléphone).
 */

type Tone = 'dark' | 'light' | 'soft' | 'warm'

const SLIDES: Array<{ id: string; label: string; tone: Tone }> = [
  { id: 'accueil', label: 'Accueil', tone: 'dark' },
  { id: 'pilotage', label: 'Pilotage', tone: 'light' },
  { id: 'equipe', label: 'Équipe', tone: 'dark' },
  { id: 'clients', label: 'Clients', tone: 'soft' },
  { id: 'argent', label: 'Argent', tone: 'dark' },
  { id: 'mobile', label: 'Mobile', tone: 'warm' },
  { id: 'demo', label: 'Démo', tone: 'dark' },
]

const MENU = [
  { i: 1, label: 'Pilotage' },
  { i: 2, label: 'Équipe' },
  { i: 3, label: 'Clients' },
  { i: 4, label: 'Argent' },
  { i: 5, label: 'Mobile' },
]

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,600;12..96,700&display=swap');
.dk-h { font-family: 'Bricolage Grotesque', 'Inter', system-ui, sans-serif; }
.dk-grid { background-image: linear-gradient(rgba(255,255,255,.045) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.045) 1px, transparent 1px); background-size: 64px 64px; }
.dk-snap { scroll-snap-type: y proximity; scroll-behavior: smooth; }
.dk-balance { text-wrap: balance; }
.dk-reveal { opacity: 0; transition: opacity .8s cubic-bezier(.2,.7,.2,1), transform .8s cubic-bezier(.2,.7,.2,1); }
.dk-reveal.up { transform: translateY(28px); }
.dk-reveal.left { transform: translateX(-36px); }
.dk-reveal.right { transform: translateX(36px); }
.dk-reveal.zoom { transform: scale(.94) translateY(20px); }
.dk-reveal.in { opacity: 1; transform: none; }
@keyframes dk-in { from { opacity: 0; transform: translateY(8px) scale(.97); } to { opacity: 1; transform: none; } }
.dk-in { animation: dk-in .5s cubic-bezier(.2,.8,.2,1) both; }
@keyframes dk-float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-9px); } }
.dk-float { animation: dk-float 6s ease-in-out infinite; }
@keyframes dk-pulse { 0%,100% { opacity: 1; } 50% { opacity: .35; } }
.dk-pulse { animation: dk-pulse 1.8s ease-in-out infinite; }
@keyframes dk-blob { 0%,100% { transform: scale(1); opacity: .9; } 50% { transform: scale(1.12); opacity: 1; } }
.dk-blob { animation: dk-blob 9s ease-in-out infinite; }
@keyframes dk-stagger { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: none; } }
.dk-hero > * { animation: dk-stagger .8s cubic-bezier(.2,.8,.2,1) both; }
.dk-hero > *:nth-child(2) { animation-delay: .12s; }
.dk-hero > *:nth-child(3) { animation-delay: .24s; }
@keyframes dk-grow { from { transform: scaleY(0); } to { transform: scaleY(1); } }
.dk-bar { transform-origin: bottom; animation: dk-grow .9s cubic-bezier(.2,.8,.2,1) both; }
.dk-hero > *:nth-child(4) { animation-delay: .36s; }
@keyframes dk-shimmer { to { background-position: 200% center; } }
.dk-shimmer { background-size: 200% auto; animation: dk-shimmer 4s linear infinite; }
@keyframes dk-word { from { opacity: 0; transform: translateY(55%) rotateX(-45deg); filter: blur(8px); } to { opacity: 1; transform: none; filter: blur(0); } }
.dk-word { display: inline-block; animation: dk-word .7s cubic-bezier(.2,.8,.2,1) both, dk-shimmer 4s linear infinite .7s; }
.dk-w { display: inline-block; opacity: 0; transform: translateY(.7em) rotateX(-40deg); filter: blur(6px); transition: opacity .7s cubic-bezier(.2,.7,.2,1), transform .7s cubic-bezier(.2,.7,.2,1), filter .7s; }
.dk-w.in { opacity: 1; transform: none; filter: blur(0); }
@keyframes dk-rise { 0% { transform: translateY(0) scale(.6); opacity: 0; } 15% { opacity: .9; } 100% { transform: translateY(-460px) scale(1.15); opacity: 0; } }
.dk-particle { position: absolute; bottom: -12px; border-radius: 9999px; background: #fb923c; box-shadow: 0 0 12px 2px rgba(251,146,60,.7); animation: dk-rise linear infinite; pointer-events: none; }
@keyframes dk-sheen { 0% { transform: translateX(-150%) skewX(-20deg); } 55%, 100% { transform: translateX(350%) skewX(-20deg); } }
.dk-btn { position: relative; overflow: hidden; }
.dk-btn::after { content: ''; position: absolute; top: 0; bottom: 0; left: 0; width: 40%; background: linear-gradient(90deg, transparent, rgba(255,255,255,.5), transparent); animation: dk-sheen 3.6s ease-in-out infinite; pointer-events: none; }
@keyframes dk-rot { to { transform: rotate(360deg); } }
.dk-orbit { animation: dk-rot 7s linear infinite; }
@keyframes dk-drift1 { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(70px,40px) scale(1.18); } }
@keyframes dk-drift2 { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(-80px,30px) scale(1.22); } }
.dk-drift1 { animation: dk-drift1 14s ease-in-out infinite; }
.dk-drift2 { animation: dk-drift2 18s ease-in-out infinite; }
.dk-lift { transition: transform .35s cubic-bezier(.2,.8,.2,1), box-shadow .35s; }
.dk-lift:hover { transform: translateY(-8px); box-shadow: 0 34px 70px -24px rgba(249,115,22,.45); }
@keyframes dk-prog { to { width: 100%; } }
.dk-prog { width: 0; animation: dk-prog 3.5s linear forwards; }
@media (prefers-reduced-motion: reduce) { .dk-snap { scroll-behavior: auto; } .dk-in, .dk-float, .dk-blob, .dk-hero > *, .dk-bar, .dk-word, .dk-shimmer, .dk-particle, .dk-btn::after, .dk-orbit, .dk-drift1, .dk-drift2 { animation: none; } .dk-w { opacity: 1; transform: none; filter: none; } .dk-prog { animation: none; width: 100%; } .dk-reveal { transition: none; } }
`

const BG: Record<Tone, string> = {
  dark: 'bg-[#0b0b0d] text-white',
  light: 'bg-white text-gray-950',
  soft: 'bg-stone-50 text-gray-950',
  warm: 'bg-gradient-to-b from-[#fff7ed] via-[#fffaf5] to-white text-gray-950',
}

/* ------------------------------------------------------------------ */
/* Briques de mise en page                                             */
/* ------------------------------------------------------------------ */

function Reveal({
  children,
  delay = 0,
  from = 'up',
  className = '',
}: {
  children: ReactNode
  delay?: number
  from?: 'up' | 'left' | 'right' | 'zoom'
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [seen, setSeen] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el || typeof IntersectionObserver === 'undefined') {
      setSeen(true)
      return
    }
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setSeen(true)
          io.disconnect()
        }
      },
      { threshold: 0.15 }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return (
    <div ref={ref} style={{ transitionDelay: `${delay}ms` }} className={`dk-reveal ${from} ${seen ? 'in' : ''} ${className}`}>
      {children}
    </div>
  )
}

const PARTICLES = Array.from({ length: 18 }, (_, i) => ({
  left: (i * 37 + 11) % 100,
  size: 2 + (i % 3),
  dur: 8 + (i % 6) * 2,
  delay: -((i * 1.7) % 12),
}))

function Slide({ index, children, className = '' }: { index: number; children: ReactNode; className?: string }) {
  const s = SLIDES[index]
  const dark = s.tone === 'dark'
  const onMove = (e: ReactMouseEvent<HTMLElement>) => {
    if (!dark) return
    const r = e.currentTarget.getBoundingClientRect()
    e.currentTarget.style.setProperty('--mx', `${e.clientX - r.left}px`)
    e.currentTarget.style.setProperty('--my', `${e.clientY - r.top}px`)
  }
  return (
    <section id={s.id} onMouseMove={onMove} className={`relative flex min-h-[100svh] snap-start items-center overflow-hidden ${BG[s.tone]} ${className}`}>
      {dark ? (
        <>
          <div className="dk-grid pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_70%_55%_at_50%_0%,black,transparent)]" />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-[520px] bg-[radial-gradient(ellipse_55%_60%_at_50%_0%,rgba(249,115,22,0.18),transparent)]" />
          <div className="dk-drift1 pointer-events-none absolute -left-24 top-24 h-96 w-96 rounded-full bg-orange-600/20 blur-[110px]" />
          <div className="dk-drift2 pointer-events-none absolute -right-24 bottom-10 h-96 w-96 rounded-full bg-amber-500/15 blur-[120px]" />
          <div className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(520px circle at var(--mx, 50%) var(--my, 30%), rgba(249,115,22,.13), transparent 60%)' }} />
          <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
            {PARTICLES.map((q, i) => (
              <span key={i} className="dk-particle" style={{ left: `${q.left}%`, width: q.size, height: q.size, animationDuration: `${q.dur}s`, animationDelay: `${q.delay}s` }} />
            ))}
          </div>
        </>
      ) : (
        <>
          <div className="dk-drift1 pointer-events-none absolute -right-24 top-10 h-96 w-96 rounded-full bg-orange-300/30 blur-3xl" />
          <div className="dk-drift2 pointer-events-none absolute -left-24 bottom-0 h-80 w-80 rounded-full bg-amber-200/40 blur-3xl" />
        </>
      )}
      <div className="relative mx-auto w-full max-w-7xl px-5 pb-24 pt-28 sm:px-10">{children}</div>
    </section>
  )
}

function Label({ n, children, dark = false }: { n: string; children: ReactNode; dark?: boolean }) {
  return (
    <p className={`flex items-center gap-2.5 text-[13px] font-medium ${dark ? 'text-gray-400' : 'text-gray-500'}`}>
      <span className="font-mono text-orange-500">{n}</span>
      <span className={`h-px w-6 ${dark ? 'bg-white/20' : 'bg-gray-300'}`} />
      {children}
    </p>
  )
}

function H2({ children, dark = false }: { children: ReactNode; dark?: boolean }) {
  const ref = useRef<HTMLHeadingElement>(null)
  const [seen, setSeen] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el || typeof IntersectionObserver === 'undefined') {
      setSeen(true)
      return
    }
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setSeen(true)
          io.disconnect()
        }
      },
      { threshold: 0.3 }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])
  const words = typeof children === 'string' ? children.split(' ') : null
  return (
    <h2 ref={ref} className={`dk-h dk-balance mt-5 max-w-2xl text-4xl font-semibold leading-[1.04] tracking-[-0.035em] sm:text-5xl xl:text-[3.5rem] ${dark ? 'text-white' : 'text-gray-950'}`}>
      {words
        ? words.map((w, i) => (
            <span key={i} className={`dk-w ${seen ? 'in' : ''}`} style={{ transitionDelay: `${i * 70}ms` }}>
              {w}
              {i < words.length - 1 ? '\u00A0' : ''}
            </span>
          ))
        : children}
    </h2>
  )
}

function Lead({ children, dark = false }: { children: ReactNode; dark?: boolean }) {
  return <p className={`mt-5 max-w-xl text-lg leading-relaxed ${dark ? 'text-gray-400' : 'text-gray-600'}`}>{children}</p>
}

function Points({ items, dark = false }: { items: string[]; dark?: boolean }) {
  return (
    <ul className="mt-8 space-y-3">
      {items.map((p, i) => (
        <li key={p}>
          <Reveal from="left" delay={i * 120}>
            <div className={`flex items-start gap-3 text-[15px] font-medium ${dark ? 'text-gray-200' : 'text-gray-800'}`}>
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-orange-500/15 text-orange-500">
                <Check className="h-3 w-3 stroke-[3]" />
              </span>
              {p}
            </div>
          </Reveal>
        </li>
      ))}
    </ul>
  )
}

const WORDS = ['avec précision', 'en temps réel', 'à distance', 'sans papier']

function RotatingWord() {
  const [i, setI] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setI((x) => (x + 1) % WORDS.length), 2600)
    return () => clearInterval(t)
  }, [])
  return (
    <span key={i} className="dk-word bg-gradient-to-r from-orange-400 via-amber-200 to-orange-500 bg-clip-text text-transparent">
      {WORDS[i]}
    </span>
  )
}

function TiltStage({ children }: { children: ReactNode }) {
  const [t, setT] = useState({ x: 0, y: 0, on: false })
  return (
    <div
      onMouseMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect()
        setT({ x: (e.clientX - r.left) / r.width - 0.5, y: (e.clientY - r.top) / r.height - 0.5, on: true })
      }}
      onMouseLeave={() => setT({ x: 0, y: 0, on: false })}
      style={{
        transform: `perspective(1600px) rotateX(${(-t.y * 6).toFixed(2)}deg) rotateY(${(t.x * 8).toFixed(2)}deg)`,
        transition: t.on ? 'transform .12s ease-out' : 'transform .7s cubic-bezier(.2,.8,.2,1)',
      }}
    >
      {children}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Diaporama automatique                                               */
/* ------------------------------------------------------------------ */

type SlideItem = { title: string; text: string; node: ReactNode }

function AutoSlider({ items }: { items: SlideItem[] }) {
  const [i, setI] = useState(0)
  const [paused, setPaused] = useState(false)
  const next = useCallback(() => setI((x) => (x + 1) % items.length), [items.length])

  return (
    <div onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} className="grid items-stretch gap-5 lg:grid-cols-[0.8fr_1.2fr]">
      <div className="flex flex-col gap-2">
        {items.map((it, idx) => {
          const on = idx === i
          return (
            <button
              key={it.title}
              type="button"
              onClick={() => setI(idx)}
              className={`relative overflow-hidden rounded-2xl p-5 text-left transition ${on ? 'bg-white/[0.07] ring-1 ring-white/15' : 'hover:bg-white/[0.04]'}`}
            >
              <div className="flex items-center gap-3">
                <span className={`font-mono text-xs font-semibold ${on ? 'text-orange-400' : 'text-gray-600'}`}>{String(idx + 1).padStart(2, '0')}</span>
                <span className={`dk-h text-lg font-semibold transition ${on ? 'text-white' : 'text-gray-400'}`}>{it.title}</span>
              </div>
              <div className={`grid transition-all duration-500 ${on ? 'mt-2 grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                <p className="overflow-hidden pl-8 text-sm leading-relaxed text-gray-400">{it.text}</p>
              </div>
              {on ? (
                <span className="absolute inset-x-0 bottom-0 h-[3px] bg-white/10">
                  <span key={i} onAnimationEnd={next} className="dk-prog block h-full bg-orange-500" style={{ animationPlayState: paused ? 'paused' : 'running' }} />
                </span>
              ) : null}
            </button>
          )
        })}
      </div>

      <div className="relative overflow-hidden rounded-3xl bg-white/[0.04] ring-1 ring-white/10">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_60%_at_50%_100%,rgba(249,115,22,0.2),transparent)]" />
        <div className="relative flex h-full min-h-[440px] transition-transform duration-700 ease-[cubic-bezier(.7,0,.2,1)]" style={{ transform: `translateX(-${i * 100}%)` }}>
          {items.map((it) => (
            <div key={it.title} className="flex w-full shrink-0 items-center justify-center p-6 sm:p-10">
              <div className="w-full max-w-md rounded-2xl bg-white p-4 text-gray-950 shadow-[0_30px_80px_rgba(0,0,0,0.5)]">{it.node}</div>
            </div>
          ))}
        </div>
        <div className="absolute inset-x-0 bottom-4 flex justify-center gap-2">
          {items.map((it, idx) => (
            <button key={it.title} type="button" aria-label={it.title} onClick={() => setI(idx)} className={`h-1.5 rounded-full transition-all duration-500 ${idx === i ? 'w-8 bg-orange-500' : 'w-1.5 bg-white/30 hover:bg-white/60'}`} />
          ))}
        </div>
      </div>
    </div>
  )
}

const TEAM_SLIDES: SlideItem[] = [
  { title: 'Réunion du jour', text: 'Une note par véhicule présent dans l’atelier, filtrée par état, avec les techniciens affectés.', node: <MiniReunion /> },
  { title: 'Messagerie interne', text: 'Échanges d’équipe, pièces jointes et rappels, sans passer par des groupes externes.', node: <MiniChat /> },
  { title: 'Droits d’accès par rôle', text: 'Chaque collaborateur accède uniquement aux écrans et aux opérations qui lui sont autorisés.', node: <MiniAcces /> },
  { title: 'Suivi de l’atelier', text: 'Vue d’ensemble des véhicules au garage, des véhicules validés et des mouvements du jour.', node: <MiniSuivi /> },
]

const MONEY_SLIDES: SlideItem[] = [
  { title: 'Caisse et Money', text: 'Entrées et sorties classées par types et catégories entièrement paramétrables.', node: <MiniMoney /> },
  { title: 'Devis et facturation', text: 'Documents clients, paiements partiels et suivi des règlements.', node: <MiniFacture /> },
  {
    title: 'Achats et stock',
    text: 'Achats fournisseurs, acomptes et stock général rattachés à l’activité de l’atelier.',
    node: (
      <ul className="space-y-3.5 p-2 text-[15px] font-medium text-gray-800">
        {['Achats et transactions fournisseurs', 'Acomptes et soldes suivis', 'Stock général et marge de vente', 'Charges mensuelles récurrentes', 'Paiements partiels clients'].map((x) => (
          <li key={x} className="flex items-center gap-3">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-orange-500" />
            {x}
          </li>
        ))}
      </ul>
    ),
  },
]

/* ------------------------------------------------------------------ */
/* Couleurs des états (utilisées par l’aperçu mobile)                  */
/* ------------------------------------------------------------------ */

const COLS = [
  { k: 'Entrée', c: '#94a3b8' },
  { k: 'Diagnostic', c: '#fbbf24' },
  { k: 'Réparation', c: '#f97316' },
  { k: 'Attente pièces', c: '#a855f7' },
  { k: 'Test', c: '#38bdf8' },
  { k: 'Validé', c: '#10b981' },
]

type KCar = { id: number; m: string; p: string; t: string; col: number }

const KCARS: KCar[] = [
  { id: 1, m: 'Golf 8 GTI', p: '214 TU 8891', t: 'Mohamed B.', col: 2 },
  { id: 2, m: 'BMW X5', p: '198 TU 4402', t: 'Bilel K.', col: 1 },
  { id: 3, m: 'Peugeot 3008', p: '231 TU 1120', t: 'Amine J.', col: 4 },
  { id: 4, m: 'Audi A4', p: '205 TU 7734', t: 'Yassine T.', col: 3 },
  { id: 5, m: 'Clio 5', p: '187 TU 3321', t: 'Rami O.', col: 0 },
  { id: 6, m: 'Kia Sportage', p: '222 TU 9087', t: 'Amine J.', col: 2 },
  { id: 7, m: 'Toyota C-HR', p: '176 TU 5540', t: 'Bilel K.', col: 5 },
]

/* ------------------------------------------------------------------ */
/* 2. Pilotage — le parcours d'une voiture                             */
/* ------------------------------------------------------------------ */

const JOURNEY = [
  { t: '08:10', l: 'Entrée au garage', d: 'Création de la fiche à la réception : immatriculation, client, motif d’intervention et photos.', who: 'Réception' },
  { t: '08:45', l: 'Diagnostic', d: 'Affectation d’un ou plusieurs techniciens par le chef d’atelier. Leurs noms complets figurent sur la fiche.', who: 'Chef d’atelier' },
  { t: '10:30', l: 'En réparation', d: 'Le détail des travaux reste consultable par toute l’équipe : distribution, pompe à eau, vidange de boîte.', who: 'Mohamed B., Yassine T.' },
  { t: '12:15', l: 'Attente de pièces', d: 'La commande est rattachée au fournisseur et au véhicule, qui reste signalé jusqu’à la réception de la pièce.', who: 'Magasin' },
  { t: '15:20', l: 'Test sur route', d: 'Contrôle final et checklist de sortie avant la remise du véhicule au client.', who: 'Chef d’atelier' },
  { t: '16:05', l: 'Validation et archivage', d: 'Le véhicule quitte la liste active et rejoint les archives, sans intervention manuelle.', who: 'Automatisé' },
]

function CarJourney() {
  const [step, setStep] = useState(0)
  const [hover, setHover] = useState(false)

  useEffect(() => {
    if (hover) return
    const t = setInterval(() => setStep((s) => (s + 1) % JOURNEY.length), 3200)
    return () => clearInterval(t)
  }, [hover])

  const cur = JOURNEY[step]
  return (
    <div onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)} className="rounded-3xl bg-gray-50 p-4 shadow-[0_40px_90px_rgba(15,23,42,0.1)] ring-1 ring-black/[0.05] sm:p-6">
      <div className="flex items-center justify-between gap-3 rounded-2xl bg-white p-4 ring-1 ring-black/[0.05]">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gray-950 text-white">
            <Car className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-semibold text-gray-950">Golf 8 GTI</p>
            <p className="font-mono text-xs text-gray-500">214 TU 8891 · Karim M.</p>
          </div>
        </div>
        <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-bold text-orange-700">VIP Advanced</span>
      </div>

      <div className="mt-5 grid gap-5 md:grid-cols-[1fr_1.1fr]">
        <ol className="relative space-y-1">
          <span className="absolute bottom-3 left-[15px] top-3 w-px bg-gray-200" />
          {JOURNEY.map((s, i) => {
            const state = i < step ? 'done' : i === step ? 'now' : 'todo'
            return (
              <li key={s.l}>
                <button type="button" onClick={() => setStep(i)} className="relative flex w-full items-center gap-3 rounded-xl px-1 py-2 text-left transition hover:bg-white">
                  <span
                    className={`relative z-10 flex h-[31px] w-[31px] shrink-0 items-center justify-center rounded-full text-[11px] font-bold transition ${
                      state === 'done' ? 'bg-emerald-500 text-white' : state === 'now' ? 'bg-orange-500 text-white shadow-[0_0_0_6px_rgba(249,115,22,0.18)]' : 'bg-white text-gray-400 ring-1 ring-gray-200'
                    }`}
                  >
                    {state === 'done' ? <Check className="h-3.5 w-3.5 stroke-[3]" /> : i + 1}
                  </span>
                  <span className="min-w-0">
                    <span className={`block text-sm font-semibold transition ${state === 'todo' ? 'text-gray-400' : 'text-gray-950'}`}>{s.l}</span>
                    <span className="font-mono text-[11px] text-gray-400">{s.t}</span>
                  </span>
                </button>
              </li>
            )
          })}
        </ol>

        <div key={step} className="dk-in flex flex-col justify-between rounded-2xl bg-white p-5 ring-1 ring-black/[0.05]">
          <div>
            <p className="font-mono text-xs font-semibold text-orange-500">{cur.t}</p>
            <p className="dk-h mt-1 text-xl font-semibold tracking-tight text-gray-950">{cur.l}</p>
            <p className="mt-2.5 text-sm leading-relaxed text-gray-600">{cur.d}</p>
          </div>
          <div className="mt-5 flex items-center justify-between border-t border-gray-100 pt-4 text-xs">
            <span className="text-gray-500">Responsable</span>
            <span className="font-semibold text-gray-900">{cur.who}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* 4. Clients — carte VIP + relances                                   */
/* ------------------------------------------------------------------ */

function VipCard() {
  const [tier, setTier] = useState<'Standard' | 'Advanced'>('Advanced')
  const adv = tier === 'Advanced'
  return (
    <div>
      <div className="mb-4 inline-flex rounded-full bg-white p-1 text-xs font-semibold shadow-sm ring-1 ring-black/[0.06]">
        {(['Standard', 'Advanced'] as const).map((t) => (
          <button key={t} type="button" onClick={() => setTier(t)} className={`rounded-full px-4 py-1.5 transition ${tier === t ? 'bg-orange-500 text-white' : 'text-gray-500 hover:text-gray-900'}`}>
            {t}
          </button>
        ))}
      </div>
      <div
        className={`relative h-[210px] w-full max-w-[380px] overflow-hidden rounded-3xl p-6 shadow-[0_30px_70px_rgba(15,23,42,0.18)] transition-all duration-500 ${
          adv ? 'bg-gradient-to-br from-gray-900 to-gray-800 text-white' : 'bg-white text-gray-950 ring-1 ring-black/[0.08]'
        }`}
      >
        <div className="absolute -right-12 -top-12 h-44 w-44 rounded-full bg-orange-500" />
        <div className="relative flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <AtelioMark className="h-9 w-9 rounded-xl object-cover" />
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest">ATELIO</p>
              <p className={`text-[11px] ${adv ? 'text-gray-400' : 'text-gray-500'}`}>Carte privilège</p>
            </div>
          </div>
          <Crown className="relative mr-1 mt-1 h-5 w-5 text-white" />
        </div>
        <p className="relative mt-9 font-mono text-xl font-semibold tracking-[0.22em]">VIP-2026-0849</p>
        <div className="relative mt-5 flex items-end justify-between text-xs">
          <div>
            <p className={`text-[10px] uppercase ${adv ? 'text-gray-400' : 'text-gray-500'}`}>Titulaire</p>
            <p className="font-semibold">Karim Mansouri</p>
          </div>
          <div className="text-right">
            <p className={`text-[10px] uppercase ${adv ? 'text-gray-400' : 'text-gray-500'}`}>Valide jusqu’au</p>
            <p className="font-semibold">31/12/2026</p>
          </div>
        </div>
        <span className={`absolute bottom-5 left-1/2 hidden -translate-x-1/2 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${adv ? 'bg-orange-500 text-white' : 'bg-gray-950 text-white'}`}>{tier}</span>
      </div>
    </div>
  )
}

const RELANCES = [
  { n: 'Walid Toumi', what: 'Solde restant dû', v: '650 DT', c: 'bg-amber-100 text-amber-700' },
  { n: 'Sonia Gharbi', what: 'Réclamation externe', v: 'Ouverte', c: 'bg-red-100 text-red-700' },
  { n: 'Mehdi Karray', what: 'Renouvellement de carte VIP', v: 'Dans 12 jours', c: 'bg-orange-100 text-orange-700' },
]

function Relances() {
  return (
    <div className="w-full max-w-[380px] rounded-3xl bg-white p-5 shadow-[0_30px_70px_rgba(15,23,42,0.08)] ring-1 ring-black/[0.05]">
      <p className="text-sm font-semibold text-gray-950">Actions du jour</p>
      <div className="mt-4 space-y-2.5">
        {RELANCES.map((r, i) => (
          <Reveal key={r.n} delay={i * 130}>
            <div className="flex items-center justify-between gap-3 rounded-xl bg-gray-50 px-3.5 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-gray-900">{r.n}</p>
                <p className="text-xs text-gray-500">{r.what}</p>
              </div>
              <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${r.c}`}>{r.v}</span>
            </div>
          </Reveal>
        ))}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* 6. Mobile — téléphone + matrice d'accès                             */
/* ------------------------------------------------------------------ */

const NOTIFS = [
  { i: CheckCircle2, c: 'text-emerald-500', t: 'Peugeot 3008 validée', s: 'Amine J. · il y a 2 min' },
  { i: Wallet, c: 'text-orange-500', t: 'Encaissement 1 480 DT', s: 'Golf 8 GTI · il y a 8 min' },
  { i: MessageCircle, c: 'text-sky-500', t: 'Nouveau message', s: 'Chat atelier · il y a 12 min' },
]

function Phone() {
  const [n, setN] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setN((x) => (x + 1) % NOTIFS.length), 3000)
    return () => clearInterval(t)
  }, [])
  const N = NOTIFS[n]
  return (
    <div className="dk-float relative mx-auto w-[270px]">
      <div className="dk-blob pointer-events-none absolute -inset-10 rounded-full bg-orange-400/30 blur-3xl" />
      <div className="relative rounded-[42px] bg-gray-950 p-2.5 shadow-[0_50px_100px_rgba(15,23,42,0.35)] ring-1 ring-black/40">
        <div className="relative h-[540px] overflow-hidden rounded-[34px] bg-stone-50">
          <div className="absolute left-1/2 top-2.5 z-20 h-5 w-24 -translate-x-1/2 rounded-full bg-gray-950" />
          <div className="px-4 pt-11">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] text-gray-500">Bonjour</p>
                <p className="dk-h text-lg font-semibold text-gray-950">Aujourd’hui</p>
              </div>
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-100 text-orange-600"><Bell className="h-4 w-4" /></span>
            </div>

            <div key={n} className="dk-in mt-3 flex items-center gap-2.5 rounded-2xl bg-white p-3 shadow-md ring-1 ring-black/[0.05]">
              <N.i className={`h-5 w-5 shrink-0 ${N.c}`} />
              <div className="min-w-0">
                <p className="truncate text-[12px] font-semibold text-gray-950">{N.t}</p>
                <p className="truncate text-[10px] text-gray-500">{N.s}</p>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 p-3 text-white">
                <p className="text-[9px] font-semibold uppercase tracking-wide opacity-80">Recette</p>
                <p className="dk-h text-lg font-semibold">4 820 DT</p>
              </div>
              <div className="rounded-2xl bg-white p-3 ring-1 ring-black/[0.05]">
                <p className="text-[9px] font-semibold uppercase tracking-wide text-gray-500">Au garage</p>
                <p className="dk-h text-lg font-semibold text-gray-950">11</p>
              </div>
            </div>

            <p className="mt-4 text-[10px] font-bold uppercase tracking-wide text-gray-500">En cours</p>
            <div className="mt-2 space-y-2">
              {KCARS.slice(0, 4).map((c) => (
                <div key={c.id} className="flex items-center gap-2.5 rounded-xl bg-white p-2.5 ring-1 ring-black/[0.05]">
                  <span className="h-2 w-2 rounded-full" style={{ background: COLS[c.col].c }} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12px] font-semibold text-gray-950">{c.m}</p>
                    <p className="text-[10px] text-gray-500">{c.t}</p>
                  </div>
                  <span className="text-[10px] font-bold" style={{ color: COLS[c.col].c }}>{COLS[c.col].k}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="absolute inset-x-0 bottom-0 flex h-14 items-center justify-around border-t border-gray-200 bg-white/90 backdrop-blur">
            {[Car, Wallet, MessageCircle, Users].map((Ic, i) => (
              <Ic key={i} className={`h-5 w-5 ${i === 0 ? 'text-orange-500' : 'text-gray-400'}`} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

const ROLES = ['Gérant', 'Chef d’atelier', 'Réception', 'Technicien']
const MODS = ['Caisse', 'Véhicules', 'Clients', 'Stats']
const ACCESS_INIT = [
  [true, true, true, true],
  [false, true, true, true],
  [true, false, true, false],
  [false, true, false, false],
]

function AccessMatrix() {
  const [acc, setAcc] = useState(ACCESS_INIT)
  const toggle = (r: number, m: number) => setAcc((a) => a.map((row, i) => (i === r ? row.map((v, j) => (j === m ? !v : v)) : row)))
  return (
    <div className="mt-8 max-w-lg rounded-3xl bg-white p-4 shadow-[0_30px_70px_rgba(15,23,42,0.08)] ring-1 ring-black/[0.05] sm:p-5">
      <div className="flex items-center gap-2 text-sm font-semibold text-gray-950">
        <LockKeyhole className="h-4 w-4 text-orange-500" /> Droits d’accès par rôle
        <span className="ml-auto text-[11px] font-medium text-gray-400">Cliquez pour modifier un droit</span>
      </div>
      <div className="mt-4 grid grid-cols-[1.3fr_repeat(4,1fr)] items-center gap-y-2 text-center">
        <span />
        {MODS.map((m) => (
          <span key={m} className="text-[10px] font-bold uppercase tracking-wide text-gray-400">{m}</span>
        ))}
        {ROLES.map((r, ri) => (
          <div key={r} className="contents">
            <span className="text-left text-[13px] font-semibold text-gray-900">{r}</span>
            {MODS.map((m, mi) => (
              <span key={m} className="flex justify-center">
                <button
                  type="button"
                  aria-label={`${r} : ${m}`}
                  onClick={() => toggle(ri, mi)}
                  className={`flex h-7 w-7 items-center justify-center rounded-lg transition ${acc[ri][mi] ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-300 hover:bg-gray-200'}`}
                >
                  {acc[ri][mi] ? <Check className="h-3.5 w-3.5 stroke-[3]" /> : <X className="h-3.5 w-3.5" />}
                </button>
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function PresentationSombrePage() {
  const { isAuthenticated } = useAuth()
  const scroller = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(0)
  const progress = useRef<HTMLDivElement>(null)

  const onScroll = (e: UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget
    el.style.setProperty('--sy', String(Math.round(el.scrollTop)))
    const max = el.scrollHeight - el.clientHeight
    if (progress.current) progress.current.style.transform = `scaleX(${max > 0 ? el.scrollTop / max : 0})`
  }

  useEffect(() => {
    document.title = 'ATELIO · Atelier en direct'
    scroller.current?.focus({ preventScroll: true })
  }, [])

  useEffect(() => {
    const root = scroller.current
    if (!root || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            const i = SLIDES.findIndex((s) => s.id === e.target.id)
            if (i >= 0) setActive(i)
          }
        })
      },
      { root, threshold: 0.5 }
    )
    SLIDES.forEach((s) => {
      const el = document.getElementById(s.id)
      if (el) io.observe(el)
    })
    return () => io.disconnect()
  }, [])

  const goTo = useCallback((i: number) => {
    const clamped = Math.max(0, Math.min(SLIDES.length - 1, i))
    document.getElementById(SLIDES[clamped].id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const tag = (e.target as HTMLElement).tagName
    if (tag === 'INPUT' || tag === 'TEXTAREA') return
    if (e.key === 'ArrowDown' || e.key === 'PageDown') {
      e.preventDefault()
      goTo(active + 1)
    } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
      e.preventDefault()
      goTo(active - 1)
    }
  }

  const appHref = isAuthenticated ? '/dashboard' : '/login'
  const appLabel = isAuthenticated ? 'Ouvrir l’application' : 'Connexion'
  const onDark = SLIDES[active].tone === 'dark'
  const ink = onDark ? 'text-white' : 'text-gray-950'

  return (
    <div ref={scroller} tabIndex={0} onKeyDown={onKey} onScroll={onScroll} className="dk-snap fixed inset-0 overflow-y-auto overflow-x-hidden bg-[#0b0b0d] outline-none">
      <style>{STYLES}</style>
      <style>{CSS}</style>
      <DesignSwitcher current={2} dark={onDark} accent="bg-orange-500" />

      {/* Progression */}
      <div className="pointer-events-none fixed inset-x-0 top-0 z-40 h-[3px]">
        <div ref={progress} className="h-full origin-left bg-gradient-to-r from-orange-500 via-amber-400 to-orange-500" style={{ transform: 'scaleX(0)' }} />
      </div>

      {/* Barre de navigation */}
      <header className="fixed inset-x-0 top-0 z-30 px-3 pt-3 sm:px-6">
        <div
          className={`mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 rounded-2xl px-4 backdrop-blur-xl transition-colors duration-500 sm:px-5 ${
            onDark ? 'bg-white/[0.06] ring-1 ring-white/10' : 'bg-white/75 shadow-[0_8px_30px_rgba(15,23,42,0.06)] ring-1 ring-black/[0.06]'
          } ${ink}`}
        >
          <button type="button" onClick={() => goTo(0)} className="flex items-center">
            <AtelioLogo dark={onDark} size={36} word={0.5} />
          </button>
          <nav className="hidden items-center gap-1 md:flex">
            {MENU.map((m) => (
              <button
                key={m.i}
                type="button"
                onClick={() => goTo(m.i)}
                className={`rounded-lg px-3.5 py-1.5 text-sm transition ${active === m.i ? 'bg-orange-500/10 font-semibold text-orange-500' : onDark ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-950'}`}
              >
                {m.label}
              </button>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <Link to={appHref} className="hidden text-sm font-medium opacity-80 hover:opacity-100 sm:inline">{appLabel}</Link>
            <button type="button" onClick={() => goTo(SLIDES.length - 1)} className="dk-btn rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-orange-600">
              Demander une démo
            </button>
          </div>
        </div>
      </header>

      {/* Navigation latérale */}
      <nav aria-label="Sections" className={`fixed right-4 top-1/2 z-30 hidden -translate-y-1/2 flex-col items-center gap-2.5 sm:flex ${ink}`}>
        {SLIDES.map((s, i) => (
          <button key={s.id} type="button" onClick={() => goTo(i)} aria-label={s.label} title={s.label} className="group py-1">
            <span className={`block w-1 rounded-full transition-all duration-300 ${i === active ? 'h-6 bg-orange-500' : `h-1 ${onDark ? 'bg-white/30 group-hover:bg-white/60' : 'bg-gray-950/20 group-hover:bg-gray-950/50'}`}`} />
          </button>
        ))}
      </nav>

      <div className={`pointer-events-none fixed bottom-5 right-5 z-30 font-mono text-xs font-medium opacity-70 sm:right-10 ${ink}`}>
        {String(active + 1).padStart(2, '0')} / {String(SLIDES.length).padStart(2, '0')}
      </div>

      {/* ACCUEIL */}
      <Slide index={0} className="!items-start">
        <div className="dk-hero mx-auto max-w-4xl text-center">
          <h1 className="dk-h dk-balance text-[2.6rem] font-semibold leading-[1.02] tracking-[-0.04em] sm:text-6xl xl:text-[5.2rem]">
            <span className="bg-gradient-to-b from-white to-gray-400 bg-clip-text text-transparent">Pilotez votre atelier</span>
            <br />
            <RotatingWord />
            <span className="text-orange-500">.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-gray-400 sm:text-xl">
            ATELIO réunit le suivi des véhicules, la gestion des équipes, la relation client et la trésorerie dans une plateforme unique, accessible sur ordinateur comme sur mobile.
          </p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
            <button type="button" onClick={() => goTo(SLIDES.length - 1)} className="dk-btn group inline-flex items-center gap-2 rounded-xl bg-orange-500 px-6 py-3.5 text-sm font-semibold text-white shadow-[0_10px_30px_rgba(249,115,22,0.35)] transition hover:bg-orange-600">
              Demander une démo <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
            </button>
            <Link to={appHref} className="inline-flex items-center gap-1.5 rounded-xl px-5 py-3.5 text-sm font-semibold text-white ring-1 ring-white/15 transition hover:bg-white/5">
              Voir l’application <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="mx-auto mt-10 grid max-w-2xl grid-cols-3 gap-6 border-t border-white/10 pt-8">
            {[
              { v: 45, s: ' s', l: 'pour ouvrir une fiche véhicule' },
              { v: 100, s: ' %', l: 'de l’équipe visible sur chaque fiche' },
              { v: 24, s: ' h / 24', l: 'suivi depuis votre téléphone' },
            ].map((x) => (
              <div key={x.l}>
                <p className="dk-h text-3xl font-semibold text-white sm:text-4xl">
                  <CountUp to={x.v} suffix={x.s} />
                </p>
                <p className="mt-1 text-xs leading-snug text-gray-400">{x.l}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative mx-auto mt-16 max-w-5xl">
          <div className="dk-blob pointer-events-none absolute -inset-x-10 top-10 h-72 rounded-full bg-orange-500/20 blur-[110px]" />
          <TiltStage>
            <div className="relative">
              <div style={{ transform: 'translateY(calc(var(--sy, 0) * -0.035px))' }}>
                <div className="overflow-hidden rounded-2xl shadow-[0_50px_120px_rgba(0,0,0,0.6)] ring-1 ring-white/10">
                  <Browser url="atelio.app/suivi"><SuiviMock /></Browser>
                </div>
              </div>
              <div className="absolute -top-7 right-6 hidden md:block" style={{ transform: 'translateY(calc(var(--sy, 0) * -0.09px))' }}><FeedCard items={FEED_LEFT} interval={3800} offset={600} className="em-float" /></div>
              <div className="absolute -bottom-10 left-[-1rem] hidden md:block lg:left-[-3rem]" style={{ transform: 'translateY(calc(var(--sy, 0) * 0.05px))' }}><FeedCard items={FEED_RIGHT} interval={4200} offset={2200} className="em-float-slow" /></div>
              <div className="absolute -bottom-20 right-2 hidden origin-bottom-right scale-[.8] sm:block lg:right-[-3rem] lg:scale-90">
                <div style={{ transform: 'translateY(calc(var(--sy, 0) * -0.07px))' }}><div className="em-float-slow"><PhoneMock /></div></div>
              </div>
            </div>
          </TiltStage>
        </div>
      </Slide>

      {/* 01 — PILOTAGE */}
      <Slide index={1}>
        <div className="grid items-center gap-14 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <Label n="01">Pilotage</Label>
            <H2>Une visibilité complète sur l’activité de l’atelier.</H2>
            <Lead>Chaque véhicule dispose d’un historique horodaté, de son entrée au garage jusqu’à son archivage. Le responsable suit l’avancement en temps réel, sur place comme à distance.</Lead>
            <Points items={['Réunion quotidienne limitée aux véhicules présents dans l’atelier', 'Suivi à distance distinguant les véhicules validés et les mouvements du jour', 'Archivage automatique dès la validation du véhicule']} />
          </div>
          <Reveal from="zoom">
            <CarJourney />
          </Reveal>
        </div>
      </Slide>

      {/* 02 — ÉQUIPE */}
      <Slide index={2}>
        <div className="grid items-end gap-8 lg:grid-cols-2">
          <div>
            <Label n="02" dark>Équipe</Label>
            <H2 dark>Une équipe coordonnée, une charge de travail maîtrisée.</H2>
          </div>
          <Lead dark>Affectez un ou plusieurs techniciens à chaque véhicule, animez la réunion quotidienne et échangez via la messagerie interne, sans multiplier les outils.</Lead>
        </div>
        <div className="mt-12">
          <AutoSlider items={TEAM_SLIDES} />
        </div>
      </Slide>

      {/* 03 — CLIENTS */}
      <Slide index={3}>
        <div className="grid items-center gap-14 lg:grid-cols-2">
          <div>
            <Label n="03">Clients</Label>
            <H2>Une relation client suivie et valorisée.</H2>
            <Lead>Historique des interventions, réclamations, créances et carte VIP sont centralisés dans une fiche unique, avec numéro de carte et période de validité.</Lead>
            <Points items={['Carte VIP à deux niveaux : Standard et Advanced', 'Réclamations externes et internes traitées séparément', 'Créances clients suivies et relancées']} />
          </div>
          <Reveal from="right">
            <div className="flex flex-col items-start gap-6 lg:items-end">
              <VipCard />
              <Relances />
            </div>
          </Reveal>
        </div>
      </Slide>

      {/* 04 — ARGENT */}
      <Slide index={4}>
        <div className="grid items-end gap-8 lg:grid-cols-2">
          <div>
            <Label n="04" dark>Argent</Label>
            <H2 dark>Une trésorerie claire, ligne par ligne.</H2>
          </div>
          <Lead dark>Devis, factures, paiements partiels, caisse de l’équipe et flux Money suivent l’activité de l’atelier. Les types d’entrée et les catégories de sortie sont entièrement paramétrables.</Lead>
        </div>
        <div className="mt-12">
          <AutoSlider items={MONEY_SLIDES} />
        </div>
      </Slide>

      {/* 05 — MOBILE */}
      <Slide index={5}>
        <div className="grid items-center gap-14 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <Label n="05">Mobile</Label>
            <H2>Une application mobile, des accès maîtrisés.</H2>
            <Lead>L’application Android partage les comptes et les droits de la version web. Notifications, rappels et messagerie accompagnent l’équipe au plus près du terrain.</Lead>
            <AccessMatrix />
            <div className="mt-6 flex flex-wrap gap-x-6 gap-y-3 text-sm font-medium text-gray-700">
              {[
                [Smartphone, 'Android'],
                [Bell, 'Rappels'],
                [ClipboardList, 'Checklists'],
                [Archive, 'Archives'],
                [Eye, 'Suivi à distance'],
              ].map(([Icon, label]) => {
                const I = Icon as typeof Eye
                return (
                  <span key={String(label)} className="flex items-center gap-2">
                    <I className="h-4 w-4 text-orange-500" />
                    {String(label)}
                  </span>
                )
              })}
            </div>
          </div>
          <Reveal from="zoom">
            <Phone />
          </Reveal>
        </div>
      </Slide>

      {/* DÉMO */}
      <Slide index={6}>
        <div className="grid items-center gap-14 lg:grid-cols-2">
          <div>
            <Label n="06" dark>Démo</Label>
            <H2 dark>Planifiez une démonstration adaptée à votre atelier.</H2>
            <Lead dark>Indiquez vos coordonnées : nous vous recontactons pour présenter la solution à partir de votre organisation. Les conditions tarifaires sont abordées lors de cet échange.</Lead>
            <Points dark items={['Démonstration adaptée à votre organisation', 'Version web et application mobile', 'Prise de contact par téléphone']} />
          </div>
          <DemoForm />
        </div>
        <footer className="mt-16 flex flex-col items-start justify-between gap-5 border-t border-white/10 pt-7 sm:flex-row sm:items-center">
          <AtelioLogo dark size={38} word={0.5} />
          <div className="flex items-center gap-6 text-sm text-gray-400">
            <Link to={appHref} className="font-semibold text-white hover:underline">{appLabel}</Link>
            <button type="button" onClick={() => goTo(0)} className="hover:text-white">Revenir en haut</button>
          </div>
        </footer>
      </Slide>
    </div>
  )
}

function DemoForm() {
  const [form, setForm] = useState({ nom: '', garage: '', telephone: '', ponts: '', message: '' })
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)
  const [saving, setSaving] = useState(false)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    if (!form.nom.trim() || !form.garage.trim() || !form.telephone.trim()) {
      setError('Le nom, le garage et le téléphone sont obligatoires.')
      return
    }
    setSaving(true)
    try {
      await apiFetch('/demandes-demo', {
        method: 'POST',
        body: JSON.stringify({
          nom: form.nom.trim(),
          garage: form.garage.trim(),
          telephone: form.telephone.trim(),
          ponts: form.ponts,
          message: form.message.trim(),
        }),
      })
      setSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'L’envoi a échoué. Veuillez réessayer.')
    } finally {
      setSaving(false)
    }
  }

  const input = 'mt-1.5 w-full rounded-xl border border-white/10 bg-white/[0.05] px-3.5 py-2.5 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-orange-500 focus:bg-white/[0.08]'
  const label = 'block text-sm font-medium text-gray-300'

  return (
    <div className="relative overflow-hidden rounded-3xl p-[1.5px] shadow-[0_40px_100px_rgba(0,0,0,0.5)]">
      <div className="dk-orbit pointer-events-none absolute -inset-[80%] bg-[conic-gradient(from_0deg,transparent_0deg,rgba(249,115,22,0.95)_70deg,transparent_140deg)]" />
      <form onSubmit={submit} className="relative rounded-[22px] bg-[#131316] p-6 sm:p-8">
      {sent ? (
        <div className="py-12 text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400"><CheckCircle2 className="h-7 w-7" /></span>
          <p className="dk-h mt-4 text-xl font-semibold text-white">Demande bien reçue.</p>
          <p className="mt-1 text-sm text-gray-400">Nous vous contacterons prochainement pour convenir d’une date.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {error ? <p className="rounded-xl bg-red-500/10 px-3.5 py-2.5 text-sm text-red-300 ring-1 ring-red-500/30 sm:col-span-2">{error}</p> : null}
          <label className={label}>Nom<input className={input} value={form.nom} onChange={(e) => setForm((p) => ({ ...p, nom: e.target.value }))} /></label>
          <label className={label}>Garage<input className={input} value={form.garage} onChange={(e) => setForm((p) => ({ ...p, garage: e.target.value }))} /></label>
          <label className={label}>Téléphone<input type="tel" className={input} value={form.telephone} onChange={(e) => setForm((p) => ({ ...p, telephone: e.target.value }))} /></label>
          <label className={label}>Nombre de ponts<input type="number" className={input} value={form.ponts} onChange={(e) => setForm((p) => ({ ...p, ponts: e.target.value }))} /></label>
          <label className={`${label} sm:col-span-2`}>
            Message <span className="font-normal text-gray-500">(optionnel)</span>
            <textarea rows={3} className={input} value={form.message} onChange={(e) => setForm((p) => ({ ...p, message: e.target.value }))} />
          </label>
          <button
            type="submit"
            disabled={saving}
            className="dk-btn rounded-xl bg-orange-500 px-5 py-3.5 text-sm font-semibold text-white shadow-[0_10px_28px_rgba(249,115,22,0.35)] transition hover:bg-orange-600 disabled:opacity-60 sm:col-span-2"
          >
            {saving ? 'Envoi en cours…' : 'Demander une démonstration'}
          </button>
        </div>
      )}
      </form>
    </div>
  )
}
