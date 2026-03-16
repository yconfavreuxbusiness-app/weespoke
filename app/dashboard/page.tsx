'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Task, User } from '@/types'
import { CATEGORIES, STATUSES } from '@/lib/constants'
import { buildTaskTree, calcProgress } from '@/lib/taskTree'
import { CheckSquare, Clock, AlertCircle, TrendingUp, ChevronRight } from 'lucide-react'
import Link from 'next/link'

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)

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
    </div>
  )
}
