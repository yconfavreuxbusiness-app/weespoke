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
  { id: 'mvp', label: 'MVP', emoji: '🧪' },
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

      if (first?.screen && first?.mvp && first?.v1) {
        // MVP/V1 scope table
        return (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr>
                  <th style={{ padding: '10px 14px', background: 'var(--surface-2)', border: '1px solid var(--border)', textAlign: 'left', fontWeight: '700', fontSize: '12px', color: 'var(--text-muted)', width: '16%', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Écran</th>
                  <th style={{ padding: '10px 14px', background: '#EEF4FF', border: '1px solid var(--border)', textAlign: 'left', fontWeight: '700', fontSize: '12px', color: '#1D6AE5', width: '42%', textTransform: 'uppercase', letterSpacing: '0.05em' }}>🧪 MVP</th>
                  <th style={{ padding: '10px 14px', background: '#ECFDF5', border: '1px solid var(--border)', textAlign: 'left', fontWeight: '700', fontSize: '12px', color: '#059669', width: '42%', textTransform: 'uppercase', letterSpacing: '0.05em' }}>🚀 V1</th>
                </tr>
              </thead>
              <tbody>
                {parsed.map((row: any, i: number) => (
                  <tr key={i} style={{ background: i % 2 === 0 ? 'var(--surface)' : 'var(--surface-2)' }}>
                    <td style={{ padding: '12px 14px', border: '1px solid var(--border)', fontWeight: '600', fontSize: '13px', verticalAlign: 'top' }}>{row.screen}</td>
                    <td style={{ padding: '12px 14px', border: '1px solid var(--border)', verticalAlign: 'top' }}>
                      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {row.mvp.map((item: string, j: number) => (
                          <li key={j} style={{ display: 'flex', gap: '6px', color: item.startsWith('❌') ? '#DC2626' : 'var(--text-2)', fontSize: '12px', lineHeight: 1.4 }}>
                            {!item.startsWith('❌') && <span style={{ color: '#1D6AE5', flexShrink: 0 }}>·</span>}
                            {item}
                          </li>
                        ))}
                      </ul>
                    </td>
                    <td style={{ padding: '12px 14px', border: '1px solid var(--border)', verticalAlign: 'top' }}>
                      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {row.v1.map((item: string, j: number) => (
                          <li key={j} style={{ display: 'flex', gap: '6px', color: 'var(--text-2)', fontSize: '12px', lineHeight: 1.4 }}>
                            <span style={{ color: '#059669', flexShrink: 0 }}>·</span>
                            {item}
                          </li>
                        ))}
                      </ul>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      }

      if (first?.cat && first?.items) {
        // Scope sections
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {parsed.map((group: any, i: number) => (
              <div key={i} style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden' }}>
                <div style={{ padding: '8px 12px', background: 'var(--border)', fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  {group.cat}
                </div>
                <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {group.items.map((item: string, j: number) => (
                    <div key={j} style={{ display: 'flex', gap: '8px', fontSize: '13px', color: 'var(--text-2)' }}>
                      <span style={{ color: 'var(--accent)', flexShrink: 0 }}>•</span>
                      {item}
                    </div>
                  ))}
                </div>
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
