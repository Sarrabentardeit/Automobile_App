import { useEffect, useRef, useState, type FormEvent, type MouseEvent, type ReactNode, type CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  BadgeCheck,
  Banknote,
  CarFront,
  CheckCircle2,
  ClipboardList,
  Crown,
  Eye,
  FileText,
  Layers,
  LockKeyhole,
  Menu,
  MessageCircle,
  Smartphone,
  Users,
  Wallet,
  Wrench,
  X,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { apiFetch } from '@/lib/api'

const NAV = [
  { href: '#produit', label: 'Produit' },
  { href: '#modules', label: 'Modules' },
  { href: '#mobile', label: 'Mobile' },
  { href: '#roles', label: 'Équipe' },
  { href: '#faq', label: 'Questions' },
]

export const MARQUEE = [
  'Véhicules',
  'Réunion du jour',
  'Suivi atelier',
  'Clients',
  'Carte VIP',
  'Réclamations',
  'Devis',
  'Factures',
  'Caisse équipe',
  'Money',
  'Achats fournisseurs',
  'Stock',
  'Checklists',
  'Chat interne',
  'Application mobile',
]

export const STYLES = `
@keyframes em-float { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-10px) } }
@keyframes em-float-slow { 0%,100% { transform: translateY(0) } 50% { transform: translateY(8px) } }
@keyframes em-rise { from { opacity: 0; transform: translateY(24px) } to { opacity: 1; transform: translateY(0) } }
@keyframes em-blob { 0%,100% { transform: translate(0,0) scale(1) } 33% { transform: translate(40px,-30px) scale(1.12) } 66% { transform: translate(-30px,30px) scale(.94) } }
@keyframes em-shimmer { 0% { background-position: 0% 50% } 100% { background-position: 200% 50% } }
@keyframes em-marquee { from { transform: translateX(0) } to { transform: translateX(-50%) } }
@keyframes em-pop { 0% { opacity: 0; transform: translateY(14px) scale(.94) } 100% { opacity: 1; transform: translateY(0) scale(1) } }
@keyframes em-bar { from { transform: scaleX(0) } to { transform: scaleX(1) } }
@keyframes em-swap { from { opacity: 0; transform: translateY(14px) } to { opacity: 1; transform: translateY(0) } }
@keyframes em-ping { 0% { transform: scale(1); opacity: .6 } 100% { transform: scale(2.4); opacity: 0 } }
@keyframes em-flash { 0% { background-color: rgba(249,115,22,.22) } 100% { background-color: transparent } }
@keyframes em-line { from { transform: scaleX(0) } to { transform: scaleX(1) } }
.em-float { animation: em-float 6s ease-in-out infinite }
.em-float-slow { animation: em-float-slow 7s ease-in-out infinite }
.em-blob { animation: em-blob 16s ease-in-out infinite }
.em-blob-2 { animation: em-blob 20s ease-in-out infinite reverse }
.em-shimmer-dark {
  background-image: linear-gradient(90deg, #ef4444, #fb923c, #dc2626, #ef4444);
  background-size: 200% 100%;
  animation: em-shimmer 5s linear infinite;
}
.em-shimmer-text {
  background-image: linear-gradient(90deg, #f97316, #fbbf24, #ea580c, #f97316);
  background-size: 200% 100%;
  animation: em-shimmer 5s linear infinite;
}
.em-marquee { animation: em-marquee 38s linear infinite }
.em-marquee:hover { animation-play-state: paused }
.em-pop { animation: em-pop .5s cubic-bezier(.2,.8,.2,1) both }
.em-bar { transform-origin: left; animation: em-bar 1.1s cubic-bezier(.2,.8,.2,1) both }
.em-swap { animation: em-swap .55s cubic-bezier(.2,.8,.2,1) both }
.em-ping { animation: em-ping 1.8s ease-out infinite }
.em-flash { animation: em-flash 1.4s ease-out }
.em-line { transform-origin: left; animation: em-line 1.6s cubic-bezier(.2,.8,.2,1) both }
.em-reveal { opacity: 0; transform: translateY(28px); transition: opacity .8s cubic-bezier(.2,.8,.2,1), transform .8s cubic-bezier(.2,.8,.2,1) }
.em-reveal.em-left { transform: translateX(-40px) }
.em-reveal.em-right { transform: translateX(40px) }
.em-reveal.em-zoom { transform: scale(.92) }
.em-reveal.em-in { opacity: 1; transform: none }
.em-hero-in { animation: em-rise .8s ease both }
.em-hero-stagger > * { animation: em-rise .9s cubic-bezier(.2,.8,.2,1) both }
.em-hero-stagger > *:nth-child(2) { animation-delay: .12s }
.em-hero-stagger > *:nth-child(3) { animation-delay: .24s }
.em-hero-stagger > *:nth-child(4) { animation-delay: .36s }
.em-btn { position: relative; overflow: hidden }
.em-btn::after {
  content: ''; position: absolute; inset: 0; transform: translateX(-120%) skewX(-20deg);
  background: linear-gradient(90deg, transparent, rgba(255,255,255,.45), transparent);
  transition: transform .7s ease;
}
.em-btn:hover::after { transform: translateX(120%) skewX(-20deg) }
.em-card-glow { position: relative; overflow: hidden }
.em-card-glow::before {
  content: ''; position: absolute; inset: 0; opacity: 0; transition: opacity .3s ease; pointer-events: none;
  background: radial-gradient(260px circle at var(--mx, 50%) var(--my, 50%), rgba(249,115,22,.16), transparent 60%);
}
.em-card-glow:hover::before { opacity: 1 }
.em-grid-bg {
  background-image: radial-gradient(rgba(15,23,42,.07) 1px, transparent 1px);
  background-size: 22px 22px;
}
@media (prefers-reduced-motion: reduce) {
  .em-float, .em-float-slow, .em-hero-in, .em-blob, .em-blob-2, .em-shimmer-text, .em-marquee,
  .em-pop, .em-bar, .em-swap, .em-ping, .em-flash, .em-line, .em-hero-stagger > * { animation: none }
  .em-reveal, .em-reveal.em-left, .em-reveal.em-right, .em-reveal.em-zoom { opacity: 1; transform: none; transition: none }
}
`

export function useInView<T extends HTMLElement>(threshold = 0.25) {
  const ref = useRef<T>(null)
  const [seen, setSeen] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (typeof IntersectionObserver === 'undefined') {
      setSeen(true)
      return
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setSeen(true)
          io.disconnect()
        }
      },
      { threshold }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [threshold])
  return { ref, seen }
}

const WORDS = ['vos voitures', 'votre équipe', 'vos pièces', 'vos clients', 'votre caisse']

function RotatingWord() {
  const [i, setI] = useState(0)
  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    const t = window.setInterval(() => setI((v) => (v + 1) % WORDS.length), 2400)
    return () => window.clearInterval(t)
  }, [])
  return (
    <span key={i} className="em-swap relative inline-block text-orange-600">
      {WORDS[i]}
      <span className="em-bar absolute inset-x-0 -bottom-0.5 h-[3px] rounded-full bg-orange-300/80" />
    </span>
  )
}

export function CountUp({ to, suffix = '', duration = 1400 }: { to: number; suffix?: string; duration?: number }) {
  const { ref, seen } = useInView<HTMLSpanElement>()
  const [n, setN] = useState(0)
  useEffect(() => {
    if (!seen) return
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      setN(to)
      return
    }
    let raf = 0
    const start = performance.now()
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration)
      setN(Math.round(to * (1 - Math.pow(1 - p, 3))))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [seen, to, duration])
  return <span ref={ref}>{n}{suffix}</span>
}

export function ScrollProgress() {
  const [p, setP] = useState(0)
  useEffect(() => {
    const on = () => {
      const h = document.documentElement.scrollHeight - window.innerHeight
      setP(h > 0 ? Math.min(1, window.scrollY / h) : 0)
    }
    on()
    window.addEventListener('scroll', on, { passive: true })
    return () => window.removeEventListener('scroll', on)
  }, [])
  return (
    <div className="fixed inset-x-0 top-0 z-50 h-[3px]">
      <div className="h-full origin-left bg-gradient-to-r from-orange-500 to-amber-400" style={{ transform: `scaleX(${p})` }} />
    </div>
  )
}

export function glowMove(e: MouseEvent<HTMLElement>) {
  const r = e.currentTarget.getBoundingClientRect()
  e.currentTarget.style.setProperty('--mx', `${e.clientX - r.left}px`)
  e.currentTarget.style.setProperty('--my', `${e.clientY - r.top}px`)
}

export function Reveal({
  children,
  className = '',
  delay = 0,
  from = 'up',
}: {
  children: ReactNode
  className?: string
  delay?: number
  from?: 'up' | 'left' | 'right' | 'zoom'
}) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (typeof IntersectionObserver === 'undefined') {
      el.classList.add('em-in')
      return
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('em-in')
            io.unobserve(e.target)
          }
        })
      },
      { threshold: 0.12 }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return (
    <div
      ref={ref}
      className={`em-reveal ${from === 'left' ? 'em-left' : from === 'right' ? 'em-right' : from === 'zoom' ? 'em-zoom' : ''} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  )
}

function SectionTitle({ kicker, title, text, center = false }: { kicker: string; title: string; text?: string; center?: boolean }) {
  return (
    <div className={center ? 'mx-auto max-w-2xl text-center' : 'max-w-2xl'}>
      <p className="inline-flex items-center gap-2 rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-700 ring-1 ring-orange-100">
        {kicker}
      </p>
      <h2 className="mt-4 text-3xl font-semibold tracking-tight text-gray-950 sm:text-4xl sm:leading-[1.1]">{title}</h2>
      {text ? <p className="mt-4 text-base leading-relaxed text-gray-600">{text}</p> : null}
    </div>
  )
}

/** Petit sélecteur pour comparer les deux designs de la page de présentation. */
export function DesignSwitcher({ current, dark = false, accent = 'bg-blue-600' }: { current: 1 | 2; dark?: boolean; accent?: string }) {
  const base = 'rounded-full px-3.5 py-1.5 text-xs font-semibold transition'
  return (
    <div
      className={`fixed bottom-4 left-4 z-50 flex items-center gap-1 rounded-full p-1 shadow-[0_10px_30px_rgba(0,0,0,0.25)] ring-1 backdrop-blur ${
        dark ? 'bg-white/10 ring-white/15' : 'bg-white/90 ring-black/10'
      }`}
    >
      <Link
        to="/vitrine-1"
        className={`${base} ${current === 1 ? 'bg-orange-500 text-white' : dark ? 'text-white/70 hover:text-white' : 'text-gray-600 hover:text-gray-950'}`}
      >
        Design 1
      </Link>
      <Link
        to="/vitrine-2"
        className={`${base} ${current === 2 ? `${accent} text-white` : dark ? 'text-white/70 hover:text-white' : 'text-gray-600 hover:text-gray-950'}`}
      >
        Design 2
      </Link>
    </div>
  )
}

export default function PresentationPage() {
  const { isAuthenticated } = useAuth()
  const [menu, setMenu] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    document.title = 'ATELIO · Gestion d’atelier'
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const appHref = isAuthenticated ? '/dashboard' : '/login'
  const appLabel = isAuthenticated ? 'Ouvrir l’application' : 'Connexion'

  return (
    <div className="min-h-screen scroll-smooth bg-[#fbfaf8] text-gray-950 antialiased">
      <style>{STYLES}</style>
      <ScrollProgress />
      <DesignSwitcher current={1} />

      <header
        className={`sticky top-0 z-30 transition-all ${
          scrolled ? 'border-b border-black/[0.06] bg-white/85 shadow-sm backdrop-blur-xl' : 'bg-transparent'
        }`}
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-5">
          <a href="#haut" className="flex items-center">
            <AtelioLogo size={38} word={0.5} />
          </a>
          <nav className="hidden items-center gap-1 md:flex">
            {NAV.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="rounded-full px-3.5 py-2 text-sm font-medium text-gray-600 transition hover:bg-black/[0.04] hover:text-gray-950"
              >
                {item.label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <Link
              to={appHref}
              className="hidden rounded-full px-4 py-2 text-sm font-semibold text-gray-800 hover:bg-black/[0.04] sm:inline-flex"
            >
              {appLabel}
            </Link>
            <a
              href="#demo"
              className="em-btn rounded-full bg-orange-500 px-4 py-2 text-sm font-semibold text-white shadow-[0_6px_16px_rgba(249,115,22,0.35)] transition hover:bg-orange-600"
            >
              Demander une démo
            </a>
            <button
              type="button"
              onClick={() => setMenu((v) => !v)}
              className="rounded-full p-2 text-gray-700 hover:bg-black/[0.05] md:hidden"
              aria-label="Menu"
            >
              {menu ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
        {menu ? (
          <div className="border-t border-black/[0.06] bg-white px-5 py-3 md:hidden">
            {NAV.map((item) => (
              <a key={item.href} href={item.href} onClick={() => setMenu(false)} className="block rounded-xl px-3 py-3 text-sm font-medium text-gray-800">
                {item.label}
              </a>
            ))}
            <Link to={appHref} className="block rounded-xl px-3 py-3 text-sm font-semibold text-orange-600">
              {appLabel}
            </Link>
          </div>
        ) : null}
      </header>

      <main id="haut">
        {/* HERO */}
        <section className="relative overflow-hidden">
          <div className="em-grid-bg pointer-events-none absolute inset-0 [mask-image:linear-gradient(to_bottom,black,transparent_80%)]" />
          <div className="em-blob pointer-events-none absolute -left-32 -top-32 h-[420px] w-[420px] rounded-full bg-orange-200/60 blur-3xl" />
          <div className="em-blob-2 pointer-events-none absolute -right-24 top-20 h-[380px] w-[380px] rounded-full bg-amber-200/60 blur-3xl" />
          <div className="em-blob pointer-events-none absolute left-1/3 top-[55%] h-[300px] w-[300px] rounded-full bg-orange-100/70 blur-3xl" />

          <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-5 pb-20 pt-12 sm:pt-16 lg:grid-cols-[0.95fr_1.25fr] lg:gap-8 lg:pb-28 lg:pt-20">
            <div className="em-hero-stagger text-center lg:text-left">
              <h1 className="text-[2.6rem] font-semibold leading-[1.02] tracking-[-0.03em] text-gray-950 sm:text-6xl xl:text-7xl">
                Tout votre garage,
                <span className="em-shimmer-text block bg-clip-text pb-1 text-transparent">
                  de la voiture à la caisse.
                </span>
              </h1>
              <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-gray-600 lg:mx-0">
                <span className="font-semibold text-gray-900">Suivez <RotatingWord /></span>
                {' '}en direct, au bureau comme à distance. Un seul outil pour l’atelier, les clients et l’argent.
              </p>
              <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row lg:items-start">
                <a
                  href="#demo"
                  className="em-btn group inline-flex items-center gap-2 rounded-full bg-orange-500 px-7 py-4 text-sm font-semibold text-white shadow-[0_12px_28px_rgba(249,115,22,0.4)] transition hover:-translate-y-0.5 hover:bg-orange-600 hover:shadow-[0_18px_36px_rgba(249,115,22,0.5)]"
                >
                  Demander une démo
                  <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                </a>
                <Link
                  to={appHref}
                  className="inline-flex items-center gap-2 rounded-full bg-white px-7 py-4 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-black/10 transition hover:-translate-y-0.5 hover:bg-gray-50 hover:shadow-md"
                >
                  <Eye className="h-4 w-4" />
                  Voir l’application
                </Link>
              </div>
              <ul className="mt-9 grid max-w-md grid-cols-1 gap-2.5 text-left sm:grid-cols-2 lg:max-w-lg">
                {[
                  [CarFront, 'Voitures et états en direct'],
                  [Eye, 'Suivi atelier à distance'],
                  [Wallet, 'Devis, factures et caisse'],
                  [Smartphone, 'Application mobile'],
                ].map(([Icon, label]) => {
                  const I = Icon as typeof CarFront
                  return (
                    <li key={String(label)} className="mx-auto flex w-full items-center gap-2.5 text-sm font-medium text-gray-700 lg:mx-0">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-orange-50 text-orange-600 ring-1 ring-orange-100">
                        <I className="h-3.5 w-3.5" />
                      </span>
                      {String(label)}
                    </li>
                  )
                })}
              </ul>
            </div>

            <HeroShowcase />
          </div>
        </section>

        {/* BANDE */}
        <section className="border-y border-black/[0.06] bg-white">
          <div className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-5 py-8 md:grid-cols-4">
            {[
              [Layers, <><CountUp to={12} suffix="+" /></>, 'modules reliés'],
              [Smartphone, 'Web + Mobile', 'Android et navigateur'],
              [LockKeyhole, <><CountUp to={4} /> rôles</>, 'chacun voit ce qu’il faut'],
              [BadgeCheck, '100 % français', 'interface complète'],
            ].map(([Icon, big, small], i) => {
              const I = Icon as typeof Layers
              return (
                <Reveal key={String(small)} delay={i * 90}>
                  <div className="flex items-center gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-600 ring-1 ring-orange-100">
                      <I className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="text-base font-semibold leading-tight">{big as ReactNode}</p>
                      <p className="text-xs text-gray-500">{String(small)}</p>
                    </div>
                  </div>
                </Reveal>
              )
            })}
          </div>
        </section>

        {/* DÉFILEMENT */}
        <section className="overflow-hidden border-b border-black/[0.06] bg-[#fbfaf8] py-5" aria-hidden="true">
          <div className="em-marquee flex w-max gap-3">
            {[...MARQUEE, ...MARQUEE].map((label, i) => (
              <span
                key={`${label}-${i}`}
                className="whitespace-nowrap rounded-full bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm ring-1 ring-black/[0.06]"
              >
                {label}
              </span>
            ))}
          </div>
        </section>

        {/* PROBLÈME → SOLUTION */}
        <section id="produit" className="mx-auto max-w-7xl px-5 py-20 sm:py-28">
          <Reveal>
            <SectionTitle
              center
              kicker="Pourquoi ATELIO"
              title="Ce qui se perd aujourd’hui, devient visible."
              text="Dans beaucoup de garages, l’information circule entre un cahier, un tableur et des messages. Ici, elle suit la voiture."
            />
          </Reveal>
          <div className="mt-14 grid gap-6 lg:grid-cols-2">
            <Reveal from="left">
              <div className="h-full rounded-3xl bg-gray-100/80 p-8 ring-1 ring-black/[0.05]">
                <p className="text-sm font-semibold text-gray-500">Avant</p>
                <ul className="mt-5 space-y-4">
                  {[
                    'Les états des voitures se disent à l’oral ou dans un groupe de messages.',
                    'Les pièces attendues ne sont suivies que par la mémoire de quelqu’un.',
                    'Le responsable ne sait pas ce qui est encore au garage.',
                    'La caisse et les factures vivent dans des fichiers séparés.',
                  ].map((t) => (
                    <li key={t} className="flex gap-3 text-sm leading-relaxed text-gray-600">
                      <X className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
            <Reveal delay={120} from="right">
              <div className="h-full rounded-3xl bg-white p-8 shadow-[0_18px_44px_rgba(249,115,22,0.10)] ring-1 ring-orange-200">
                <p className="text-sm font-semibold text-orange-600">Avec ATELIO</p>
                <ul className="mt-5 space-y-4">
                  {[
                    'Chaque voiture a un état, une équipe, un problème et un historique.',
                    'Les voitures en attente de pièces ressortent avec leurs jours au garage.',
                    'Le suivi atelier montre le garage, les validées et les mouvements du jour.',
                    'Devis, factures, caisse et Money suivent la même activité.',
                  ].map((t) => (
                    <li key={t} className="flex gap-3 text-sm leading-relaxed text-gray-800">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-orange-500" />
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          </div>
        </section>

        {/* JOURNÉE */}
        <section className="border-y border-black/[0.06] bg-white">
          <div className="mx-auto max-w-7xl px-5 py-20 sm:py-28">
            <Reveal>
              <SectionTitle center kicker="Une journée type" title="De l’entrée à l’encaissement." />
            </Reveal>
            <Journey />
          </div>
        </section>

        {/* MODULES (onglets) */}
        <section id="modules" className="mx-auto max-w-7xl px-5 py-20 sm:py-28">
          <Reveal>
            <SectionTitle
              center
              kicker="Modules"
              title="Quatre espaces, un seul outil."
              text="Choisissez un espace pour voir comment il se présente. Ce sont des aperçus du produit."
            />
          </Reveal>
          <ModulesTabs />
        </section>

        {/* BENTO */}
        <section className="border-y border-black/[0.06] bg-white">
          <div className="mx-auto max-w-7xl px-5 py-20 sm:py-28">
            <Reveal>
              <SectionTitle center kicker="Dans le détail" title="Ce que le responsable et l’équipe utilisent chaque jour." />
            </Reveal>
            <BentoGrid />
          </div>
        </section>

        {/* MOBILE */}
        <section id="mobile" className="mx-auto max-w-7xl px-5 py-20 sm:py-28">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <Reveal from="left">
              <SectionTitle
                kicker="Application mobile"
                title="L’atelier dans la poche du responsable."
                text="Le téléphone reprend le travail du garage : véhicules, réunion, suivi atelier, clients et argent. Le technicien met à jour, le responsable regarde, où qu’il soit."
              />
              <ul className="mt-8 space-y-3">
                {[
                  'Suivi atelier avec garage, validées et mouvements',
                  'Notifications pour les rappels et les messages',
                  'Mêmes comptes et mêmes accès que sur le web',
                ].map((t) => (
                  <li key={t} className="flex items-center gap-3 text-sm font-medium text-gray-800">
                    <CheckCircle2 className="h-4 w-4 text-orange-500" />
                    {t}
                  </li>
                ))}
              </ul>
            </Reveal>
            <Reveal delay={120} from="right" className="flex justify-center">
              <div className="em-float relative">
                <div className="em-blob pointer-events-none absolute -inset-10 rounded-full bg-orange-200/50 blur-3xl" />
                <PhoneMock />
              </div>
            </Reveal>
          </div>
        </section>

        {/* RÔLES */}
        <section id="roles" className="border-y border-black/[0.06] bg-white">
          <div className="mx-auto max-w-7xl px-5 py-20 sm:py-28">
            <Reveal>
              <SectionTitle
                center
                kicker="Équipe et accès"
                title="Chacun voit ce qui le concerne."
                text="Les accès se règlent compte par compte : un technicien n’a pas besoin de voir la caisse."
              />
            </Reveal>
            <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                [Crown, 'Administrateur', 'Tout voir, tout régler, gérer les comptes.'],
                [Eye, 'Responsable', 'Suivre l’atelier, la réunion et les clients, à distance.'],
                [Wrench, 'Technicien', 'Ses véhicules, ses états, ses checklists.'],
                [Wallet, 'Financier', 'Factures, caisse, Money et achats.'],
              ].map(([Icon, title, text], i) => {
                const I = Icon as typeof Crown
                return (
                  <Reveal key={String(title)} delay={i * 110} from="zoom">
                    <div className="h-full rounded-3xl bg-[#fbfaf8] p-6 ring-1 ring-black/[0.06] transition duration-300 hover:-translate-y-1.5 hover:bg-white hover:shadow-[0_18px_40px_rgba(15,23,42,0.1)]">
                      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-500 text-white">
                        <I className="h-4 w-4" />
                      </span>
                      <p className="mt-4 text-base font-semibold">{String(title)}</p>
                      <p className="mt-1.5 text-sm leading-relaxed text-gray-600">{String(text)}</p>
                    </div>
                  </Reveal>
                )
              })}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="mx-auto max-w-3xl px-5 py-20 sm:py-28">
          <Reveal>
            <SectionTitle center kicker="Questions" title="Ce qu’on nous demande souvent." />
          </Reveal>
          <Reveal delay={80}>
            <Faq />
          </Reveal>
        </section>

        <DemoForm />
      </main>

      <footer className="border-t border-black/[0.06] bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-10 text-sm text-gray-500 sm:flex-row sm:items-center sm:justify-between">
          <AtelioLogo size={38} />
          <div className="flex items-center gap-5">
            <a href="#demo" className="hover:text-gray-900">Demander une démo</a>
            <Link to={appHref} className="font-semibold text-gray-900">{appLabel}</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}

/* ---------- Aperçus produit ---------- */

export const ROWS: Array<{ car: string; etat: string; tone: string; jours: string; equipe: string }> = [
  { car: 'Volkswagen Touareg', etat: 'En cours', tone: 'bg-orange-100 text-orange-700', jours: '18 j', equipe: 'Meher B.' },
  { car: 'Toyota C-HR', etat: 'Att. pièces', tone: 'bg-purple-100 text-purple-700', jours: '41 j', equipe: 'Amine K.' },
  { car: 'Audi Q5', etat: 'Test', tone: 'bg-sky-100 text-sky-700', jours: '6 j', equipe: 'Yassine T.' },
  { car: 'Opel Astra', etat: 'À résoudre', tone: 'bg-red-100 text-red-700', jours: '9 j', equipe: 'Meher B.' },
]

/** Logo ATELIO : carré orange #F47216, « A » blanc. */
export function AtelioMark({ className = '', style }: { className?: string; style?: CSSProperties }) {
  return (
    <svg viewBox="0 0 72 72" className={`shrink-0 ${className}`} style={style} role="img" aria-label="ATELIO">
      <rect width="72" height="72" rx="16" fill="#F47216" />
      <path d="M20 52 36 18l16 34M27.5 42h17" fill="none" stroke="#ffffff" strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/** Logo complet : symbole + ATELIO + « Powered by Mecano ». */
export function AtelioLogo({ dark = false, size = 40, word = 0.8, className = '' }: { dark?: boolean; size?: number; word?: number; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-3 ${className}`}>
      <AtelioMark style={{ width: size, height: size }} />
      <span className="flex flex-col items-start text-left leading-none">
        <span className={`font-bold tracking-[0.18em] ${dark ? 'text-white' : 'text-[#1C120C]'}`} style={{ fontSize: size * word, marginLeft: -1 }}>
          ATELIO
        </span>
        <span className={`mt-1.5 font-medium uppercase tracking-[0.28em] ${dark ? 'text-[#F47216]' : 'text-[#8A7F77]'}`} style={{ fontSize: Math.max(8, size * 0.22) }}>
          Powered by Mecano
        </span>
      </span>
    </span>
  )
}

export function Browser({ children, url = 'atelio.app' }: { children: ReactNode; url?: string }) {
  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-[0_30px_80px_rgba(15,23,42,0.16)] ring-1 ring-black/[0.08]">
      <div className="flex items-center gap-2 border-b border-gray-100 bg-gray-50 px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-red-300" />
        <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
        <span className="h-2.5 w-2.5 rounded-full bg-emerald-300" />
        <span className="mx-auto rounded-md bg-white px-10 py-1 text-[11px] text-gray-400 ring-1 ring-gray-200">{url}</span>
        <span className="w-10" />
      </div>
      {children}
    </div>
  )
}

export function Kpi({ label, value, tone = 'text-gray-950', pulseKey }: { label: string; value: string; tone?: string; pulseKey?: number }) {
  return (
    <div className="rounded-xl bg-white p-3 ring-1 ring-black/[0.06]">
      <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400">{label}</p>
      <p key={pulseKey ?? 'static'} className={`${pulseKey != null ? 'em-pop' : ''} mt-1 text-xl font-semibold ${tone}`}>{value}</p>
    </div>
  )
}

const ETATS_MOCK = [
  { etat: 'En cours', tone: 'bg-orange-100 text-orange-700' },
  { etat: 'Att. pièces', tone: 'bg-purple-100 text-purple-700' },
  { etat: 'Test', tone: 'bg-sky-100 text-sky-700' },
  { etat: 'À résoudre', tone: 'bg-red-100 text-red-700' },
]

/** Aperçu vivant : un véhicule change d'état toutes les 2,6 s. */
export function SuiviMock() {
  const [state, setState] = useState<{
    idx: number[]
    tick: number
    lastRow: number | null
    events: Array<{ id: number; car: string; etat: string }>
  }>({ idx: [0, 1, 2, 3], tick: 0, lastRow: null, events: [{ id: 0, car: 'Audi Q5', etat: 'Test' }] })
  const { idx, tick, lastRow, events } = state

  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    const timer = window.setInterval(() => {
      setState((s) => {
        const row = s.tick % ROWS.length
        const nextIdx = [...s.idx]
        nextIdx[row] = (nextIdx[row] + 1) % ETATS_MOCK.length
        return {
          idx: nextIdx,
          tick: s.tick + 1,
          lastRow: row,
          events: [{ id: s.tick + 1, car: ROWS[row].car, etat: ETATS_MOCK[nextIdx[row]].etat }, ...s.events].slice(0, 3),
        }
      })
    }, 2600)
    return () => window.clearInterval(timer)
  }, [])

  const parts = idx.filter((i) => i === 1).length + 3
  const resolve = idx.filter((i) => i === 3).length + 1

  return (
    <div className="grid gap-3 bg-[#f6f5f2] p-4 sm:grid-cols-[1fr_190px]">
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Kpi label="Au garage" value="25" />
          <Kpi label="Att. pièces" value={String(parts)} tone="text-purple-600" pulseKey={parts} />
          <Kpi label="À résoudre" value={String(resolve)} tone="text-red-600" pulseKey={resolve} />
          <Kpi label="Validées" value="3" tone="text-emerald-600" />
        </div>
        <div className="overflow-hidden rounded-xl bg-white ring-1 ring-black/[0.06]">
          <div className="grid grid-cols-[1.4fr_1fr_.5fr] border-b border-gray-100 px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
            <span>Véhicule</span>
            <span>État</span>
            <span className="text-right">Jours</span>
          </div>
          {ROWS.map((r, i) => {
            const e = ETATS_MOCK[idx[i]]
            const flash = lastRow === i
            return (
              <div
                key={`${r.car}-${flash ? tick : 'x'}`}
                className={`grid grid-cols-[1.4fr_1fr_.5fr] items-center border-b border-gray-50 px-3 py-2.5 last:border-0 ${flash ? 'em-flash' : ''}`}
              >
                <div>
                  <p className="text-xs font-semibold text-gray-900">{r.car}</p>
                  <p className="text-[10px] text-gray-400">{r.equipe}</p>
                </div>
                <span key={e.etat} className={`em-pop w-fit rounded-md px-2 py-0.5 text-[10px] font-semibold ${e.tone}`}>{e.etat}</span>
                <span className="text-right text-xs font-semibold text-gray-700">{r.jours}</span>
              </div>
            )
          })}
        </div>
      </div>
      <div className="hidden space-y-3 sm:block">
        <div className="rounded-xl bg-white p-3 ring-1 ring-black/[0.06]">
          <p className="text-xs font-bold text-emerald-700">Validées aujourd’hui</p>
          <div className="mt-1 h-1 w-8 rounded-full bg-emerald-600" />
          <p className="mt-3 text-xs font-semibold text-gray-900">Kia Sportage</p>
          <p className="text-[10px] text-gray-400">Sortie 11:20</p>
        </div>
        <div className="rounded-xl bg-white p-3 ring-1 ring-black/[0.06]">
          <p className="text-xs font-bold text-orange-600">Mouvements</p>
          <div className="mt-1 h-1 w-8 rounded-full bg-orange-500" />
          <div className="mt-3 space-y-1.5">
            {events.map((ev) => (
              <p key={ev.id} className="em-pop text-[11px] text-gray-700">
                {ev.car} passe en <b>{ev.etat}</b>
              </p>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ---------- Grille « Dans le détail » ---------- */

function BentoTile({
  icon: I,
  title,
  text,
  span,
  delay,
  children,
}: {
  icon: typeof Eye
  title: string
  text: string
  span: string
  delay: number
  children: ReactNode
}) {
  return (
    <Reveal delay={delay} from="zoom" className={span}>
      <div
        onMouseMove={glowMove}
        className="em-card-glow group flex h-full flex-col rounded-[28px] bg-[#fbfaf8] p-6 ring-1 ring-black/[0.06] transition duration-300 hover:-translate-y-1.5 hover:bg-white hover:shadow-[0_22px_48px_rgba(15,23,42,0.1)] sm:p-7"
      >
        <div className="flex items-start gap-4">
          <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-orange-600 shadow-sm ring-1 ring-black/[0.06] transition duration-300 group-hover:-rotate-6 group-hover:scale-110 group-hover:bg-orange-500 group-hover:text-white">
            <I className="h-5 w-5" />
          </span>
          <div>
            <p className="text-lg font-semibold tracking-tight">{title}</p>
            <p className="mt-1 text-sm leading-relaxed text-gray-600">{text}</p>
          </div>
        </div>
        <div className="relative mt-6 flex-1">{children}</div>
      </div>
    </Reveal>
  )
}

export function MiniReunion() {
  const rows = [
    ['Touareg', 'Meher B.', 'Freins à contrôler', 'En cours', 'bg-orange-100 text-orange-700'],
    ['C-HR', 'Amine K.', 'Pièce commandée', 'Att. pièces', 'bg-purple-100 text-purple-700'],
    ['Q5', 'Yassine T.', 'Essai sur route', 'Test', 'bg-sky-100 text-sky-700'],
  ]
  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-1.5">
        {['Tous', 'En cours', 'Att. pièces', 'Test'].map((f, i) => (
          <span key={f} className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${i === 0 ? 'bg-orange-500 text-white' : 'bg-white text-gray-600 ring-1 ring-black/[0.08]'}`}>{f}</span>
        ))}
      </div>
      <div className="overflow-hidden rounded-2xl bg-white ring-1 ring-black/[0.06]">
        {rows.map(([car, who, note, etat, tone], i) => (
          <div key={car} style={{ animationDelay: `${i * 140}ms` }} className="em-pop grid grid-cols-[1fr_auto] items-center gap-3 border-b border-gray-50 px-4 py-3 last:border-0 sm:grid-cols-[.8fr_1fr_1.4fr_auto]">
            <p className="text-sm font-semibold">{car}</p>
            <p className="hidden text-xs text-gray-500 sm:block">{who}</p>
            <p className="hidden text-xs text-gray-500 sm:block">{note}</p>
            <span className={`w-fit rounded-md px-2 py-0.5 text-[10px] font-semibold ${tone}`}>{etat}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function MiniSuivi() {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        <Kpi label="Garage" value="25" />
        <Kpi label="Pièces" value="4" tone="text-purple-600" />
        <Kpi label="Validées" value="3" tone="text-emerald-600" />
      </div>
      <div className="rounded-2xl bg-white p-3.5 ring-1 ring-black/[0.06]">
        <p className="text-xs font-bold text-emerald-700">Validées aujourd’hui</p>
        <div className="mt-1 h-1 w-8 rounded-full bg-emerald-600" />
        <p className="mt-2.5 text-xs font-semibold">Kia Sportage <span className="font-normal text-gray-400">· sortie 11:20</span></p>
      </div>
    </div>
  )
}

export function MiniVip() {
  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/[0.06]">
      <div className="relative px-4 pb-4 pt-3">
        <div className="pointer-events-none absolute -right-5 -top-7 h-20 w-20 rounded-full bg-orange-100" />
        <div className="relative flex items-center justify-between">
          <p className="text-[10px] font-bold tracking-[0.2em] text-orange-600">ATELIO</p>
          <span className="rounded bg-orange-500 px-1.5 py-0.5 text-[10px] font-bold text-white">ADVANCED</span>
        </div>
        <p className="relative mt-4 text-base font-semibold">Ahmed Benali</p>
        <p className="relative mt-1.5 inline-flex rounded-md bg-gray-50 px-2 py-0.5 font-mono text-[11px] tracking-widest text-gray-600 ring-1 ring-gray-200">VIP-0001</p>
      </div>
      <div className="grid grid-cols-2 border-t border-gray-100 bg-gray-50 text-[11px]">
        <p className="px-4 py-2 text-gray-500">Du <b className="text-gray-900">14/10/26</b></p>
        <p className="border-l border-gray-200 px-4 py-2 text-gray-500">Au <b className="text-gray-900">14/10/27</b></p>
      </div>
    </div>
  )
}

export function MiniMoney() {
  return (
    <div className="space-y-3 rounded-2xl bg-white p-4 ring-1 ring-black/[0.06]">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400">Entrées</p>
          <p className="text-lg font-semibold text-emerald-600">12 480 DT</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400">Sorties</p>
          <p className="text-lg font-semibold text-red-600">3 250 DT</p>
        </div>
      </div>
      {[['Réparation', 78], ['Pièces', 52], ['Diagnostic', 24]].map(([l, w]) => (
        <div key={String(l)}>
          <div className="flex justify-between text-[11px] font-medium text-gray-600"><span>{l}</span><span>{w}%</span></div>
          <div className="mt-1 h-1.5 rounded-full bg-gray-100">
            <div className="em-bar h-1.5 rounded-full bg-gradient-to-r from-orange-500 to-amber-400" style={{ width: `${w}%` }} />
          </div>
        </div>
      ))}
    </div>
  )
}

export function MiniFacture() {
  return (
    <div className="rounded-2xl bg-white p-4 ring-1 ring-black/[0.06]">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold">Facture F-0042</p>
        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">Payée</span>
      </div>
      <div className="mt-3 space-y-1.5 text-[11px] text-gray-600">
        <div className="flex justify-between"><span>Main d’œuvre</span><b className="text-gray-900">180 DT</b></div>
        <div className="flex justify-between"><span>Plaquettes de frein</span><b className="text-gray-900">120 DT</b></div>
        <div className="flex justify-between border-t border-dashed border-gray-200 pt-1.5"><span>Total</span><b className="text-gray-950">300 DT</b></div>
      </div>
    </div>
  )
}

export function MiniChat() {
  const msgs: Array<[string, string, boolean]> = [
    ['Meher', 'Le Touareg est prêt pour le test.', false],
    ['Rabii', 'Parfait, je préviens le client.', true],
    ['Amine', 'La pièce du C-HR arrive demain.', false],
  ]
  return (
    <div className="space-y-2 rounded-2xl bg-white p-4 ring-1 ring-black/[0.06]">
      {msgs.map(([who, t, mine], i) => (
        <div key={t} style={{ animationDelay: `${i * 220}ms` }} className={`em-pop flex ${mine ? 'justify-end' : ''}`}>
          <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-[11px] leading-snug ${mine ? 'rounded-br-md bg-orange-500 text-white' : 'rounded-bl-md bg-gray-100 text-gray-800'}`}>
            {!mine ? <p className="mb-0.5 text-[10px] font-bold text-orange-600">{who}</p> : null}
            {t}
          </div>
        </div>
      ))}
    </div>
  )
}

export function MiniAcces() {
  const [on, setOn] = useState([true, true, false, true])
  const rows = ['Voir la réunion', 'Voir le suivi atelier', 'Voir la caisse', 'Gérer les clients']
  return (
    <div className="rounded-2xl bg-white p-2 ring-1 ring-black/[0.06]">
      {rows.map((label, i) => (
        <button
          key={label}
          type="button"
          onClick={() => setOn((v) => v.map((x, n) => (n === i ? !x : x)))}
          className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-gray-50"
        >
          <span className="text-xs font-medium text-gray-800">{label}</span>
          <span className={`relative h-5 w-9 shrink-0 rounded-full transition ${on[i] ? 'bg-orange-500' : 'bg-gray-200'}`}>
            <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${on[i] ? 'left-[18px]' : 'left-0.5'}`} />
          </span>
        </button>
      ))}
    </div>
  )
}

function BentoGrid() {
  return (
    <div className="mt-14 grid gap-4 md:grid-cols-2 lg:grid-cols-12">
      <BentoTile icon={ClipboardList} title="Réunion du jour" text="Les voitures encore au garage, une note par voiture, un filtre par état." span="lg:col-span-7" delay={0}>
        <MiniReunion />
      </BentoTile>
      <BentoTile icon={Eye} title="Suivi atelier" text="Garage, validées et mouvements, à distance." span="lg:col-span-5" delay={80}>
        <MiniSuivi />
      </BentoTile>
      <BentoTile icon={Crown} title="Carte VIP client" text="Standard ou Advanced, avec numéro et validité." span="lg:col-span-4" delay={0}>
        <MiniVip />
      </BentoTile>
      <BentoTile icon={Wallet} title="Caisse et Money" text="Entrées par type, sorties par catégorie." span="lg:col-span-4" delay={80}>
        <MiniMoney />
      </BentoTile>
      <BentoTile icon={FileText} title="Devis et factures" text="Du devis à la facture, avec paiements partiels." span="md:col-span-2 lg:col-span-4" delay={160}>
        <MiniFacture />
      </BentoTile>
      <BentoTile icon={MessageCircle} title="Chat interne" text="L’équipe se parle dans l’application." span="lg:col-span-5" delay={0}>
        <MiniChat />
      </BentoTile>
      <BentoTile icon={LockKeyhole} title="Accès par compte" text="Chaque compte voit seulement ce qui le concerne. Essayez les interrupteurs." span="lg:col-span-7" delay={80}>
        <MiniAcces />
      </BentoTile>
    </div>
  )
}

const JOURNEY = [
  { icon: CarFront, title: 'La voiture entre', text: 'On crée la fiche, l’état, l’équipe et le problème.' },
  { icon: Wrench, title: 'L’atelier avance', text: 'Pièces, test, notes de la réunion du jour.' },
  { icon: BadgeCheck, title: 'Elle est validée', text: 'Elle quitte la liste du garage et reste aux archives.' },
  { icon: Banknote, title: 'L’argent suit', text: 'Devis, facture, paiement et caisse.' },
]

export function Journey() {
  const { ref, seen } = useInView<HTMLDivElement>(0.3)
  const [active, setActive] = useState(0)
  useEffect(() => {
    if (!seen) return
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    const t = window.setInterval(() => setActive((a) => (a + 1) % JOURNEY.length), 2200)
    return () => window.clearInterval(t)
  }, [seen])

  return (
    <div ref={ref} className="relative mt-14 grid gap-6 md:grid-cols-4">
      <div className="pointer-events-none absolute left-[12.5%] right-[12.5%] top-6 hidden h-0.5 rounded-full bg-orange-100 md:block">
        {seen ? <div className="em-line h-full rounded-full bg-gradient-to-r from-orange-400 to-amber-400" /> : null}
      </div>
      {JOURNEY.map((step, i) => {
        const I = step.icon
        const on = i === active
        return (
          <Reveal key={step.title} delay={i * 140}>
            <div className="relative text-center">
              <span
                className={`relative mx-auto flex h-12 w-12 items-center justify-center rounded-2xl transition duration-500 ${
                  on
                    ? 'scale-110 bg-orange-500 text-white shadow-[0_10px_26px_rgba(249,115,22,0.45)]'
                    : 'bg-orange-50 text-orange-600 ring-1 ring-orange-100'
                }`}
              >
                {on ? <span className="em-ping absolute inset-0 rounded-2xl bg-orange-400/60" /> : null}
                <I className="relative h-5 w-5" />
              </span>
              <p className={`mt-4 text-base font-semibold transition ${on ? 'text-gray-950' : 'text-gray-700'}`}>{step.title}</p>
              <p className="mx-auto mt-1.5 max-w-[220px] text-sm leading-relaxed text-gray-600">{step.text}</p>
            </div>
          </Reveal>
        )
      })}
    </div>
  )
}

export const FEED_LEFT = [
  { icon: Wrench, tone: 'bg-purple-100 text-purple-600', title: 'Toyota C-HR', text: 'Attente de pièces · 41 jours' },
  { icon: ClipboardList, tone: 'bg-orange-100 text-orange-600', title: 'Réunion du jour', text: '25 voitures au garage' },
  { icon: CarFront, tone: 'bg-sky-100 text-sky-600', title: 'Nouvelle entrée', text: 'Kia Picanto · fiche créée' },
]
export const FEED_RIGHT = [
  { icon: BadgeCheck, tone: 'bg-emerald-100 text-emerald-600', title: 'Voiture validée', text: 'Sortie du garage · archivée' },
  { icon: Banknote, tone: 'bg-amber-100 text-amber-600', title: 'Paiement reçu', text: 'Facture réglée en caisse' },
  { icon: Crown, tone: 'bg-orange-100 text-orange-600', title: 'Carte VIP', text: 'Advanced · nouveau client' },
]

export function FeedCard({ items, interval, offset, className }: { items: typeof FEED_LEFT; interval: number; offset: number; className: string }) {
  const [i, setI] = useState(0)
  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    let timer = 0
    const start = window.setTimeout(() => {
      timer = window.setInterval(() => setI((v) => (v + 1) % items.length), interval)
    }, offset)
    return () => {
      window.clearTimeout(start)
      window.clearInterval(timer)
    }
  }, [items.length, interval, offset])
  const it = items[i]
  const I = it.icon
  return (
    <div className={className}>
      <div key={i} className="em-pop flex items-center gap-3 rounded-2xl bg-white p-4 shadow-[0_18px_40px_rgba(15,23,42,0.14)] ring-1 ring-black/[0.06]">
        <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${it.tone}`}>
          <I className="h-5 w-5" />
        </span>
        <div>
          <p className="text-xs font-semibold">{it.title}</p>
          <p className="text-[11px] text-gray-500">{it.text}</p>
        </div>
      </div>
    </div>
  )
}

function HeroShowcase() {
  const ref = useRef<HTMLDivElement>(null)
  const [tilt, setTilt] = useState({ x: 0, y: 0 })

  const onMove = (e: MouseEvent<HTMLDivElement>) => {
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const px = (e.clientX - r.left) / r.width - 0.5
    const py = (e.clientY - r.top) / r.height - 0.5
    setTilt({ x: py * -5, y: px * 7 })
  }

  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={() => setTilt({ x: 0, y: 0 })}
      className="relative mx-auto w-full max-w-3xl pb-10 [perspective:1600px] lg:max-w-none lg:pb-14 lg:pl-6"
    >
      <div className="em-blob pointer-events-none absolute -inset-6 rounded-[48px] bg-gradient-to-br from-orange-300/40 via-amber-200/30 to-transparent blur-3xl" />
      <div
        className="relative transition-transform duration-300 ease-out [transform-style:preserve-3d]"
        style={{ transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)` }}
      >
        <Browser url="atelio.app/suivi">
          <SuiviMock />
        </Browser>

        {/* Téléphone qui chevauche la fenêtre */}
        <div className="absolute -bottom-12 -left-6 hidden scale-[.82] lg:block xl:-left-12 xl:scale-90">
          <div className="em-float-slow">
            <PhoneMock />
          </div>
        </div>

        {/* Notifications vivantes (hors des chiffres) */}
        <div className="absolute -top-6 right-6 hidden lg:block">
          <FeedCard items={FEED_LEFT} interval={3800} offset={600} className="em-float" />
        </div>
        <div className="absolute -bottom-8 right-2 hidden lg:block xl:-right-4">
          <FeedCard items={FEED_RIGHT} interval={4200} offset={2200} className="em-float-slow" />
        </div>
      </div>
    </div>
  )
}

export function PhoneMock() {
  return (
    <div className="relative mx-auto w-[250px] rounded-[38px] bg-gray-950 p-2.5 shadow-[0_30px_70px_rgba(15,23,42,0.3)]">
      <div className="absolute left-1/2 top-3 h-4 w-20 -translate-x-1/2 rounded-full bg-gray-950" />
      <div className="overflow-hidden rounded-[30px] bg-[#f6f5f2] px-3 pb-4 pt-8">
        <p className="text-center text-xs font-bold">Suivi atelier</p>
        <div className="mt-3 grid grid-cols-3 gap-1.5 rounded-xl bg-white p-1 ring-1 ring-black/[0.06]">
          <span className="rounded-lg py-1.5 text-center text-[10px] font-semibold text-gray-500">Veille</span>
          <span className="rounded-lg bg-orange-500 py-1.5 text-center text-[10px] font-semibold text-white">Aujourd’hui</span>
          <span className="rounded-lg py-1.5 text-center text-[10px] font-semibold text-gray-500">Semaine</span>
        </div>
        <div className="mt-2.5 grid grid-cols-2 gap-1.5">
          <Kpi label="Au garage" value="25" />
          <Kpi label="Validées" value="3" tone="text-emerald-600" />
        </div>
        <div className="mt-2.5 space-y-1.5">
          {ROWS.slice(0, 3).map((r) => (
            <div key={r.car} className="rounded-xl bg-white p-2.5 ring-1 ring-black/[0.06]">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] font-semibold">{r.car}</p>
                <span className={`rounded px-1.5 py-0.5 text-[9px] font-semibold ${r.tone}`}>{r.etat}</span>
              </div>
              <p className="mt-0.5 text-[10px] text-gray-400">{r.equipe} · {r.jours}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

const TABS = [
  { id: 'atelier', label: 'Atelier', icon: CarFront, title: 'Voitures, états et réunion.', text: 'Chaque voiture a un état, une équipe, des photos et un historique. La réunion du jour liste seulement celles qui sont encore au garage.', points: ['Véhicules et archives', 'Réunion avec filtre par état', 'Suivi atelier à distance'] },
  { id: 'clients', label: 'Clients', icon: Users, title: 'Fiche client et carte VIP.', text: 'Coordonnées, réclamations et carte VIP au même endroit. Standard ou Advanced, avec un numéro et une période de validité.', points: ['Fiche client complète', 'Réclamations externes et internes', 'Carte VIP Standard ou Advanced'] },
  { id: 'argent', label: 'Argent', icon: Wallet, title: 'Du devis à la caisse.', text: 'Devis, factures, paiements partiels, caisse équipe et Money. Les types et catégories se gèrent depuis l’application.', points: ['Devis et factures', 'Caisse équipe et Money', 'Achats fournisseurs'] },
  { id: 'equipe', label: 'Équipe', icon: Smartphone, title: 'Le téléphone sert au travail.', text: 'L’application mobile reprend l’atelier. Les accès se règlent par compte, avec checklists et chat interne.', points: ['Application mobile', 'Accès par compte', 'Checklists et chat'] },
]

function ModulesTabs() {
  const [active, setActive] = useState('atelier')
  const tab = TABS.find((t) => t.id === active) ?? TABS[0]
  return (
    <div className="mt-12">
      <div className="mx-auto flex w-fit max-w-full gap-1 overflow-x-auto rounded-full bg-white p-1.5 shadow-sm ring-1 ring-black/[0.08]">
        {TABS.map((t) => {
          const I = t.icon
          const on = t.id === active
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setActive(t.id)}
              className={`flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
                on ? 'bg-orange-500 text-white shadow-[0_6px_14px_rgba(249,115,22,0.35)]' : 'text-gray-600 hover:bg-black/[0.04]'
              }`}
            >
              <I className="h-4 w-4" />
              {t.label}
            </button>
          )
        })}
      </div>

      <div className="mt-10 grid items-center gap-10 rounded-[32px] bg-white p-6 shadow-[0_20px_50px_rgba(15,23,42,0.06)] ring-1 ring-black/[0.06] md:p-10 lg:grid-cols-[0.8fr_1.2fr]">
        <div key={tab.id} className="em-swap">
          <h3 className="text-2xl font-semibold tracking-tight">{tab.title}</h3>
          <p className="mt-3 text-sm leading-relaxed text-gray-600">{tab.text}</p>
          <ul className="mt-6 space-y-3">
            {tab.points.map((p) => (
              <li key={p} className="flex items-center gap-3 text-sm font-medium text-gray-800">
                <CheckCircle2 className="h-4 w-4 text-orange-500" />
                {p}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl bg-[#f6f5f2] p-4 sm:p-6">
          <div key={`prev-${tab.id}`} className="em-swap">
            <ModulePreview id={tab.id} />
          </div>
        </div>
      </div>
    </div>
  )
}

export function ModulePreview({ id }: { id: string }) {
  if (id === 'clients') {
    return (
      <div className="mx-auto max-w-sm">
        <div className="overflow-hidden rounded-2xl bg-white shadow-[0_14px_34px_rgba(15,23,42,0.1)] ring-1 ring-black/[0.06]">
          <div className="relative px-5 pb-5 pt-4">
            <div className="pointer-events-none absolute -right-6 -top-8 h-24 w-24 rounded-full bg-orange-100" />
            <div className="relative flex items-center justify-between">
              <p className="text-[11px] font-bold tracking-[0.2em] text-orange-600">ATELIO</p>
              <span className="rounded-md bg-orange-500 px-2 py-1 text-[11px] font-bold text-white">ADVANCED</span>
            </div>
            <p className="relative mt-6 text-[11px] font-medium uppercase tracking-wide text-gray-400">Titulaire</p>
            <p className="relative text-[22px] font-semibold tracking-tight">Ahmed Benali</p>
            <p className="relative mt-3 inline-flex rounded-lg bg-gray-50 px-2.5 py-1 font-mono text-sm tracking-[0.16em] text-gray-700 ring-1 ring-gray-200">VIP-0001</p>
          </div>
          <div className="grid grid-cols-2 border-t border-gray-100 bg-gray-50">
            <div className="px-5 py-3"><p className="text-[10px] font-semibold uppercase text-gray-400">Valable du</p><p className="text-sm font-semibold">14/10/2026</p></div>
            <div className="border-l border-gray-200 px-5 py-3"><p className="text-[10px] font-semibold uppercase text-gray-400">Jusqu’au</p><p className="text-sm font-semibold">14/10/2027</p></div>
          </div>
        </div>
      </div>
    )
  }
  if (id === 'argent') {
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Kpi label="Entrées" value="12 480 DT" tone="text-emerald-600" />
          <Kpi label="Sorties" value="3 250 DT" tone="text-red-600" />
        </div>
        <div className="rounded-xl bg-white p-4 ring-1 ring-black/[0.06]">
          <p className="text-xs font-semibold text-gray-500">Types d’entrée</p>
          <div className="mt-3 space-y-2.5">
            {[['Réparation', 78], ['Pièces', 52], ['Diagnostic', 24]].map(([l, w]) => (
              <div key={String(l)}>
                <div className="flex justify-between text-[11px] font-medium text-gray-700"><span>{l}</span><span>{w}%</span></div>
                <div className="mt-1 h-2 rounded-full bg-gray-100"><div className="em-bar h-2 rounded-full bg-gradient-to-r from-orange-500 to-amber-400" style={{ width: `${w}%` }} /></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }
  if (id === 'equipe') {
    return (
      <div className="space-y-2.5">
        {[['Contrôle freins', 'Meher B.', true], ['Vidange et filtres', 'Amine K.', true], ['Essai sur route', 'Yassine T.', false]].map(([t, who, ok], n) => (
          <div key={String(t)} style={{ animationDelay: `${n * 120}ms` }} className="em-pop flex items-center justify-between rounded-xl bg-white p-3.5 ring-1 ring-black/[0.06]">
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-100 text-[11px] font-bold text-orange-700">{String(who).slice(0, 1)}</span>
              <div><p className="text-sm font-semibold">{String(t)}</p><p className="text-[11px] text-gray-400">{String(who)}</p></div>
            </div>
            <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${ok ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>{ok ? 'Fait' : 'À faire'}</span>
          </div>
        ))}
      </div>
    )
  }
  return <SuiviMock />
}

const FAQS = [
  ['Faut-il installer quelque chose ?', 'Non. L’outil s’ouvre dans le navigateur. L’application mobile Android est disponible pour l’équipe.'],
  ['Chaque employé voit-il tout ?', 'Non. Les accès se règlent compte par compte : un technicien n’a pas besoin de voir la caisse.'],
  ['Mes voitures déjà enregistrées sont-elles conservées ?', 'Oui. Les voitures validées passent aux archives et restent consultables.'],
  ['Comment se passe la démo ?', 'Vous laissez un nom, le garage et un téléphone. Nous vous rappelons pour montrer l’outil sur votre cas.'],
]

function Faq() {
  const [open, setOpen] = useState<number | null>(0)
  return (
    <div className="mt-10 divide-y divide-black/[0.06] rounded-3xl bg-white ring-1 ring-black/[0.06]">
      {FAQS.map(([q, a], i) => {
        const on = open === i
        return (
          <div key={q}>
            <button type="button" onClick={() => setOpen(on ? null : i)} className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left">
              <span className="text-sm font-semibold sm:text-base">{q}</span>
              <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-lg leading-none transition ${on ? 'rotate-45 bg-orange-500 text-white' : 'bg-gray-100 text-gray-600'}`}>+</span>
            </button>
            {on ? <p className="px-6 pb-5 text-sm leading-relaxed text-gray-600">{a}</p> : null}
          </div>
        )
      })}
    </div>
  )
}

/* ---------- Démo ---------- */

function DemoForm() {
  const [form, setForm] = useState({ nom: '', garage: '', telephone: '', ponts: '', message: '' })
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)
  const [saving, setSaving] = useState(false)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    if (!form.nom.trim() || !form.garage.trim() || !form.telephone.trim()) {
      setError('Le nom, le garage et le téléphone sont requis.')
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
      setError(err instanceof Error ? err.message : 'Envoi impossible.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section id="demo" className="px-5 pb-24">
      <div className="relative mx-auto max-w-6xl overflow-hidden rounded-[36px] bg-gradient-to-br from-orange-500 via-orange-500 to-amber-500 p-6 shadow-[0_30px_70px_rgba(249,115,22,0.35)] sm:p-12">
        <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-white/15 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-24 left-10 h-64 w-64 rounded-full bg-amber-300/30 blur-2xl" />
        <div className="relative grid items-center gap-10 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="text-white">
            <p className="text-sm font-semibold text-orange-100">Démo</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl sm:leading-[1.1]">Voyez ATELIO sur votre garage.</h2>
            <p className="mt-4 text-sm leading-relaxed text-orange-50">
              Laissez un nom, le garage et un téléphone. Nous vous rappelons pour une démonstration. Le tarif se discute à ce moment-là.
            </p>
            <ul className="mt-6 space-y-2.5 text-sm font-medium">
              {['Démonstration sur votre cas', 'Web et mobile', 'Réponse par téléphone'].map((t) => (
                <li key={t} className="flex items-center gap-2.5"><CheckCircle2 className="h-4 w-4" />{t}</li>
              ))}
            </ul>
          </div>
          <form onSubmit={submit} className="rounded-3xl bg-white p-6 shadow-xl sm:p-8">
            {sent ? (
              <div className="py-8 text-center">
                <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600"><CheckCircle2 className="h-7 w-7" /></span>
                <p className="mt-4 text-lg font-semibold">Demande envoyée.</p>
                <p className="mt-1 text-sm text-gray-600">Nous vous contactons pour fixer la démo.</p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {error ? <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 sm:col-span-2">{error}</p> : null}
                <Field label="Nom" value={form.nom} onChange={(nom) => setForm((p) => ({ ...p, nom }))} />
                <Field label="Garage" value={form.garage} onChange={(garage) => setForm((p) => ({ ...p, garage }))} />
                <Field label="Téléphone" value={form.telephone} onChange={(telephone) => setForm((p) => ({ ...p, telephone }))} type="tel" />
                <Field label="Nombre de ponts" value={form.ponts} onChange={(ponts) => setForm((p) => ({ ...p, ponts }))} type="number" />
                <label className="block text-sm sm:col-span-2">
                  <span className="font-medium text-gray-700">Message <span className="font-normal text-gray-400">(optionnel)</span></span>
                  <textarea
                    value={form.message}
                    onChange={(e) => setForm((p) => ({ ...p, message: e.target.value }))}
                    rows={3}
                    className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-100"
                  />
                </label>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-full bg-gray-950 px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:opacity-60 sm:col-span-2"
                >
                  {saving ? 'Envoi…' : 'Demander une démo'}
                </button>
              </div>
            )}
          </form>
        </div>
      </div>
    </section>
  )
}

function Field({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <label className="block text-sm">
      <span className="font-medium text-gray-700">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-100"
      />
    </label>
  )
}
