'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { User } from '@/types'
import { CATEGORIES } from '@/lib/constants'
import { Plus, X, ExternalLink, FileText, Image, Link as LinkIcon, Trash2 } from 'lucide-react'
import { Modal } from '@/components/Modal'

type ResourceType = 'link' | 'document' | 'asset'

interface Resource {
  id: string
  title: string
  description?: string
  url: string
  type: ResourceType
  category: string
  added_by?: string
  created_at: string
  adder?: { name: string; avatar_color: string }
}

const TYPE_CONFIG: Record<ResourceType, { label: string; icon: any; color: string; bg: string }> = {
  link:     { label: 'Lien',     icon: LinkIcon,  color: '#1D6AE5', bg: '#EEF4FF' },
  document: { label: 'Document', icon: FileText,  color: '#7C3AED', bg: '#F5F3FF' },
  asset:    { label: 'Asset',    icon: Image,     color: '#059669', bg: '#ECFDF5' },
}

function getDomain(url: string) {
  try { return new URL(url).hostname.replace('www.', '') } catch { return url }
}

function getFavicon(url: string) {
  try { return `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}&sz=32` } catch { return null }
}

export default function ResourcesPage() {
  const [user, setUser] = useState<User | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [resources, setResources] = useState<Resource[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [filterType, setFilterType] = useState<string>('all')
  const [filterCat, setFilterCat] = useState<string>('all')
  const [form, setForm] = useState({
    title: '', description: '', url: '',
    type: 'link' as ResourceType,
    category: 'Dev',
  })

  useEffect(() => {
    const stored = localStorage.getItem('ws_user')
    if (stored) setUser(JSON.parse(stored))
  }, [])

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    const [{ data: r }, { data: u }] = await Promise.all([
      supabase.from('resources').select('*, adder:added_by(name, avatar_color)').order('created_at', { ascending: false }),
      supabase.from('users').select('*')
    ])
    if (r) setResources(r as any)
    if (u) setUsers(u)
    setLoading(false)
  }

  const addResource = async () => {
    if (!user || !form.title.trim() || !form.url.trim()) return
    const { data } = await supabase.from('resources').insert({
      title: form.title,
      description: form.description || null,
      url: form.url.startsWith('http') ? form.url : `https://${form.url}`,
      type: form.type,
      category: form.category,
      added_by: user.id,
    }).select('*, adder:added_by(name, avatar_color)').single()
    if (data) setResources(prev => [data as any, ...prev])
    setShowModal(false)
    setForm({ title: '', description: '', url: '', type: 'link', category: 'Dev' })
  }

  const deleteResource = async (id: string) => {
    await supabase.from('resources').delete().eq('id', id)
    setResources(prev => prev.filter(r => r.id !== id))
  }

  const filtered = resources.filter(r => {
    if (filterType !== 'all' && r.type !== filterType) return false
    if (filterCat !== 'all' && r.category !== filterCat) return false
    return true
  })

  // Group by type
  const groups: ResourceType[] = ['link', 'document', 'asset']

  if (!user) return null

  return (
    <div className="animate-in">
      <div className="page-header">
        <div>
          <div className="page-title">Ressources</div>
          <div className="page-sub">{resources.length} ressources · liens, docs et assets partagés</div>
        </div>
        <button onClick={() => setShowModal(true)} className="btn btn-primary">
          <Plus size={14} /> Ajouter
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: '4px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '6px', padding: '3px' }}>
          {['all', 'link', 'document', 'asset'].map(t => (
            <button key={t} onClick={() => setFilterType(t)}
              style={{
                padding: '4px 12px', borderRadius: '4px', border: 'none', cursor: 'pointer',
                fontSize: '12px', fontWeight: '500', fontFamily: 'var(--font)',
                background: filterType === t ? 'var(--accent)' : 'transparent',
                color: filterType === t ? 'white' : 'var(--text-muted)',
                transition: 'all 0.12s',
              }}>
              {t === 'all' ? 'Tout' : TYPE_CONFIG[t as ResourceType].label + 's'}
            </button>
          ))}
        </div>
        <select className="input" style={{ width: 'auto', fontSize: '12px', padding: '6px 10px' }}
          value={filterCat} onChange={e => setFilterCat(e.target.value)}>
          <option value="all">Toutes catégories</option>
          {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.value}</option>)}
        </select>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>Chargement...</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>📎</div>
          <div style={{ fontWeight: '600', marginBottom: '6px' }}>Aucune ressource</div>
          <div style={{ fontSize: '13px' }}>Ajoute des liens, documents et assets utiles à l'équipe.</div>
        </div>
      ) : (
        // Group by type if showing all, flat if filtered
        filterType !== 'all' ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '10px' }}>
            {filtered.map(r => <ResourceCard key={r.id} resource={r} onDelete={deleteResource} isAdmin={user.role === 'admin'} />)}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {groups.map(type => {
              const items = filtered.filter(r => r.type === type)
              if (items.length === 0) return null
              const cfg = TYPE_CONFIG[type]
              return (
                <div key={type}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <cfg.icon size={14} color={cfg.color} />
                    </div>
                    <span style={{ fontWeight: '600', fontSize: '14px' }}>{cfg.label}s</span>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{items.length}</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '10px' }}>
                    {items.map(r => <ResourceCard key={r.id} resource={r} onDelete={deleteResource} isAdmin={user.role === 'admin'} />)}
                  </div>
                </div>
              )
            })}
          </div>
        )
      )}

      {/* Modal */}
      {showModal && (
        <Modal onClose={() => setShowModal(false)}>
            <div className="modal-header">
              <div style={{ fontWeight: '600', fontSize: '15px' }}>Ajouter une ressource</div>
              <button onClick={() => setShowModal(false)} className="btn btn-ghost btn-icon"><X size={16} /></button>
            </div>

            <div className="modal-body">
              {/* Type selector */}
              <div className="field">
                <label className="label">Type</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {(Object.entries(TYPE_CONFIG) as [ResourceType, any][]).map(([t, cfg]) => (
                    <button key={t} onClick={() => setForm(p => ({ ...p, type: t }))}
                      style={{
                        flex: 1, padding: '8px', border: `2px solid ${form.type === t ? cfg.color : 'var(--border-dark)'}`,
                        borderRadius: '6px', background: form.type === t ? cfg.bg : 'var(--surface)',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        gap: '6px', transition: 'all 0.15s', fontFamily: 'var(--font)',
                        fontSize: '12px', fontWeight: '600',
                        color: form.type === t ? cfg.color : 'var(--text-muted)',
                      }}>
                      <cfg.icon size={13} />
                      {cfg.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="field">
                <label className="label">Titre *</label>
                <input className="input" placeholder="ex: Figma — Maquettes V3"
                  value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} autoFocus />
              </div>

              <div className="field">
                <label className="label">URL *</label>
                <input className="input" placeholder="https://..."
                  value={form.url} onChange={e => setForm(p => ({ ...p, url: e.target.value }))} />
              </div>

              <div className="field">
                <label className="label">Description</label>
                <input className="input" placeholder="À quoi ça sert ?"
                  value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
              </div>

              <div className="field">
                <label className="label">Catégorie</label>
                <select className="input" value={form.category}
                  onChange={e => setForm(p => ({ ...p, category: e.target.value }))}>
                  {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.value}</option>)}
                </select>
              </div>
            </div>

            <div className="modal-footer">
              <button onClick={() => setShowModal(false)} className="btn btn-secondary">Annuler</button>
              <button onClick={addResource} className="btn btn-primary"
                disabled={!form.title.trim() || !form.url.trim()}>
                Ajouter
              </button>
            </div>
        </Modal>
      )}
    </div>
  )
}

function ResourceCard({ resource: r, onDelete, isAdmin }: {
  resource: Resource
  onDelete: (id: string) => void
  isAdmin: boolean
}) {
  const cfg = TYPE_CONFIG[r.type]
  const cat = CATEGORIES.find(c => c.value === r.category)
  const favicon = r.type === 'link' ? getFavicon(r.url) : null
  const adder = (r as any).adder

  return (
    <div className="surface" style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px', transition: 'box-shadow 0.15s' }}
      onMouseEnter={e => (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-md)'}
      onMouseLeave={e => (e.currentTarget as HTMLElement).style.boxShadow = ''}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
          {favicon ? (
            <img src={favicon} width={16} height={16} style={{ flexShrink: 0, borderRadius: '3px' }} alt="" onError={e => { (e.target as HTMLElement).style.display = 'none' }} />
          ) : (
            <div style={{ width: '16px', height: '16px', borderRadius: '3px', background: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <cfg.icon size={10} color={cfg.color} />
            </div>
          )}
          <div style={{ fontWeight: '600', fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {r.title}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '4px', flexShrink: 0, marginLeft: '8px' }}>
          <a href={r.url} target="_blank" rel="noopener noreferrer"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '26px', height: '26px', borderRadius: '4px', color: 'var(--text-muted)', textDecoration: 'none' }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--surface-2)'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
            <ExternalLink size={13} />
          </a>
          {isAdmin && (
            <button onClick={() => onDelete(r.id)}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '26px', height: '26px', borderRadius: '4px', border: 'none', cursor: 'pointer', background: 'transparent', color: 'var(--text-dim)' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#FEE2E2'; (e.currentTarget as HTMLElement).style.color = '#DC2626' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--text-dim)' }}>
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </div>

      {r.description && (
        <div style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.4 }}>{r.description}</div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <span className="badge" style={{ background: cfg.bg, color: cfg.color, fontSize: '10px' }}>{cfg.label}</span>
          <span className="badge" style={{ background: cat?.bg, color: cat?.color, borderColor: cat?.border, fontSize: '10px' }}>{r.category}</span>
        </div>
        {r.type === 'link' && (
          <span style={{ fontSize: '11px', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
            {getDomain(r.url)}
          </span>
        )}
      </div>
    </div>
  )
}
