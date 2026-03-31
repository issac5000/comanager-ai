"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Bot,
  Calendar,
  CheckCircle,
  Clock,
  CreditCard,
  Image as ImageIcon,
  Lightbulb,
  Menu,
  MessageSquare,
  Palette,
  Send,
  Sparkles,
  Star,
  TrendingDown,
  Upload,
  X,
  Zap,
} from "lucide-react";

/* Inline social icons — not available in this lucide version */
function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  );
}

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}

/* ────────────────────────────────────────────────────────────
   Scroll Reveal — IntersectionObserver fade-up animation
   ──────────────────────────────────────────────────────────── */
function Reveal({
  children,
  className = "",
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setVisible(true);
          obs.unobserve(e.target);
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -60px 0px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "none" : "translateY(32px)",
        transition: `opacity 0.7s cubic-bezier(.16,1,.3,1) ${delay}ms, transform 0.7s cubic-bezier(.16,1,.3,1) ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────
   Animated Counter — counts up when visible
   ──────────────────────────────────────────────────────────── */
function Counter({
  end,
  suffix = "",
  prefix = "",
}: {
  end: number;
  suffix?: string;
  prefix?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [count, setCount] = useState(0);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting && !started) {
          setStarted(true);
          obs.unobserve(e.target);
        }
      },
      { threshold: 0.5 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [started]);

  useEffect(() => {
    if (!started) return;
    let current = 0;
    const steps = 50;
    const inc = end / steps;
    const timer = setInterval(() => {
      current += inc;
      if (current >= end) {
        setCount(end);
        clearInterval(timer);
      } else {
        setCount(Math.floor(current));
      }
    }, 36);
    return () => clearInterval(timer);
  }, [started, end]);

  return (
    <span ref={ref}>
      {prefix}
      {count}
      {suffix}
    </span>
  );
}

/* ════════════════════════════════════════════════════════════
   LANDING PAGE — AIDA Framework
   A = Attention (Hero)
   I = Interest  (Pain Points + How It Works)
   D = Desire    (Features + Metrics + Testimonials)
   A = Action    (Final CTA)
   ════════════════════════════════════════════════════════════ */
export default function HomePage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="min-h-screen bg-[#fffcf7] text-[#1a1a2e] overflow-x-hidden font-[family-name:var(--font-geist-sans)]">
      {/* ═══════════════════ NAVIGATION ═══════════════════ */}
      <nav
        className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
          scrolled
            ? "bg-[#fffcf7]/90 backdrop-blur-xl shadow-[0_1px_0_rgba(0,0,0,0.04)]"
            : ""
        }`}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-4">
          <Link href="/" className="text-xl font-bold tracking-tight">
            CoManager{" "}
            <span className="text-[#f97316]">AI</span>
          </Link>

          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-8 text-[0.84rem] font-medium text-[#1a1a2e]/50">
            <a
              href="#probleme"
              className="hover:text-[#1a1a2e] transition-colors"
            >
              Le problème
            </a>
            <a
              href="#comment-ca-marche"
              className="hover:text-[#1a1a2e] transition-colors"
            >
              Comment ça marche
            </a>
            <a
              href="#fonctionnalites"
              className="hover:text-[#1a1a2e] transition-colors"
            >
              Fonctionnalités
            </a>
            <a
              href="#temoignages"
              className="hover:text-[#1a1a2e] transition-colors"
            >
              Témoignages
            </a>
          </div>

          {/* Desktop CTAs */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm font-medium text-[#1a1a2e]/60 hover:text-[#1a1a2e] transition-colors px-4 py-2"
            >
              Se connecter
            </Link>
            <Link
              href="/register"
              className="text-sm font-semibold bg-[#f97316] text-white px-5 py-2.5 rounded-lg hover:bg-[#ea580c] transition-all shadow-[0_2px_12px_rgba(249,115,22,0.25)] hover:shadow-[0_4px_20px_rgba(249,115,22,0.35)]"
            >
              Essayer gratuitement
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-1"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Menu"
          >
            {menuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden bg-[#fffcf7] border-t border-[#1a1a2e]/5 px-6 py-5 space-y-1">
            {[
              { href: "#probleme", label: "Le problème" },
              { href: "#comment-ca-marche", label: "Comment ça marche" },
              { href: "#fonctionnalites", label: "Fonctionnalités" },
              { href: "#temoignages", label: "Témoignages" },
            ].map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="block py-2.5 text-sm font-medium text-[#1a1a2e]/60"
                onClick={() => setMenuOpen(false)}
              >
                {item.label}
              </a>
            ))}
            <div className="pt-3 flex flex-col gap-2">
              <Link
                href="/login"
                className="text-sm text-center py-2.5 text-[#1a1a2e]/60"
              >
                Se connecter
              </Link>
              <Link
                href="/register"
                className="text-sm font-semibold bg-[#f97316] text-white py-3 rounded-lg text-center"
              >
                Essayer gratuitement
              </Link>
            </div>
          </div>
        )}
      </nav>

      {/* ═══════════════════════════════════════════════════════
          A — ATTENTION : Hero Section
          ═══════════════════════════════════════════════════════ */}
      <section className="relative min-h-screen flex flex-col items-center justify-center pt-24 pb-16 md:pb-24 overflow-hidden">
        {/* Animated gradient orbs */}
        <div className="landing-orb landing-orb--orange" />
        <div className="landing-orb landing-orb--rose" />
        <div className="landing-orb landing-orb--blue" />

        <div className="relative z-10 max-w-5xl mx-auto px-6 text-center">
          {/* Badge */}
          <div className="hero-animate inline-flex items-center gap-2 rounded-full border border-[#f97316]/20 bg-[#f97316]/[0.06] px-4 py-1.5 text-sm font-medium text-[#ea580c] mb-8">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Propulsé par l&apos;IA générative</span>
          </div>

          {/* Headline */}
          <h1 className="hero-animate hero-stagger-1 font-display text-[2.75rem] sm:text-6xl md:text-7xl lg:text-[5.25rem] leading-[1.06] tracking-tight">
            Arrêtez de perdre
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#f97316] via-[#ef4444] to-[#ec4899]">
              10 heures par semaine
            </span>
            <br />
            sur vos réseaux
          </h1>

          {/* Subtitle */}
          <p className="hero-animate hero-stagger-2 mt-8 text-lg md:text-xl text-[#1a1a2e]/55 max-w-2xl mx-auto leading-relaxed">
            CoManager AI génère vos publications, crée vos visuels et publie
            automatiquement sur Instagram &amp; Facebook. Vous validez en un
            clic.
          </p>

          {/* CTA Buttons */}
          <div className="hero-animate hero-stagger-3 mt-10 flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/register"
              className="group inline-flex items-center justify-center gap-2 bg-[#f97316] text-white font-semibold text-lg px-8 py-4 rounded-xl hover:bg-[#ea580c] transition-all duration-300 shadow-[0_4px_24px_rgba(249,115,22,0.3)] hover:shadow-[0_8px_40px_rgba(249,115,22,0.4)] hover:-translate-y-0.5"
            >
              Commencer gratuitement
              <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <a
              href="#comment-ca-marche"
              className="inline-flex items-center justify-center gap-2 border-2 border-[#1a1a2e]/[0.08] text-[#1a1a2e]/60 font-medium text-lg px-8 py-4 rounded-xl hover:border-[#1a1a2e]/15 hover:bg-[#1a1a2e]/[0.03] transition-all duration-300"
            >
              Voir comment ça marche
            </a>
          </div>

          {/* Trust bar */}
          <div className="hero-animate hero-stagger-4 mt-14 flex flex-col sm:flex-row items-center justify-center gap-4 text-sm text-[#1a1a2e]/40">
            <div className="flex -space-x-2">
              {["S", "T", "A", "L", "M"].map((letter, i) => (
                <div
                  key={i}
                  className="h-8 w-8 rounded-full border-2 border-[#fffcf7] flex items-center justify-center text-xs font-bold text-white"
                  style={{
                    background: [
                      "#f97316",
                      "#ef4444",
                      "#8b5cf6",
                      "#06b6d4",
                      "#10b981",
                    ][i],
                    zIndex: 5 - i,
                  }}
                >
                  {letter}
                </div>
              ))}
            </div>
            <span>
              Rejoint par{" "}
              <strong className="text-[#1a1a2e]/65">+500 entreprises</strong> en
              France
            </span>
          </div>
        </div>

        {/* Hero visual — browser window mockup */}
        <div className="hero-animate hero-stagger-5 relative z-10 mt-16 w-full max-w-4xl mx-auto px-6">
          <div className="bg-white rounded-2xl shadow-[0_25px_80px_rgba(0,0,0,0.08),0_1px_3px_rgba(0,0,0,0.04)] border border-black/[0.04] overflow-hidden">
            {/* Browser chrome */}
            <div className="flex items-center gap-2 px-4 py-3 bg-[#f9f8f6] border-b border-black/[0.04]">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
                <div className="w-3 h-3 rounded-full bg-[#febc2e]" />
                <div className="w-3 h-3 rounded-full bg-[#28c840]" />
              </div>
              <div className="flex-1 flex justify-center">
                <div className="bg-white rounded-md px-4 py-1 text-xs text-[#1a1a2e]/35 border border-black/[0.06]">
                  app.comanager.ai/dashboard
                </div>
              </div>
            </div>
            {/* Dashboard content */}
            <div className="p-5 md:p-6 flex gap-6">
              {/* Sidebar preview */}
              <div className="hidden md:flex flex-col gap-3 w-44 shrink-0 border-r border-black/[0.04] pr-5">
                <div className="text-sm font-semibold flex items-center gap-2">
                  <span className="w-6 h-6 rounded-md bg-[#f97316] flex items-center justify-center text-[10px] text-white font-bold">
                    C
                  </span>
                  CoManager
                </div>
                <div className="mt-2 space-y-1.5">
                  <div className="text-xs font-medium text-[#f97316] bg-[#f97316]/[0.06] rounded-md px-3 py-1.5">
                    Publications
                  </div>
                  <div className="text-xs text-[#1a1a2e]/35 px-3 py-1.5">
                    Commentaires
                  </div>
                  <div className="text-xs text-[#1a1a2e]/35 px-3 py-1.5">
                    Médiathèque
                  </div>
                  <div className="text-xs text-[#1a1a2e]/35 px-3 py-1.5">
                    Paramètres
                  </div>
                </div>
              </div>
              {/* Post preview cards */}
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="rounded-xl border border-black/[0.05] p-4 space-y-3">
                  <div className="w-full aspect-[4/3] rounded-lg bg-gradient-to-br from-orange-100 via-amber-50 to-rose-100 flex items-center justify-center">
                    <ImageIcon className="h-8 w-8 text-orange-300" />
                  </div>
                  <div className="space-y-1.5">
                    <div className="h-2 bg-[#1a1a2e]/[0.08] rounded-full w-[85%]" />
                    <div className="h-2 bg-[#1a1a2e]/[0.04] rounded-full w-[55%]" />
                  </div>
                  <div className="flex gap-2">
                    <span className="text-[10px] px-2 py-0.5 bg-green-50 text-green-600 rounded-full font-medium">
                      Approuvé
                    </span>
                    <span className="text-[10px] px-2 py-0.5 bg-pink-50 text-pink-600 rounded-full font-medium flex items-center gap-0.5">
                      <InstagramIcon className="h-2.5 w-2.5" /> Instagram
                    </span>
                  </div>
                </div>
                <div className="rounded-xl border border-black/[0.05] p-4 space-y-3">
                  <div className="w-full aspect-[4/3] rounded-lg bg-gradient-to-br from-violet-100 via-blue-50 to-cyan-100 flex items-center justify-center">
                    <ImageIcon className="h-8 w-8 text-violet-300" />
                  </div>
                  <div className="space-y-1.5">
                    <div className="h-2 bg-[#1a1a2e]/[0.08] rounded-full w-full" />
                    <div className="h-2 bg-[#1a1a2e]/[0.04] rounded-full w-[65%]" />
                  </div>
                  <div className="flex gap-2">
                    <span className="text-[10px] px-2 py-0.5 bg-amber-50 text-amber-600 rounded-full font-medium">
                      En attente
                    </span>
                    <span className="text-[10px] px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full font-medium flex items-center gap-0.5">
                      <FacebookIcon className="h-2.5 w-2.5" /> Facebook
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          I — INTEREST : Pain Points
          ═══════════════════════════════════════════════════════ */}
      <section id="probleme" className="py-24 md:py-32">
        <div className="max-w-6xl mx-auto px-6">
          <Reveal>
            <p className="text-sm font-semibold text-[#f97316] tracking-[0.15em] uppercase mb-4">
              Le problème
            </p>
          </Reveal>
          <Reveal delay={80}>
            <h2 className="font-display text-3xl md:text-[3.25rem] md:leading-[1.12] mb-16 max-w-3xl">
              Gérer ses réseaux sociaux,
              <br />
              <span className="text-[#1a1a2e]/35">
                c&apos;est un travail à plein temps
              </span>
            </h2>
          </Reveal>

          <div className="grid sm:grid-cols-2 gap-5">
            {(
              [
                {
                  icon: Clock,
                  title: "Chronophage",
                  desc: "Trouver des idées, rédiger, créer les visuels, publier... 10h par semaine qui pourraient servir à développer votre activité.",
                  color: "#ef4444",
                },
                {
                  icon: Lightbulb,
                  title: "Syndrome de la page blanche",
                  desc: "Quoi poster ? Quand poster ? Quel ton utiliser ? Sans stratégie claire, chaque publication devient une épreuve.",
                  color: "#8b5cf6",
                },
                {
                  icon: Calendar,
                  title: "Irrégularité",
                  desc: "Vous publiez 3 fois d'affilée, puis plus rien pendant 3 semaines. Les algorithmes vous pénalisent.",
                  color: "#f97316",
                },
                {
                  icon: TrendingDown,
                  title: "Résultats décevants",
                  desc: "Malgré vos efforts, l'engagement stagne. Vos concurrents semblent toujours avoir un coup d'avance.",
                  color: "#ec4899",
                },
              ] as const
            ).map((item, i) => (
              <Reveal key={i} delay={i * 80}>
                <div className="group h-full p-7 md:p-8 rounded-2xl border border-[#1a1a2e]/[0.05] bg-white hover:shadow-[0_8px_40px_rgba(0,0,0,0.05)] transition-all duration-300 hover:-translate-y-1">
                  <div
                    className="h-12 w-12 rounded-xl flex items-center justify-center mb-5"
                    style={{ background: `${item.color}0d` }}
                  >
                    <item.icon
                      className="h-6 w-6"
                      style={{ color: item.color }}
                    />
                  </div>
                  <h3 className="text-xl font-semibold mb-3">{item.title}</h3>
                  <p className="text-[#1a1a2e]/45 leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>

          {/* Transition element */}
          <Reveal delay={100}>
            <div className="mt-20 text-center">
              <p className="font-display text-2xl md:text-3xl text-[#1a1a2e]/70">
                Et si tout ça se faisait{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#f97316] to-[#ef4444]">
                  automatiquement
                </span>{" "}
                ?
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          I — INTEREST : How It Works
          ═══════════════════════════════════════════════════════ */}
      <section
        id="comment-ca-marche"
        className="py-24 md:py-32 bg-[#0c1220] text-white"
      >
        <div className="max-w-6xl mx-auto px-6">
          <Reveal>
            <p className="text-sm font-semibold text-[#f97316] tracking-[0.15em] uppercase mb-4">
              Comment ça marche
            </p>
          </Reveal>
          <Reveal delay={80}>
            <h2 className="font-display text-3xl md:text-[3.25rem] md:leading-[1.12] mb-20 max-w-3xl">
              3 étapes pour automatiser
              <br />
              <span className="text-white/35">vos réseaux sociaux</span>
            </h2>
          </Reveal>

          <div className="grid md:grid-cols-3 gap-12 md:gap-8">
            {(
              [
                {
                  step: "01",
                  icon: Upload,
                  title: "Uploadez vos photos",
                  desc: "Ajoutez vos photos de produits, équipe, locaux dans votre médiathèque. L'IA les utilise pour créer des visuels uniques.",
                },
                {
                  step: "02",
                  icon: Sparkles,
                  title: "L'IA génère tout",
                  desc: "Légendes percutantes, hashtags optimisés, visuels sur-mesure. Tout est adapté à votre secteur et votre ton éditorial.",
                },
                {
                  step: "03",
                  icon: Send,
                  title: "Validez et publiez",
                  desc: "Passez en revue les suggestions, modifiez si besoin, et approuvez en un clic. Publication automatique.",
                },
              ] as const
            ).map((item, i) => (
              <Reveal key={i} delay={i * 140}>
                <div className="relative">
                  {/* Giant step number */}
                  <span className="font-display text-[8rem] text-white/[0.03] absolute -top-14 -left-3 leading-none select-none pointer-events-none">
                    {item.step}
                  </span>
                  <div className="relative">
                    <div className="h-14 w-14 rounded-2xl bg-[#f97316] flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(249,115,22,0.25)]">
                      <item.icon className="h-6 w-6 text-white" />
                    </div>
                    <h3 className="text-2xl font-semibold mb-4">
                      {item.title}
                    </h3>
                    <p className="text-white/45 leading-relaxed text-lg">
                      {item.desc}
                    </p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          D — DESIRE : Features Bento Grid
          ═══════════════════════════════════════════════════════ */}
      <section id="fonctionnalites" className="py-24 md:py-32">
        <div className="max-w-6xl mx-auto px-6">
          <Reveal>
            <p className="text-sm font-semibold text-[#f97316] tracking-[0.15em] uppercase mb-4">
              Fonctionnalités
            </p>
          </Reveal>
          <Reveal delay={80}>
            <h2 className="font-display text-3xl md:text-[3.25rem] md:leading-[1.12] mb-16 max-w-3xl">
              Tout ce dont vous avez besoin,
              <br />
              <span className="text-[#1a1a2e]/35">rien de superflu</span>
            </h2>
          </Reveal>

          <div className="grid md:grid-cols-3 gap-5">
            {/* Large card — AI Captions */}
            <Reveal className="md:col-span-2" delay={0}>
              <div className="h-full p-7 md:p-8 rounded-2xl bg-gradient-to-br from-orange-50/80 to-rose-50/60 border border-orange-100/40 group hover:shadow-[0_8px_40px_rgba(249,115,22,0.08)] transition-all duration-300">
                <div className="flex items-start justify-between mb-6">
                  <div className="h-12 w-12 rounded-xl bg-[#f97316]/10 flex items-center justify-center">
                    <Bot className="h-6 w-6 text-[#f97316]" />
                  </div>
                  <span className="text-[11px] font-semibold text-[#f97316] bg-[#f97316]/[0.08] px-3 py-1 rounded-full uppercase tracking-wider">
                    IA
                  </span>
                </div>
                <h3 className="text-2xl font-semibold mb-3">
                  Légendes générées par IA
                </h3>
                <p className="text-[#1a1a2e]/45 leading-relaxed mb-6">
                  Des textes engageants et des hashtags optimisés, adaptés à
                  votre secteur, votre audience et votre ton éditorial.
                </p>
                {/* Mini post preview */}
                <div className="bg-white rounded-xl p-4 border border-black/[0.04] shadow-sm">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-orange-400 to-rose-400" />
                    <span className="text-xs font-semibold">
                      Mon Restaurant Lyon
                    </span>
                    <span className="text-[10px] text-[#1a1a2e]/30 ml-auto">
                      Généré par IA
                    </span>
                  </div>
                  <p className="text-sm text-[#1a1a2e]/65 leading-relaxed">
                    Belle journée ensoleillée à Lyon ! Venez découvrir notre
                    nouvelle carte d&apos;été sur notre terrasse. Des saveurs
                    fraîches et locales qui vous feront voyager...
                  </p>
                  <p className="text-xs text-[#f97316] mt-2 font-medium">
                    #restaurant #lyon #terrasse #été #gastronomie
                  </p>
                </div>
              </div>
            </Reveal>

            {/* Image generation */}
            <Reveal delay={100}>
              <div className="h-full p-7 md:p-8 rounded-2xl bg-gradient-to-br from-violet-50/80 to-blue-50/60 border border-violet-100/40 group hover:shadow-[0_8px_40px_rgba(139,92,246,0.08)] transition-all duration-300">
                <div className="h-12 w-12 rounded-xl bg-violet-500/10 flex items-center justify-center mb-6">
                  <Palette className="h-6 w-6 text-violet-500" />
                </div>
                <h3 className="text-xl font-semibold mb-3">Visuels IA</h3>
                <p className="text-[#1a1a2e]/45 leading-relaxed mb-6">
                  Images uniques créées par IA à partir de vos photos et votre
                  identité visuelle.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="aspect-square rounded-lg bg-gradient-to-br from-violet-200/80 to-blue-200/60" />
                  <div className="aspect-square rounded-lg bg-gradient-to-br from-rose-200/80 to-orange-200/60" />
                </div>
              </div>
            </Reveal>

            {/* Auto-publish */}
            <Reveal delay={60}>
              <div className="h-full p-7 md:p-8 rounded-2xl bg-white border border-[#1a1a2e]/[0.05] group hover:shadow-[0_8px_40px_rgba(0,0,0,0.05)] transition-all duration-300">
                <div className="h-12 w-12 rounded-xl bg-green-500/10 flex items-center justify-center mb-6">
                  <Send className="h-6 w-6 text-green-600" />
                </div>
                <h3 className="text-xl font-semibold mb-3">
                  Publication automatique
                </h3>
                <p className="text-[#1a1a2e]/45 leading-relaxed">
                  Planification et publication directe sur Facebook et
                  Instagram, sans intervention.
                </p>
                <div className="flex gap-3 mt-6">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full">
                    <FacebookIcon className="h-3.5 w-3.5" /> Facebook
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-medium text-pink-600 bg-pink-50 px-3 py-1.5 rounded-full">
                    <InstagramIcon className="h-3.5 w-3.5" /> Instagram
                  </div>
                </div>
              </div>
            </Reveal>

            {/* Comment management — large */}
            <Reveal className="md:col-span-2" delay={140}>
              <div className="h-full p-7 md:p-8 rounded-2xl bg-gradient-to-br from-emerald-50/80 to-teal-50/60 border border-emerald-100/40 group hover:shadow-[0_8px_40px_rgba(16,185,129,0.08)] transition-all duration-300">
                <div className="flex items-start justify-between mb-6">
                  <div className="h-12 w-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                    <MessageSquare className="h-6 w-6 text-emerald-600" />
                  </div>
                  <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-500/[0.08] px-3 py-1 rounded-full uppercase tracking-wider">
                    Nouveau
                  </span>
                </div>
                <h3 className="text-2xl font-semibold mb-3">
                  Gestion intelligente des commentaires
                </h3>
                <p className="text-[#1a1a2e]/45 leading-relaxed mb-6">
                  L&apos;IA analyse chaque commentaire et propose une réponse
                  adaptée. Vous validez avant l&apos;envoi. Le spam est détecté
                  automatiquement.
                </p>
                {/* Comment thread preview */}
                <div className="flex flex-col gap-3">
                  <div className="flex gap-3 bg-white rounded-xl p-4 border border-black/[0.04]">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-cyan-400 shrink-0" />
                    <div>
                      <span className="text-xs font-semibold">Marie L.</span>
                      <p className="text-sm text-[#1a1a2e]/55 mt-0.5">
                        Super restaurant ! La terrasse est magnifique
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3 bg-emerald-500/[0.04] rounded-xl p-4 border border-emerald-200/40 ml-8">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-rose-400 shrink-0 flex items-center justify-center">
                      <Bot className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <span className="text-[11px] font-semibold text-emerald-600">
                        Réponse IA · En attente de validation
                      </span>
                      <p className="text-sm text-[#1a1a2e]/55 mt-0.5">
                        Merci beaucoup Marie ! On est ravis que la terrasse vous
                        plaise. À très bientôt !
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          D — DESIRE : Metrics
          ═══════════════════════════════════════════════════════ */}
      <section className="py-24 md:py-32 bg-[#0c1220] text-white">
        <div className="max-w-6xl mx-auto px-6">
          <Reveal>
            <p className="text-sm font-semibold text-[#f97316] tracking-[0.15em] uppercase mb-4">
              Résultats
            </p>
          </Reveal>
          <Reveal delay={80}>
            <h2 className="font-display text-3xl md:text-[3.25rem] md:leading-[1.12] mb-20 max-w-3xl">
              Des résultats concrets,
              <br />
              <span className="text-white/35">dès la première semaine</span>
            </h2>
          </Reveal>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-10 md:gap-8">
            {(
              [
                {
                  value: 30,
                  suffix: "min",
                  prefix: "",
                  label: "au lieu de 10h / semaine",
                  sub: "Temps de gestion",
                },
                {
                  value: 3,
                  suffix: "×",
                  prefix: "",
                  label: "plus de publications",
                  sub: "Fréquence",
                },
                {
                  value: 150,
                  suffix: "%",
                  prefix: "+",
                  label: "d'engagement moyen",
                  sub: "Performance",
                },
                {
                  value: 24,
                  suffix: "/7",
                  prefix: "",
                  label: "présence en ligne",
                  sub: "Disponibilité",
                },
              ] as const
            ).map((item, i) => (
              <Reveal key={i} delay={i * 100}>
                <div className="text-center lg:text-left">
                  <p className="text-[11px] text-white/30 uppercase tracking-[0.2em] font-semibold mb-4">
                    {item.sub}
                  </p>
                  <p className="text-5xl md:text-6xl font-display text-transparent bg-clip-text bg-gradient-to-r from-[#f97316] to-[#fbbf24]">
                    <Counter
                      end={item.value}
                      suffix={item.suffix}
                      prefix={item.prefix}
                    />
                  </p>
                  <p className="text-white/40 mt-3 text-lg">{item.label}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          D — DESIRE : Testimonials
          ═══════════════════════════════════════════════════════ */}
      <section id="temoignages" className="py-24 md:py-32">
        <div className="max-w-6xl mx-auto px-6">
          <Reveal>
            <p className="text-sm font-semibold text-[#f97316] tracking-[0.15em] uppercase mb-4">
              Témoignages
            </p>
          </Reveal>
          <Reveal delay={80}>
            <h2 className="font-display text-3xl md:text-[3.25rem] md:leading-[1.12] mb-16 max-w-3xl">
              Ils ont transformé
              <br />
              <span className="text-[#1a1a2e]/35">
                leur présence en ligne
              </span>
            </h2>
          </Reveal>

          <div className="grid md:grid-cols-3 gap-5">
            {[
              {
                name: "Sophie M.",
                role: "Restauratrice",
                city: "Lyon",
                quote:
                  "Depuis que j'utilise CoManager AI, je publie 5 fois par semaine au lieu d'une. Mes réservations en ligne ont augmenté de 30%.",
                stars: 5,
                color: "#f97316",
              },
              {
                name: "Thomas D.",
                role: "Agent immobilier",
                city: "Paris",
                quote:
                  "L'IA comprend parfaitement le ton de mon agence. Les publications sont professionnelles et génèrent des contacts qualifiés.",
                stars: 5,
                color: "#8b5cf6",
              },
              {
                name: "Amira K.",
                role: "Salon de beauté",
                city: "Marseille",
                quote:
                  "Je n'ai plus à réfléchir à quoi poster. Je valide les suggestions en 5 minutes le matin et c'est tout. Magique.",
                stars: 5,
                color: "#ec4899",
              },
            ].map((t, i) => (
              <Reveal key={i} delay={i * 100}>
                <div className="h-full flex flex-col p-7 md:p-8 rounded-2xl bg-white border border-[#1a1a2e]/[0.05] hover:shadow-[0_8px_40px_rgba(0,0,0,0.05)] transition-all duration-300">
                  {/* Stars */}
                  <div className="flex gap-0.5 mb-6">
                    {[...Array(t.stars)].map((_, j) => (
                      <Star
                        key={j}
                        className="h-4 w-4 fill-amber-400 text-amber-400"
                      />
                    ))}
                  </div>
                  {/* Quote */}
                  <p className="text-[#1a1a2e]/60 leading-relaxed text-[1.06rem] mb-8 flex-1">
                    &ldquo;{t.quote}&rdquo;
                  </p>
                  {/* Author */}
                  <div className="flex items-center gap-3">
                    <div
                      className="h-11 w-11 rounded-full flex items-center justify-center text-white font-bold text-sm"
                      style={{ background: t.color }}
                    >
                      {t.name[0]}
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{t.name}</p>
                      <p className="text-xs text-[#1a1a2e]/40">
                        {t.role} · {t.city}
                      </p>
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          D — DESIRE : Industries
          ═══════════════════════════════════════════════════════ */}
      <section className="py-24 md:py-32 bg-[#f7f5f0]">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <Reveal>
            <p className="text-sm font-semibold text-[#f97316] tracking-[0.15em] uppercase mb-4">
              Secteurs
            </p>
          </Reveal>
          <Reveal delay={80}>
            <h2 className="font-display text-3xl md:text-[3.25rem] md:leading-[1.12] mb-14">
              Conçu pour votre métier
            </h2>
          </Reveal>
          <Reveal delay={160}>
            <div className="flex flex-wrap justify-center gap-3 max-w-4xl mx-auto">
              {[
                "Restaurant",
                "Salon de coiffure",
                "Immobilier",
                "Salle de sport",
                "E-commerce",
                "Artisan",
                "Hôtellerie",
                "Consulting",
                "Santé",
                "Commerce local",
                "Institut de beauté",
                "Photographe",
              ].map((industry) => (
                <span
                  key={industry}
                  className="px-5 py-2.5 rounded-full bg-white border border-[#1a1a2e]/[0.05] text-sm font-medium text-[#1a1a2e]/60 hover:border-[#f97316]/30 hover:text-[#f97316] hover:bg-[#f97316]/[0.04] transition-all duration-200 cursor-default shadow-sm"
                >
                  {industry}
                </span>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          A — ACTION : Final CTA
          ═══════════════════════════════════════════════════════ */}
      <section className="relative py-24 md:py-32 bg-gradient-to-br from-[#f97316] via-[#f59e0b] to-[#ef4444] text-white overflow-hidden">
        {/* Decorative blurs */}
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-white/[0.08] blur-[80px] pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-72 h-72 rounded-full bg-white/[0.08] blur-[60px] pointer-events-none" />

        <div className="relative z-10 max-w-3xl mx-auto px-6 text-center">
          <Reveal>
            <h2 className="font-display text-3xl md:text-5xl lg:text-[3.5rem] leading-tight mb-6">
              Prêt à transformer votre présence en ligne ?
            </h2>
          </Reveal>
          <Reveal delay={100}>
            <p className="text-white/80 text-lg md:text-xl mb-10 leading-relaxed">
              Rejoignez les entreprises qui ont automatisé leurs réseaux sociaux
              avec l&apos;IA. Configuration en 5 minutes.
            </p>
          </Reveal>
          <Reveal delay={200}>
            <Link
              href="/register"
              className="group inline-flex items-center gap-2 bg-white text-[#ea580c] font-bold text-lg px-10 py-5 rounded-xl hover:bg-white/95 transition-all duration-300 shadow-[0_8px_32px_rgba(0,0,0,0.15)] hover:shadow-[0_12px_48px_rgba(0,0,0,0.2)] hover:-translate-y-0.5"
            >
              Commencer gratuitement maintenant
              <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </Reveal>
          <Reveal delay={300}>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-6 text-sm text-white/70">
              <span className="flex items-center gap-2">
                <CreditCard className="h-4 w-4" /> Sans carte bancaire
              </span>
              <span className="flex items-center gap-2">
                <Zap className="h-4 w-4" /> Configuration en 5 min
              </span>
              <span className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4" /> Annulez à tout moment
              </span>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          FOOTER
          ═══════════════════════════════════════════════════════ */}
      <footer className="py-10 bg-[#0c1220] text-white/35">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="font-bold text-white/60 text-sm">
              CoManager <span className="text-[#f97316]">AI</span>
            </span>
            <span className="text-xs">
              &copy; {new Date().getFullYear()} Tous droits réservés.
            </span>
          </div>
          <div className="flex gap-6 text-xs">
            <a href="#" className="hover:text-white/60 transition-colors">
              Confidentialité
            </a>
            <a href="#" className="hover:text-white/60 transition-colors">
              CGU
            </a>
            <a href="#" className="hover:text-white/60 transition-colors">
              Contact
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
