'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { User } from '@/types'
import { Edit2, Check, X, Copy, CheckCheck } from 'lucide-react'

interface WikiSection {
  id: string
  page: string
  section: string
  title: string
  content: string
  sort_order: number
  updated_at: string
}

const TABS = [
  { id: 'moods', label: 'Moods & Types', emoji: '🎭' },
  { id: 'cold_start', label: 'Cold Start', emoji: '❄️' },
  { id: 'scripts', label: 'Scripts Victor', emoji: '🎙️' },
  { id: 'spotscore', label: 'SpotScore', emoji: '⚡' },
  { id: 'mvp', label: 'MVP / V1', emoji: '🧪' },
]

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
      style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 8px', borderRadius: '4px', border: '1px solid var(--border-dark)', background: 'var(--surface)', cursor: 'pointer', fontSize: '11px', color: 'var(--text-muted)', transition: 'all 0.15s' }}
      title="Copier"
    >
      {copied ? <><CheckCheck size={11} color="#059669" /> Copié</> : <><Copy size={11} /> Copier</>}
    </button>
  )
}

function EditableSection({ section, isAdmin, onSave }: {
  section: WikiSection
  isAdmin: boolean
  onSave: (id: string, content: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(section.content)

  let parsed: any = null
  try { parsed = JSON.parse(section.content) } catch {}

  const renderContent = () => {
    if (!parsed) {
      // Plain text
      return (
        <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
          <p style={{ fontSize: '13px', lineHeight: 1.6, color: 'var(--text-2)', flex: 1, whiteSpace: 'pre-wrap' }}>{section.content}</p>
          <CopyButton text={section.content} />
        </div>
      )
    }

    if (Array.isArray(parsed)) {
      // Check type of first item
      const first = parsed[0]

      if (first?.name && first?.desc) {
        // Mood/type items
        return (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '8px' }}>
            {parsed.map((item: any, i: number) => (
              <div key={i} style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '6px', padding: '10px 12px' }}>
                <div style={{ fontWeight: '600', fontSize: '13px', marginBottom: '3px' }}>{item.name}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.4 }}>{item.desc}</div>
              </div>
            ))}
          </div>
        )
      }

      if (first?.obj && first?.rep) {
        // Objections
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {parsed.map((item: any, i: number) => (
              <div key={i} style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '6px', padding: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '6px' }}>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: '#DC2626' }}>"{item.obj}"</div>
                  <CopyButton text={item.rep} />
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text-2)', lineHeight: 1.5 }}>→ {item.rep}</div>
              </div>
            ))}
          </div>
        )
      }

      if (first?.bad && first?.good) {
        // Mots interdits
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {parsed.map((item: any, i: number) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 12px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '6px' }}>
                <span style={{ fontSize: '12px', color: '#DC2626', textDecoration: 'line-through', minWidth: '140px', fontFamily: 'var(--font-mono)' }}>{item.bad}</span>
                <span style={{ color: 'var(--text-dim)', fontSize: '12px' }}>→</span>
                <span style={{ fontSize: '12px', color: '#059669', fontFamily: 'var(--font-mono)' }}>{item.good}</span>
              </div>
            ))}
          </div>
        )
      }

      if (first?.id && first?.label && first?.target) {
        // Hypothèses
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {parsed.map((item: any, i: number) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '6px' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', fontWeight: '700', color: 'var(--accent)', minWidth: '28px' }}>{item.id}</span>
                <span style={{ fontSize: '13px', fontWeight: '500', flex: 1 }}>{item.label}</span>
                <span style={{ fontSize: '12px', color: '#059669', fontFamily: 'var(--font-mono)', background: '#ECFDF5', padding: '2px 8px', borderRadius: '4px' }}>{item.target}</span>
              </div>
            ))}
          </div>
        )
      }

      if (first?.code && first?.label) {
        // Frictions
        const colors: Record<string, string> = { F0: '#059669', F1: '#D97706', F2: '#EA580C', F3: '#DC2626' }
        return (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '8px' }}>
            {parsed.map((item: any, i: number) => (
              <div key={i} style={{ background: 'var(--surface-2)', border: `1px solid ${colors[item.code]}30`, borderLeft: `3px solid ${colors[item.code]}`, borderRadius: '6px', padding: '10px 12px' }}>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '4px' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: '700', color: colors[item.code], fontSize: '13px' }}>{item.code}</span>
                  <span style={{ fontWeight: '600', fontSize: '13px' }}>{item.label}</span>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.4 }}>{item.desc}</div>
              </div>
            ))}
          </div>
        )
      }

      if (first?.id && first?.condition) {
        // Scénarios
        const colors: Record<string, string> = { A: '#059669', B: '#D97706', C: '#1D6AE5', D: '#DC2626' }
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {parsed.map((item: any) => (
              <div key={item.id} style={{ background: 'var(--surface-2)', border: `1px solid ${colors[item.id]}30`, borderLeft: `3px solid ${colors[item.id]}`, borderRadius: '6px', padding: '12px' }}>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: '700', color: colors[item.id], fontSize: '12px' }}>SCÉNARIO {item.id}</span>
                  <span style={{ fontWeight: '600', fontSize: '13px' }}>{item.label}</span>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>Condition : {item.condition}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-2)' }}>→ {item.decision}</div>
              </div>
            ))}
          </div>
        )
      }

      if (first?.label && first?.detail) {
        // SpotScore détails
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {parsed.map((item: any, i: number) => (
              <div key={i} style={{ display: 'flex', gap: '12px', padding: '8px 12px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '6px' }}>
                <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--accent)', minWidth: '120px', flexShrink: 0 }}>{item.label}</span>
                <span style={{ fontSize: '12px', color: 'var(--text-2)', lineHeight: 1.5 }}>{item.detail}</span>
              </div>
            ))}
          </div>
        )
      }

      // Generic string array (rules)
      if (typeof first === 'string') {
        return (
          <ol style={{ display: 'flex', flexDirection: 'column', gap: '6px', paddingLeft: 0, listStyle: 'none' }}>
            {parsed.map((item: string, i: number) => (
              <li key={i} style={{ display: 'flex', gap: '10px', padding: '8px 12px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '13px', color: 'var(--text-2)', lineHeight: 1.5 }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', fontWeight: '700', color: 'var(--accent)', minWidth: '20px', paddingTop: '1px' }}>{i + 1}.</span>
                {item}
              </li>
            ))}
          </ol>
        )
      }
    }

    // Fallback plain
    return <p style={{ fontSize: '13px', lineHeight: 1.6, color: 'var(--text-2)' }}>{section.content}</p>
  }

  return (
    <div style={{ marginBottom: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <div style={{ fontWeight: '600', fontSize: '14px' }}>{section.title}</div>
        <div style={{ display: 'flex', gap: '6px' }}>
          {!editing && !parsed && <CopyButton text={section.content} />}
          {isAdmin && !editing && (
            <button onClick={() => setEditing(true)}
              className="btn btn-ghost btn-sm" style={{ fontSize: '11px' }}>
              <Edit2 size={11} /> Modifier
            </button>
          )}
          {editing && (
            <>
              <button onClick={() => { onSave(section.id, draft); setEditing(false) }} className="btn btn-sm btn-primary" style={{ fontSize: '11px' }}>
                <Check size={11} /> Sauvegarder
              </button>
              <button onClick={() => { setDraft(section.content); setEditing(false) }} className="btn btn-sm btn-secondary" style={{ fontSize: '11px' }}>
                <X size={11} /> Annuler
              </button>
            </>
          )}
        </div>
      </div>

      {editing ? (
        <textarea
          value={draft}
          onChange={e => setDraft(e.target.value)}
          className="input"
          style={{ minHeight: '160px', fontSize: '12px', fontFamily: 'var(--font-mono)', resize: 'vertical' }}
        />
      ) : (
        renderContent()
      )}
    </div>
  )
}

export default function WikiPage() {
  const [user, setUser] = useState<User | null>(null)
  const [activeTab, setActiveTab] = useState('moods')
  const [sections, setSections] = useState<WikiSection[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const stored = localStorage.getItem('ws_user')
    if (stored) setUser(JSON.parse(stored))
  }, [])

  useEffect(() => { loadSections() }, [])

  const loadSections = async () => {
    const { data } = await supabase.from('wiki_sections').select('*').order('sort_order')
    if (data) setSections(data)
    setLoading(false)
  }

  const saveSection = async (id: string, content: string) => {
    await supabase.from('wiki_sections').update({ content, updated_at: new Date().toISOString() }).eq('id', id)
    setSections(prev => prev.map(s => s.id === id ? { ...s, content } : s))
  }

  const pageSections = sections.filter(s => s.page === activeTab)

  // SpotScore formula special rendering
  const formulaSection = sections.find(s => s.section === 'formula')

  if (!user) return null

  return (
    <div className="animate-in">
      <div className="page-header">
        <div>
          <div className="page-title">Wiki Weespoke</div>
          <div className="page-sub">Référentiel produit interne — éditable par Yohann</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs" style={{ marginBottom: '24px' }}>
        {TABS.map(tab => (
          <button key={tab.id} className={`tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}>
            {tab.emoji} {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>Chargement...</div>
      ) : pageSections.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
          Aucun contenu pour cet onglet. Lance la migration SQL pour initialiser.
        </div>
      ) : (
        <div>
          {/* SpotScore formula banner */}
          {activeTab === 'spotscore' && formulaSection && (
            <div style={{
              background: 'linear-gradient(135deg, #0A0A0A 0%, #1A1A2E 100%)',
              border: '1px solid #333',
              borderRadius: '10px',
              padding: '20px 24px',
              marginBottom: '24px',
              fontFamily: 'var(--font-mono)',
              fontSize: '15px',
              color: '#E0E0FF',
              letterSpacing: '0.02em',
            }}>
              <div style={{ fontSize: '11px', color: '#888', marginBottom: '8px', letterSpacing: '0.1em' }}>FORMULE OFFICIELLE v1.0</div>
              {formulaSection.content}
            </div>
          )}

          {pageSections
            .filter(s => s.section !== 'formula')
            .map(section => (
              <EditableSection
                key={section.id}
                section={section}
                isAdmin={user.role === 'admin'}
                onSave={saveSection}
              />
            ))}
        </div>
      )}
    </div>
  )
}
