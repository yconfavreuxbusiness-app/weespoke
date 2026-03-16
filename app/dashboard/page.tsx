'use client'
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Task, User } from '@/types'
import { CATEGORIES, STATUSES, URGENCIES } from '@/lib/constants'
import { countLeaves } from '@/lib/taskTree'
import { CheckSquare, Clock, AlertCircle, TrendingUp, ChevronRight, ChevronDown, Folder, FileText } from 'lucide-react'
import Link from 'next/link'

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    const stored = localStorage.getItem('ws_user')
    if (stored) setUser(JSON.parse(stored))
  }, [])

  useEffect(() => {
    Promise.all([
      supabase.from('tasks').select('*, creator:created_by(*)').order('created_at', { ascending: false }),
      supabase.from('users').select('*')
    ]).then(([{ data: t }, { data: u }]) => {
      if (t && u) {
        const userMap: Record<string, any> = {}
        u.forEach((usr: any) => { userMap[usr.id] = usr })
        const enriched = (t as any[]).map(task => ({
          ...task,
          assignees: (task.assigned_users || []).map((id: string) => userMap[id]).filter(Boolean)
        }))
        setTasks(enriched as any)
        setUsers(u)
      }
      setLoading(false)
    })
  }, [])

  const toggleExpand = useCallback((id: string) => {
    setExpandedIds(prev => {
      const next = new Set(Array.from(prev))
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }, [])

  // Build tree
  const allMap: Record<string, any> = {}
  tasks.forEach(t => { allMap[t.id] = { ...t, children: [] } })
  tasks.forEach(t => { if (t.parent_id && allMap[t.parent_id]) allMap[t.parent_id].children.push(allMap[t.id]) })
  const treeRoots = tasks.filter(t => !t.parent_id).map(t => allMap[t.id]).filter(Boolean)

  if (!user || loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: 'var(--text-muted)' }}>
      Chargement...
    </div>
  )

  const rootTasks = tasks.filter(t => !t.parent_id)
  const myTasks = tasks.filter(t => (t.assigned_users || []).includes(user.id) && !t.parent_id)
  const pendingVal = tasks.filter(t => !t.validated && t.created_by !== user.id)
  const urgent = tasks.filter(t => t.urgency === 'Urgent' && t.status !== 'Terminé' && !t.parent_id)
  const done = tasks.filter(t => t.status === 'Terminé' && !t.parent_id)

  const stats = [
    { label: 'Mes tâches', value: myTasks.filter(t => t.status !== 'Terminé').length, color: user.avatar_color, sub: 'actives' },
    ...(user.role === 'admin' ? [{ label: 'À valider', value: pendingVal.length, color: '#D97706', sub: 'en attente' }] : []),
    { label: 'Urgentes', value: urgent.length, color: '#DC2626', sub: 'non terminées' },
    { label: 'Terminées', value: done.length, color: '#059669', sub: 'au total' },
  ]

  return (
    <div className="animate-in">
      {/* Header */}
      <div className="page-header">
        <div>
          <div className="page-title">Bonjour, {user.name}</div>
          <div className="page-sub">
            {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
        </div>
        <Link href="/dashboard/tasks">
          <button className="btn btn-primary" style={{ fontSize: '13px' }}>
            <CheckSquare size={14} /> Voir les tâches
          </button>
        </Link>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '24px' }}>
        {stats.map((s, i) => (
          <div key={i} className="stat-card">
            <div className="stat-label">{s.label}</div>
            <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>{s.sub}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        {/* Par catégorie */}
        <div className="surface" style={{ padding: '16px' }}>
          <div className="section-header">Avancement par catégorie</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {CATEGORIES.map(cat => {
              const catTasks = rootTasks.filter(t => t.category === cat.value)
              const done = catTasks.filter(t => t.status === 'Terminé').length
              const pct = catTasks.length > 0 ? Math.round((done / catTasks.length) * 100) : 0
              return (
                <div key={cat.value}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                    <span className="badge" style={{ background: cat.bg, color: cat.color, borderColor: cat.border }}>
                      {cat.value}
                    </span>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                      {done}/{catTasks.length}
                    </span>
                  </div>
                  <div className="progress-track">
                    <div className="progress-fill" style={{ width: `${pct}%`, background: cat.color }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Équipe */}
        <div className="surface" style={{ padding: '16px' }}>
          <div className="section-header">Charge par membre</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {users.map(u => {
              const uTasks = tasks.filter(t => (t.assigned_users || []).includes(u.id) && !t.parent_id)
              const uDone = uTasks.filter(t => t.status === 'Terminé').length
              const pct = uTasks.length > 0 ? Math.round((uDone / uTasks.length) * 100) : 0
              return (
                <div key={u.id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                      <div className="avatar" style={{
                        width: '22px', height: '22px',
                        background: `${u.avatar_color}15`,
                        border: `1.5px solid ${u.avatar_color}40`,
                        fontSize: '10px', color: u.avatar_color,
                      }}>{u.name[0]}</div>
                      <span style={{ fontSize: '13px', fontWeight: '500' }}>{u.name}</span>
                    </div>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                      {uTasks.filter(t => t.status !== 'Terminé').length} actives
                    </span>
                  </div>
                  <div className="progress-track">
                    <div className="progress-fill" style={{ width: `${pct}%`, background: u.avatar_color }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Validation pending */}
      {user.role === 'admin' && pendingVal.length > 0 && (
        <div className="surface" style={{ padding: '16px', marginTop: '16px' }}>
          <div className="section-header" style={{ color: '#D97706' }}>
            ⏳ Tâches à valider ({pendingVal.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {pendingVal.map(task => (
              <div key={task.id} style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '8px 10px', background: '#FFFBEB',
                border: '1px solid #FDE68A', borderRadius: '6px',
              }}>
                <div style={{ flex: 1, fontSize: '13px', fontWeight: '500' }}>{task.title}</div>
                <button
                  onClick={async () => {
                    await supabase.from('tasks').update({ validated: true }).eq('id', task.id)
                    setTasks(p => p.map(t => t.id === task.id ? { ...t, validated: true } : t))
                  }}
                  className="btn btn-sm btn-primary"
                >Valider</button>
              </div>
            ))}
          </div>
        </div>
      )}
      {/* Toutes les tâches — arbre expandable */}
      <div className="surface" style={{ overflow: 'hidden', marginTop: '16px' }}>
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="section-header" style={{ marginBottom: 0 }}>Toutes les tâches</div>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{treeRoots.length} racines</span>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', background: 'var(--surface-2)' }}>Tâche</th>
              <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', background: 'var(--surface-2)' }}>Statut</th>
              <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', background: 'var(--surface-2)', minWidth: '120px' }}>Progression</th>
              <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', background: 'var(--surface-2)' }}>Assigné</th>
            </tr>
          </thead>
          <tbody>
            {treeRoots.length === 0 ? (
              <tr><td colSpan={4} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>Aucune tâche</td></tr>
            ) : treeRoots.map(task => (
              <DashTaskRow key={task.id} task={task} depth={0} expandedIds={expandedIds} toggleExpand={toggleExpand} allMap={allMap} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function DashTaskRow({ task, depth, expandedIds, toggleExpand, allMap }: {
  task: any
  depth: number
  expandedIds: Set<string>
  toggleExpand: (id: string) => void
  allMap: Record<string, any>
}) {

  const hasChildren = task.children && task.children.length > 0
  const isExpanded = expandedIds.has(task.id)
  const cat = CATEGORIES.find((c: any) => c.value === task.category)
  const sta = STATUSES.find((s: any) => s.value === task.status)
  const leaves = countLeaves(task)
  const progress = hasChildren
    ? Math.round((leaves.done / leaves.total) * 100)
    : (task.status === 'Terminé' ? 100 : task.progress || 0)
  const assignees: any[] = task.assignees || []

  return (
    <>
      <tr style={{ borderBottom: '1px solid var(--border)', opacity: task.status === 'Terminé' ? 0.55 : 1 }}
        onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#F8F9FB'}
        onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ''}>
        <td style={{ paddingLeft: `${12 + depth * 20}px`, padding: `10px 12px 10px ${12 + depth * 20}px` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '18px', flexShrink: 0 }}>
              {hasChildren && (
                <button onClick={() => toggleExpand(task.id)}
                  style={{ width: '18px', height: '18px', border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '3px' }}>
                  {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                </button>
              )}
            </div>
            {hasChildren
              ? <Folder size={13} color={cat?.color} style={{ flexShrink: 0 }} />
              : <FileText size={13} color="var(--text-dim)" style={{ flexShrink: 0 }} />
            }
            <div>
              <div style={{ fontWeight: hasChildren ? '600' : '400', fontSize: '13px' }}>{task.title}</div>
              {hasChildren && (
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                  {leaves.done}/{leaves.total} sous-tâches
                </div>
              )}
            </div>
          </div>
        </td>
        <td style={{ padding: '10px 12px' }}>
          <span className="badge" style={{ background: sta?.bg, color: sta?.color, borderColor: sta?.border, fontSize: '11px' }}>{task.status}</span>
        </td>
        <td style={{ padding: '10px 12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ flex: 1, height: '5px', background: 'var(--border)', borderRadius: '100px', overflow: 'hidden' }}>
              <div style={{ height: '100%', borderRadius: '100px', width: `${progress}%`, background: progress === 100 ? '#059669' : cat?.color }} />
            </div>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', minWidth: '28px' }}>{progress}%</span>
          </div>
        </td>
        <td style={{ padding: '10px 12px' }}>
          {assignees.length > 0 ? (
            <div style={{ display: 'flex', gap: '3px' }}>
              {assignees.map((a: any) => (
                <div key={a.id} title={a.name} style={{ width: '22px', height: '22px', borderRadius: '50%', background: `${a.avatar_color}15`, border: `1.5px solid ${a.avatar_color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: '600', color: a.avatar_color }}>
                  {a.name[0]}
                </div>
              ))}
            </div>
          ) : <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>—</span>}
        </td>
      </tr>
      {hasChildren && isExpanded && task.children.map((child: any) => (
        <DashTaskRow key={child.id} task={child} depth={depth + 1} expandedIds={expandedIds} toggleExpand={toggleExpand} allMap={allMap} />
      ))}
    </>
  )
}
