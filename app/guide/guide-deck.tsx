'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useAuth } from '@/lib/auth/context'

const TOTAL = 12

// Palette — accents principaux alignés sur le design system Wyzlee (orange)
const IND = 'var(--color-accent)'   // orange #FF6B35
const VIO = 'var(--color-accent2)'  // orange foncé #E55A22
const GRN = '#39d353'
const PUR = '#c084fc'
const AMB = '#fbbf24'
const CYN = '#00c2ff'
const ORG = '#ff6b35'
const PNK = '#f43f5e'
const SKY = '#0ea5e9'
const EME = '#10b981'

function Eyebrow({ children }: { children: string }) {
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 8,
      fontSize: '0.6rem', color: IND, letterSpacing: '0.2em',
      textTransform: 'uppercase' as const, marginBottom: 20,
      border: '1px solid rgba(255,107,53,0.3)', padding: '4px 12px',
      borderRadius: 4, background: 'rgba(255,107,53,0.07)',
    }}>
      {children}
    </div>
  )
}

function Heading({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <h2 style={{
      fontFamily: 'var(--font-display), sans-serif', fontWeight: 900,
      fontSize: 'clamp(1.6rem, 3vw, 2.6rem)', lineHeight: 1.05,
      letterSpacing: '-0.02em', marginBottom: 24,
      color: 'var(--color-text)', ...style,
    }}>
      {children}
    </h2>
  )
}

function Lead({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <p style={{
      fontSize: '0.85rem', color: 'var(--color-muted)',
      maxWidth: 560, lineHeight: 1.85, ...style,
    }}>
      {children}
    </p>
  )
}

function StatBlock({ color, value, label }: { color: string; value: string; label: string }) {
  return (
    <div style={{
      background: 'var(--color-card)', border: '1px solid var(--color-border)',
      borderRadius: 10, padding: '20px 24px', flex: 1, minWidth: 140, maxWidth: 220,
      position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: color }} />
      <div style={{ fontFamily: 'var(--font-display), sans-serif', fontWeight: 900, fontSize: '2.2rem', color, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: '0.62rem', color: 'var(--color-muted)', marginTop: 7, lineHeight: 1.5 }}>{label}</div>
    </div>
  )
}

function Card({ color, label, title, desc, style }: { color: string; label: string; title: string; desc: string; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: 'var(--color-card)', border: '1px solid var(--color-border)',
      borderRadius: 8, padding: '20px 22px', position: 'relative', overflow: 'hidden',
      display: 'flex', flexDirection: 'column', gap: 6, ...style,
    }}>
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: color }} />
      <div style={{ fontSize: '0.58rem', color, textTransform: 'uppercase' as const, letterSpacing: '0.15em' }}>{label}</div>
      <div style={{ fontFamily: 'var(--font-display), sans-serif', fontWeight: 700, fontSize: '0.9rem', color: 'var(--color-text)' }}>{title}</div>
      <div style={{ fontSize: '0.68rem', color: 'var(--color-muted)', lineHeight: 1.65 }}>{desc}</div>
    </div>
  )
}

function PhaseItem({ n, name, pts, sub, color }: { n: string; name: string; pts: string; sub: string; color: string }) {
  return (
    <div style={{
      background: 'var(--color-card)', border: '1px solid var(--color-border)',
      borderRadius: 7, padding: '14px 16px', display: 'flex', gap: 12, alignItems: 'flex-start',
    }}>
      <div style={{ fontFamily: 'var(--font-display), sans-serif', fontWeight: 900, fontSize: '1.1rem', color, opacity: 0.25, minWidth: 24, lineHeight: 1.1 }}>{n}</div>
      <div>
        <div style={{ fontFamily: 'var(--font-display), sans-serif', fontWeight: 700, fontSize: '0.78rem', color: 'var(--color-text)', marginBottom: 2, display: 'flex', alignItems: 'center', gap: 7 }}>
          {name}
          <span style={{ fontFamily: 'var(--font-sans), monospace', fontSize: '0.55rem', color, border: `1px solid ${color}`, padding: '1px 5px', borderRadius: 2, opacity: 0.7 }}>{pts}</span>
        </div>
        <div style={{ fontSize: '0.63rem', color: 'var(--color-muted)', lineHeight: 1.5 }}>{sub}</div>
      </div>
    </div>
  )
}

function PersonaCard({ color, emoji, name, desc, need }: { color: string; emoji: string; name: string; desc: string; need: string }) {
  return (
    <div style={{
      background: 'var(--color-card)', border: '1px solid var(--color-border)',
      borderRadius: 10, padding: 24, position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: color }} />
      <div style={{ fontSize: '1.8rem', marginBottom: 12 }}>{emoji}</div>
      <div style={{ fontFamily: 'var(--font-display), sans-serif', fontWeight: 700, fontSize: '0.85rem', color, marginBottom: 8 }}>{name}</div>
      <div style={{ fontSize: '0.68rem', color: 'var(--color-muted)', lineHeight: 1.65 }}>{desc}</div>
      <div style={{ fontSize: '0.66rem', color: 'var(--color-text)', borderLeft: `2px solid ${color}`, paddingLeft: 10, lineHeight: 1.6, marginTop: 10, fontStyle: 'italic' }}>
        {need}
      </div>
    </div>
  )
}

// ─── SLIDE 1 : COVER ──────────────────────────────────────────────────────────
function Slide1() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100%', padding: '48px clamp(24px, 6vw, 80px)' }}>
      <div style={{ position: 'absolute', width: 600, height: 400, background: 'radial-gradient(ellipse, rgba(255,107,53,0.12) 0%, transparent 70%)', top: '50%', left: '30%', transform: 'translate(-50%,-50%)', pointerEvents: 'none' }} />
      <Eyebrow>◆ Wyzlee — Produit SEO-GEO</Eyebrow>
      <h1 style={{ fontFamily: 'var(--font-display), sans-serif', fontWeight: 900, lineHeight: 0.95, letterSpacing: '-0.03em', fontSize: 'clamp(3rem, 8vw, 7rem)', marginBottom: 20 }}>
        <span style={{ color: IND }}>SEO</span><span style={{ color: VIO }}>-GEO</span><br />
        <span style={{ color: 'var(--color-muted)' }}>Audit</span>
      </h1>
      <p style={{ fontSize: '1rem', color: 'var(--color-muted)', maxWidth: 520, lineHeight: 1.7, marginBottom: 40 }}>
        L&apos;audit qui mesure simultanément votre visibilité<br />
        sur <strong style={{ color: 'var(--color-text)' }}>Google</strong> et dans les <strong style={{ color: 'var(--color-text)' }}>moteurs IA</strong><br />
        (ChatGPT, Perplexity, Claude, Gemini, Copilot).
      </p>
      <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap' as const }}>
        {[
          { val: '11', unit: 'ph', lbl: 'Dimensions' },
          { val: '100', unit: 'pt', lbl: 'Score' },
          { val: '<10', unit: 'min', lbl: 'Durée' },
          { val: 'WL', unit: '', lbl: 'White-label' },
        ].map(({ val, unit, lbl }) => (
          <div key={lbl} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <div style={{ fontFamily: 'var(--font-display), sans-serif', fontWeight: 900, fontSize: '1.8rem', color: 'var(--color-text)' }}>
              {val}<span style={{ color: IND }}>{unit}</span>
            </div>
            <div style={{ fontSize: '0.6rem', color: 'var(--color-muted)', textTransform: 'uppercase' as const, letterSpacing: '0.1em' }}>{lbl}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── SLIDE 2 : LE CONTEXTE ────────────────────────────────────────────────────
function Slide2() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100%', padding: '48px clamp(24px, 6vw, 80px)' }}>
      <Eyebrow>01 — Le contexte</Eyebrow>
      <Heading>Le trafic organique<br />ne suffit plus.</Heading>
      <Lead>Le marché a basculé. Les outils SEO classiques n&apos;ont pas suivi.</Lead>
      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' as const, marginTop: 40 }}>
        <StatBlock color={ORG} value="40 %" label="des requêtes d'information démarrent sur une IA, pas sur Google" />
        <StatBlock color={PUR} value="3,6×" label="plus de crawls GPTBot vs Googlebot sur les sites analysés" />
        <StatBlock color={AMB} value="76 %" label="des citations IA portent sur des contenus de moins de 30 jours" />
        <StatBlock color={PNK} value="3–6m" label="demi-vie d'une citation IA — plus courte qu'en SEO classique" />
      </div>
    </div>
  )
}

// ─── SLIDE 3 : LA DOUBLE PEINE ────────────────────────────────────────────────
function Slide3() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100%', padding: '48px clamp(24px, 6vw, 80px)' }}>
      <Eyebrow>02 — Le problème</Eyebrow>
      <Heading>La double peine<br />de vos clients.</Heading>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10, marginTop: 8 }}>
        <Card color={PNK} label="Problème 1" title="Trafic Google en baisse" desc="Les IA répondent directement aux questions sans renvoyer vers votre site. La recherche zéro-clic est la norme en 2026." />
        <Card color={AMB} label="Problème 2" title="Invisible aux IA" desc="Si votre site n'est pas correctement structuré et cité, ChatGPT et ses pairs ne vous mentionneront jamais dans leurs réponses." />
        <Card color={ORG} label="Problème 3" title="Aucun outil pour mesurer ça" desc="Semrush mesure les positions Google. Ahrefs mesure les backlinks. Personne ne mesure si Perplexity vous cite — ni pourquoi." />
      </div>
    </div>
  )
}

// ─── SLIDE 4 : LA SOLUTION ────────────────────────────────────────────────────
function Slide4() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100%', padding: '48px clamp(24px, 6vw, 80px)' }}>
      <Eyebrow>03 — La solution</Eyebrow>
      <Heading>Un audit.<br />Deux dimensions.</Heading>
      <Lead>SEO-GEO est le premier outil d&apos;audit qui couvre simultanément les deux types de visibilité qui comptent en 2026.</Lead>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 10, marginTop: 24, maxWidth: 720 }}>
        <div style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 8, padding: 28, position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: IND }} />
          <div style={{ fontSize: '1.6rem', marginBottom: 14 }}>🔍</div>
          <div style={{ fontSize: '0.58rem', color: IND, textTransform: 'uppercase' as const, letterSpacing: '0.15em', marginBottom: 6 }}>SEO — Visibilité Moteurs</div>
          <div style={{ fontFamily: 'var(--font-display), sans-serif', fontWeight: 700, fontSize: '0.9rem', color: 'var(--color-text)', marginBottom: 7 }}>Google, Bing, DuckDuckGo</div>
          <div style={{ fontSize: '0.68rem', color: 'var(--color-muted)', lineHeight: 1.65 }}>Fondations, données structurées, performance, contenus, autorité de domaine.</div>
        </div>
        <div style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 8, padding: 28, position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: VIO }} />
          <div style={{ fontSize: '1.6rem', marginBottom: 14 }}>🤖</div>
          <div style={{ fontSize: '0.58rem', color: VIO, textTransform: 'uppercase' as const, letterSpacing: '0.15em', marginBottom: 6 }}>GEO — Visibilité IA</div>
          <div style={{ fontFamily: 'var(--font-display), sans-serif', fontWeight: 700, fontSize: '0.9rem', color: 'var(--color-text)', marginBottom: 7 }}>ChatGPT, Perplexity, Claude…</div>
          <div style={{ fontSize: '0.68rem', color: 'var(--color-muted)', lineHeight: 1.65 }}>Signaux de citation, balisage IA, entités reconnues, fraîcheur des contenus. La nouvelle frontière.</div>
        </div>
      </div>
    </div>
  )
}

// ─── SLIDE 5 : 11 DIMENSIONS ──────────────────────────────────────────────────
function Slide5() {
  const phases = [
    { n: '01', name: 'Fondations techniques', pts: '12 pts', sub: 'URLs, HTTPS, robots.txt, sitemap, redirections', color: IND },
    { n: '02', name: 'Données structurées', pts: '15 pts', sub: 'Schema.org, JSON-LD, FAQ, Articles, Produits', color: VIO },
    { n: '03', name: 'Visibilité IA (GEO) ★', pts: '18 pts', sub: 'Tests prompts ChatGPT/Perplexity, llms.txt, citations IA', color: PUR },
    { n: '04', name: 'Entités & notoriété', pts: '10 pts', sub: 'Knowledge Graph, Wikidata, mentions tierces', color: CYN },
    { n: '05', name: 'E-E-A-T', pts: '10 pts', sub: 'Expertise, Autorité, Confiance — +132 % visibilité IA si présent', color: GRN },
    { n: '06', name: 'Fraîcheur', pts: '8 pts', sub: '76 % des citations IA = contenus < 30 jours', color: AMB },
    { n: '07', name: 'International', pts: '8 pts', sub: 'Hreflang, multilingue, adaptation géographique', color: ORG },
    { n: '08', name: 'Performance web', pts: '8 pts', sub: 'Core Web Vitals, INP, LCP, CLS', color: SKY },
    { n: '09', name: 'Couverture thématique', pts: '6 pts', sub: 'Pillar pages, clusters de sujets, maillage interne', color: EME },
    { n: '10', name: 'Erreurs communes', pts: '5 pts', sub: 'Cannibalisation, contenu dupliqué, thin content', color: PNK },
    { n: '11', name: 'Synthèse', pts: 'Plan d\'action', sub: '5 recommandations priorisées bénéfice / effort', color: '#8b5cf6' },
  ]
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '36px clamp(24px, 6vw, 80px) 24px', overflowY: 'auto' }}>
      <Eyebrow>04 — L&apos;audit</Eyebrow>
      <Heading style={{ fontSize: 'clamp(1.4rem, 2.5vw, 1.8rem)', marginBottom: 16 }}>11 dimensions d&apos;analyse.</Heading>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 8 }}>
        {phases.map(p => <PhaseItem key={p.n} {...p} />)}
      </div>
    </div>
  )
}

// ─── SLIDE 6 : GEO EN DÉTAIL ──────────────────────────────────────────────────
function Slide6() {
  const items = [
    { icon: '🤖', title: 'Tests de prompts réels', desc: 'On demande à ChatGPT, Perplexity, Claude et Gemini de répondre aux requêtes de votre domaine. Apparaissez-vous dans les réponses ?' },
    { icon: '📄', title: 'Fichier llms.txt', desc: "L'équivalent du robots.txt pour les IA. Présent ? Correctement configuré ? Les IA savent-elles quoi prendre de votre site ?" },
    { icon: '🔗', title: 'Analyse des citations', desc: 'Votre marque est-elle citée par d\'autres sources que les IA utilisent pour construire leurs réponses ? Wikidata, Wikipedia, presse ?' },
    { icon: '⏰', title: 'Fraîcheur des signaux', desc: 'Les IA privilégient les sources récentes. Vos dernières publications ont-elles moins de 30 jours ?' },
  ]
  return (
    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100%', padding: '48px clamp(24px, 6vw, 80px)' }}>
      <Eyebrow>05 — La dimension GEO</Eyebrow>
      <Heading>Le signal le plus important.<br /><span style={{ color: VIO }}>18 pts sur 100.</span></Heading>
      <div style={{ display: 'flex', gap: 48, alignItems: 'flex-start', marginTop: 8 }}>
        <div style={{ fontFamily: 'var(--font-display), sans-serif', fontWeight: 900, fontSize: 'clamp(4rem, 8vw, 7rem)', lineHeight: 1, color: VIO, opacity: 0.15, flexShrink: 0, letterSpacing: '-0.05em' }}>18</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: 'var(--font-display), sans-serif', fontWeight: 900, fontSize: '2rem', color: VIO, marginBottom: 16, lineHeight: 1.1 }}>Visibilité IA</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {items.map(({ icon, title, desc }) => (
              <div key={title} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '12px 16px', background: 'rgba(229,90,34,0.05)', border: '1px solid rgba(229,90,34,0.15)', borderRadius: 6, fontSize: '0.71rem', color: 'var(--color-muted)', lineHeight: 1.6 }}>
                <span style={{ fontSize: '1rem', flexShrink: 0 }}>{icon}</span>
                <div><strong style={{ color: 'var(--color-text)' }}>{title}</strong> — {desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── SLIDE 7 : LE RAPPORT ─────────────────────────────────────────────────────
function Slide7() {
  const features = [
    { icon: '🌐', title: 'Lien partageable', desc: 'URL unique tokenisée. Le client clique, il voit.' },
    { icon: '📄', title: 'Export PDF', desc: 'Qualité impression, idéal pour réunions client.' },
    { icon: '🏭', title: 'White-label natif', desc: 'Votre logo. Zéro mention SEO-GEO.' },
    { icon: '🇫🇷', title: 'Français, sans jargon', desc: 'Compris par un décideur non-technique.' },
    { icon: '🎯', title: 'Plan d\'action priorisé', desc: 'Les 5 actions les plus impactantes. Bénéfice / effort.' },
  ]
  return (
    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100%', padding: '48px clamp(24px, 6vw, 80px)' }}>
      <Eyebrow>06 — Le livrable</Eyebrow>
      <Heading>Un rapport client-ready.<br />En moins de 10 minutes.</Heading>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20, marginTop: 8 }}>
        <div style={{ background: 'linear-gradient(135deg, rgba(255,107,53,0.12), rgba(229,90,34,0.05))', border: `1px solid rgba(255,107,53,0.3)`, borderRadius: 12, padding: 32, display: 'flex', flexDirection: 'column', gap: 16, justifyContent: 'center' }}>
          <div>
            <div style={{ fontFamily: 'var(--font-display), sans-serif', fontWeight: 900, fontSize: '5rem', color: IND, lineHeight: 1 }}>74</div>
            <div style={{ fontSize: '0.62rem', color: 'var(--color-muted)', textTransform: 'uppercase' as const, letterSpacing: '0.15em' }}>Score SEO-GEO / 100</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {[
              { label: '01 Fondations techniques', score: '10/12', color: GRN },
              { label: '03 Visibilité IA (GEO) ★', score: '6/18', color: PNK },
              { label: '11 Synthèse', score: '5 actions', color: '#8b5cf6' },
            ].map(({ label, score, color }) => (
              <div key={label} style={{ fontSize: '0.68rem', color: 'var(--color-muted)', display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid var(--color-border)' }}>
                <span>{label}</span><span style={{ color }}>{score}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {features.map(({ icon, title, desc }) => (
            <div key={title} style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: '0.72rem', color: 'var(--color-muted)', padding: '10px 14px', background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 7 }}>
              <span style={{ fontSize: '1.1rem', width: 28, textAlign: 'center' as const }}>{icon}</span>
              <div><strong style={{ color: 'var(--color-text)' }}>{title}</strong><br /><span style={{ fontSize: '0.62rem' }}>{desc}</span></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── SLIDE 8 : INPUT MODES ────────────────────────────────────────────────────
function Slide8() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100%', padding: '48px clamp(24px, 6vw, 80px)' }}>
      <Eyebrow>07 — Modes d&apos;entrée</Eyebrow>
      <Heading>URL live ou code source.<br />Votre choix.</Heading>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20, marginTop: 16 }}>
        {[
          {
            color: IND, icon: '🌍', name: 'URL Live', tag: 'V1 — Disponible', tagStyle: { background: 'rgba(57,211,83,0.1)', border: '1px solid rgba(57,211,83,0.25)', color: GRN },
            desc: "Entrez l'URL d'un site en production. L'audit crawle le site en temps réel, analyse les contenus visibles, les performances, les signaux IA.\n\nIdéal pour les audits clients existants et les suivis trimestriels.",
          },
          {
            color: VIO, icon: '📦', name: 'Code source', tag: 'V2 — Prochainement', tagStyle: { background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.25)', color: AMB },
            desc: "Uploadez un ZIP ou connectez un repo GitHub. L'audit analyse le code avant que le site soit en ligne — audit pre-launch.\n\nIdéal pour les studios dev qui livrent un site optimisé dès le départ.",
          },
        ].map(({ color, icon, name, tag, tagStyle, desc }) => (
          <div key={name} style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 12, padding: 28, position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, background: color }} />
            <div style={{ fontSize: '2rem', marginBottom: 14 }}>{icon}</div>
            <div style={{ fontFamily: 'var(--font-display), sans-serif', fontWeight: 800, fontSize: '1.1rem', color, marginBottom: 10 }}>{name}</div>
            <div style={{ fontSize: '0.71rem', color: 'var(--color-muted)', lineHeight: 1.7, marginBottom: 14, whiteSpace: 'pre-line' as const }}>{desc}</div>
            <span style={{ display: 'inline-block', fontSize: '0.58rem', padding: '2px 9px', borderRadius: 3, ...tagStyle }}>{tag}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── SLIDE 9 : POUR QUI ───────────────────────────────────────────────────────
function Slide9() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100%', padding: '48px clamp(24px, 6vw, 80px)' }}>
      <Eyebrow>08 — Pour qui ?</Eyebrow>
      <Heading>3 personas.<br />Un même outil.</Heading>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginTop: 8 }}>
        <PersonaCard color={IND} emoji="🏢" name="Agence SEO" desc="5–30 personnes. Veut ajouter une offre GEO à son retainer sans recruter un expert IA." need="«\u00a0Mes clients demandent pourquoi ils n'apparaissent pas dans ChatGPT.\u00a0»" />
        <PersonaCard color={VIO} emoji="👔" name="Dir. marketing B2B" desc="Son trafic organique stagne. Veut comprendre pourquoi ses concurrents apparaissent dans les IA." need="«\u00a0Mon site est bien ranké sur Google mais invisible sur Perplexity.\u00a0»" />
        <PersonaCard color={CYN} emoji="💻" name="Studio dev / Freelance" desc="Développe des sites clients. Veut livrer un produit optimisé dès le départ." need="«\u00a0Le rapport d'audit est devenu un argument de vente différenciant.\u00a0»" />
      </div>
    </div>
  )
}

// ─── SLIDE 10 : PACKAGES ──────────────────────────────────────────────────────
function Slide10() {
  const rows = [
    { name: 'Tripwire Audit', sub: '→ 35 % conversion retainer', price: '1 500–3 500 €', unit: 'one-shot', livrable: 'Audit 11 dimensions + debrief 1h', duree: '3–5 jours' },
    { name: 'Retainer Starter', price: '2 500–3 500 €', unit: '/mois', livrable: 'Audit trimestriel + refresh mensuel', duree: '3 mois min' },
    { name: 'Retainer Growth', price: '5 000–7 500 €', unit: '/mois', livrable: 'Starter + pillar content + entity building', duree: '6 mois min' },
    { name: 'Retainer Enterprise', price: '10 000–15 000 €', unit: '/mois', livrable: 'Growth + content prod + link building + conseil', duree: '12 mois min' },
    { name: 'SEO+GEO Add-on', price: '+25 %', unit: 'sur retainer existant', livrable: 'Layer GEO greffé sur retainer SEO actuel', duree: 'Aligné' },
    { name: 'White-label Delivery', price: '-40–60 %', unit: 'wholesale', livrable: "Livraison sous la marque de l'agence partenaire", duree: 'Variable' },
  ]
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '36px clamp(24px, 6vw, 80px) 24px', overflowY: 'auto' }}>
      <Eyebrow>09 — Les offres</Eyebrow>
      <Heading style={{ fontSize: 'clamp(1.4rem, 2.5vw, 1.8rem)', marginBottom: 8 }}>Tripwire, Retainer, White-label.</Heading>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.72rem' }}>
        <thead>
          <tr>
            {['Offre', 'Prix', 'Livrable', 'Durée'].map(h => (
              <th key={h} style={{ textAlign: 'left' as const, fontSize: '0.58rem', color: 'var(--color-muted)', textTransform: 'uppercase' as const, letterSpacing: '0.12em', padding: '8px 14px', borderBottom: '1px solid var(--color-border)', fontWeight: 400 }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.name}>
              <td style={{ padding: '12px 14px', borderBottom: i < rows.length - 1 ? '1px solid var(--color-border)' : 'none', verticalAlign: 'top' as const }}>
                <div style={{ fontFamily: 'var(--font-display), sans-serif', fontWeight: 700, color: PUR, fontSize: '0.8rem' }}>{r.name}</div>
                {r.sub && <div style={{ fontSize: '0.6rem', color: 'var(--color-muted)' }}>{r.sub}</div>}
              </td>
              <td style={{ padding: '12px 14px', borderBottom: i < rows.length - 1 ? '1px solid var(--color-border)' : 'none', verticalAlign: 'top' as const }}>
                <div style={{ fontFamily: 'var(--font-display), sans-serif', fontWeight: 700, fontSize: '0.85rem', color: 'var(--color-text)', whiteSpace: 'nowrap' as const }}>{r.price}</div>
                <div style={{ fontSize: '0.6rem', color: 'var(--color-muted)' }}>{r.unit}</div>
              </td>
              <td style={{ padding: '12px 14px', borderBottom: i < rows.length - 1 ? '1px solid var(--color-border)' : 'none', verticalAlign: 'top' as const, color: 'var(--color-muted)' }}>{r.livrable}</td>
              <td style={{ padding: '12px 14px', borderBottom: i < rows.length - 1 ? '1px solid var(--color-border)' : 'none', verticalAlign: 'top' as const, color: 'var(--color-muted)', whiteSpace: 'nowrap' as const }}>{r.duree}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── SLIDE 11 : ROADMAP ───────────────────────────────────────────────────────
function Slide11() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100%', padding: '48px clamp(24px, 6vw, 80px)' }}>
      <Eyebrow>10 — Roadmap</Eyebrow>
      <Heading>Agency tool V1.<br />SaaS public V2.</Heading>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20, marginTop: 8 }}>
        {[
          { color: IND, label: 'Maintenant — V1', title: 'Agency Mode', items: ['Dashboard interne pour lancer les audits', 'Rapports white-label livrés au client', 'Audit sur URL live', 'Score 100 pts sur 11 dimensions', 'Pricing à la prestation'] },
          { color: VIO, label: 'Prochainement — V2', title: 'Self-serve SaaS', items: ['Signup public + onboarding automatisé', 'Dashboard client avec historique', 'Plans Free / Pro / Agence (Stripe)', 'Audit sur code source (ZIP + GitHub)', 'Tracking continu + alertes régression'] },
        ].map(({ color, label, title, items }) => (
          <div key={title} style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 10, padding: 26 }}>
            <div style={{ fontSize: '0.58rem', color, textTransform: 'uppercase' as const, letterSpacing: '0.15em', marginBottom: 8 }}>{label}</div>
            <div style={{ fontFamily: 'var(--font-display), sans-serif', fontWeight: 900, fontSize: '1.4rem', marginBottom: 16, color: 'var(--color-text)' }}>{title}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {items.map(it => (
                <div key={it} style={{ fontSize: '0.68rem', color: 'var(--color-muted)', paddingLeft: 14, position: 'relative', lineHeight: 1.5 }}>
                  <span style={{ position: 'absolute', left: 0, color, fontSize: '0.6rem' }}>→</span>
                  {it}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 20, marginTop: 16, flexWrap: 'wrap' as const }}>
        <StatBlock color={IND} value="10+ audits" label="livrés en 90 jours" />
        <StatBlock color={VIO} value="3+ retainers" label="conversions tripwire" />
        <StatBlock color={GRN} value="4.3/5" label="CSAT rapport minimum" />
      </div>
    </div>
  )
}

// ─── SLIDE 12 : CTA ───────────────────────────────────────────────────────────
function Slide12({ isAuthenticated }: { isAuthenticated: boolean }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', height: '100%', padding: '48px clamp(24px, 6vw, 80px)' }}>
      <div style={{ position: 'absolute', width: 700, height: 400, background: 'radial-gradient(ellipse, rgba(229,90,34,0.1) 0%, transparent 70%)', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', pointerEvents: 'none' }} />
      <Eyebrow>Prochaine étape</Eyebrow>
      <div style={{ fontFamily: 'var(--font-display), sans-serif', fontWeight: 900, fontSize: 'clamp(2rem, 5vw, 4rem)', lineHeight: 1.05, letterSpacing: '-0.03em', marginBottom: 20, color: 'var(--color-text)' }}>
        Prêt à lancer<br />
        le <span style={{ color: IND }}>premier</span><br />
        <span style={{ color: VIO }}>audit</span> ?
      </div>
      <Lead style={{ textAlign: 'center', maxWidth: 480 }}>
        Entrez une URL. Obtenez un rapport complet<br />
        en moins de 10 minutes. White-label, en français.
      </Lead>
      <div style={{ display: 'flex', gap: 16, marginTop: 28, flexWrap: 'wrap' as const, justifyContent: 'center' }}>
        {isAuthenticated ? (
          <Link href="/dashboard/audits/new" style={{ background: `rgba(255,107,53,0.15)`, border: `1px solid rgba(255,107,53,0.4)`, borderRadius: 8, padding: '12px 24px', fontFamily: 'var(--font-display), sans-serif', fontWeight: 700, fontSize: '0.88rem', color: IND, textDecoration: 'none' }}>
            🏆 Lancer un audit URL
          </Link>
        ) : (
          <>
            <Link href="/login" style={{ background: `linear-gradient(135deg, ${IND}, ${VIO})`, borderRadius: 8, padding: '12px 28px', fontFamily: 'var(--font-display), sans-serif', fontWeight: 700, fontSize: '0.88rem', color: '#fff', textDecoration: 'none', boxShadow: '0 4px 20px rgba(255,107,53,0.35)' }}>
              🚀 Créer un compte gratuit
            </Link>
            <Link href="/login" style={{ background: `rgba(229,90,34,0.1)`, border: `1px solid rgba(229,90,34,0.3)`, borderRadius: 8, padding: '12px 24px', fontFamily: 'var(--font-display), sans-serif', fontWeight: 700, fontSize: '0.88rem', color: VIO, textDecoration: 'none' }}>
              Se connecter →
            </Link>
          </>
        )}
      </div>
    </div>
  )
}

// ─── COMPOSANT PRINCIPAL ──────────────────────────────────────────────────────
export function GuideDeck() {
  const { isAuthenticated, loading } = useAuth()
  const [current, setCurrent] = useState(1)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  const goTo = useCallback((n: number) => {
    setCurrent(Math.max(1, Math.min(TOTAL, n)))
  }, [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') goTo(current + 1)
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') goTo(current - 1)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [current, goTo])

  const showCTA = mounted && !loading && !isAuthenticated
  const showBack = mounted && !loading && isAuthenticated
  const topOffset = showCTA ? 44 : 0

  const slides = [
    <Slide1 key={1} />,
    <Slide2 key={2} />,
    <Slide3 key={3} />,
    <Slide4 key={4} />,
    <Slide5 key={5} />,
    <Slide6 key={6} />,
    <Slide7 key={7} />,
    <Slide8 key={8} />,
    <Slide9 key={9} />,
    <Slide10 key={10} />,
    <Slide11 key={11} />,
    <Slide12 key={12} isAuthenticated={isAuthenticated} />,
  ]

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'var(--color-bg)',
      color: 'var(--color-text)',
      fontFamily: 'var(--font-sans), monospace',
      fontSize: 14,
      lineHeight: 1.6,
    }}>
      {/* Grille de fond subtile */}
      <div aria-hidden style={{
        position: 'absolute', inset: 0,
        backgroundImage: `
          linear-gradient(color-mix(in srgb, ${IND} 2.5%, transparent) 1px, transparent 1px),
          linear-gradient(90deg, color-mix(in srgb, ${IND} 2.5%, transparent) 1px, transparent 1px)
        `,
        backgroundSize: '48px 48px',
        pointerEvents: 'none',
        zIndex: 0,
      }} />

      {/* Bandeau CTA (non-connectés) */}
      {showCTA && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100,
          background: `linear-gradient(90deg, ${IND}, ${VIO})`,
          color: '#fff', height: 44,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16,
          fontSize: '0.8rem', fontFamily: 'var(--font-display), sans-serif', fontWeight: 600,
        }}>
          <span style={{ opacity: 0.9 }}>Analysez votre visibilité dans Google et les IA en moins de 10 minutes.</span>
          <Link href="/login" style={{
            background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.35)',
            borderRadius: 6, padding: '4px 16px', color: '#fff', textDecoration: 'none',
            fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.03em',
          }}>
            Créer un compte →
          </Link>
        </div>
      )}

      {/* Bouton retour (connectés) */}
      {showBack && (
        <Link href="/dashboard" style={{
          position: 'absolute', top: 16, left: 20, zIndex: 100,
          display: 'flex', alignItems: 'center', gap: 6,
          color: 'var(--color-muted)', textDecoration: 'none',
          fontSize: '0.75rem', fontFamily: 'var(--font-sans), monospace',
          padding: '6px 12px',
          background: 'var(--color-card)',
          border: '1px solid var(--color-border)',
          borderRadius: 20,
          transition: 'color 0.15s',
        }}>
          ← Tableau de bord
        </Link>
      )}

      {/* Deck */}
      <div style={{ position: 'absolute', inset: 0, top: topOffset, zIndex: 1 }}>
        {slides.map((slide, i) => {
          const n = i + 1
          const active = n === current
          return (
            <div
              key={n}
              aria-hidden={!active}
              style={{
                position: 'absolute', inset: 0,
                opacity: active ? 1 : 0,
                pointerEvents: active ? 'all' : 'none',
                transition: 'opacity 0.4s cubic-bezier(0.4,0,0.2,1)',
              }}
            >
              {slide}
            </div>
          )
        })}
      </div>

      {/* Barre de navigation */}
      <div style={{
        position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
        display: 'flex', alignItems: 'center', gap: 16,
        background: 'var(--color-surface)', border: '1px solid var(--color-border)',
        borderRadius: 999, padding: '8px 20px', zIndex: 100,
        boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
      }}>
        <button
          onClick={() => goTo(current - 1)}
          disabled={current === 1}
          aria-label="Slide précédente"
          style={{
            background: 'none', border: '1px solid var(--color-border)',
            color: 'var(--color-muted)', width: 28, height: 28, borderRadius: '50%',
            cursor: current === 1 ? 'not-allowed' : 'pointer',
            opacity: current === 1 ? 0.2 : 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '0.75rem', transition: 'all 0.15s',
          }}
        >
          ←
        </button>

        <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
          {Array.from({ length: TOTAL }, (_, i) => i + 1).map(n => (
            <button
              key={n}
              onClick={() => goTo(n)}
              aria-label={`Aller à la slide ${n}`}
              style={{
                width: n === current ? 16 : 5,
                height: 5,
                borderRadius: n === current ? 3 : '50%',
                background: n === current ? IND : 'var(--color-border)',
                border: 'none', cursor: 'pointer', transition: 'all 0.2s', padding: 0,
              }}
            />
          ))}
        </div>

        <span style={{ fontSize: '0.6rem', color: 'var(--color-muted)', minWidth: 36, textAlign: 'center' as const }}>
          {current} / {TOTAL}
        </span>

        <button
          onClick={() => goTo(current + 1)}
          disabled={current === TOTAL}
          aria-label="Slide suivante"
          style={{
            background: 'none', border: '1px solid var(--color-border)',
            color: 'var(--color-muted)', width: 28, height: 28, borderRadius: '50%',
            cursor: current === TOTAL ? 'not-allowed' : 'pointer',
            opacity: current === TOTAL ? 0.2 : 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '0.75rem', transition: 'all 0.15s',
          }}
        >
          →
        </button>
      </div>
    </div>
  )
}
