'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Task, User } from '@/types'
import { CATEGORIES, STATUSES } from '@/lib/constants'
import { enrichTasks, buildUserMap, getProjects, getModules, getRealTasks, projectProgress } from '@/lib/taskUtils'
import { Folder, CheckSquare, AlertCircle, TrendingUp } from 'lucide-react'
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
        setTasks(enrichTasks(t as any[], buildUserMap(u as User[])) as any)
        setUsers(u as User[])
      }
      setLoading(false)
    })
  }, [])

  if (!user || loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: 'var(--text-muted)' }}>
      Chargement...
    </div>
  )

  const realTasks = getRealTasks(tasks)
  const myTasks = realTasks.filter(t => (t.assigned_users || []).includes(user.id))
  const pendingVal = tasks.filter(t => !t.validated && t.created_by !== user.id)
  const urgent = realTasks.filter(t => t.urgency === 'Urgent' && t.status !== 'Terminé')
  const done = realTasks.filter(t => t.status === 'Terminé')
  const projects = getProjects(tasks)

  const stats = [
    { label: 'Mes tâches actives', value: myTasks.filter(t => t.status !== 'Terminé').length, color: user.avatar_color },
    ...(user.role === 'admin' ? [{ label: 'À valider', value: pendingVal.length, color: '#D97706' }] : []),
    { label: 'Urgentes', value: urgent.length, color: '#DC2626' },
    { label: 'Terminées', value: done.length, color: '#059669' },
  ]

  return (
    <div className="animate-in">
      <div className="page-header">
        <div>
          <div className="page-title">Bonjour, {user.name} 👋</div>
          <div className="page-sub">{new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
        </div>
        <Link href="/dashboard/tasks">
          <button className="btn btn-primary"><CheckSquare size={14} /> Voir les tâches</button>
        </Link>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '24px' }}>
        {stats.map((s, i) => (
          <div key={i} className="stat-card">
            <div className="stat-label">{s.label}</div>
            <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Projects */}
      <div className="section-header">Projets</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '12px', marginBottom: '24px' }}>
        {projects.map(proj => {
          const cat = CATEGORIES.find(c => c.value === proj.category)
          const pct = projectProgress(tasks, proj.id)
          const mods = getModules(tasks, proj.id)
          const allTasks = mods.flatMap(m => getRealTasks(tasks, m.id))
          const doneTasks = allTasks.filter(t => t.status === 'Terminé').length

          return (
            <Link key={proj.id} href="/dashboard/tasks" style={{ textDecoration: 'none' }}>
              <div className="surface" style={{ padding: '16px', cursor: 'pointer', borderLeft: `3px solid ${cat?.color}` }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-md)'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.boxShadow = ''}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <Folder size={14} color={cat?.color} />
                  <div style={{ fontWeight: '600', fontSize: '14px' }}>{proj.title}</div>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px', fontFamily: 'var(--font-mono)' }}>
                  {mods.length} module{mods.length > 1 ? 's' : ''} · {doneTasks}/{allTasks.length} tâches
                </div>
                <div className="progress-track">
                  <div className="progress-fill" style={{ width: `${pct}%`, background: pct === 100 ? '#059669' : cat?.color }} />
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{pct}%</div>
              </div>
            </Link>
          )
        })}
      </div>

      {/* Charge par membre */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <div className="surface" style={{ padding: '16px' }}>
          <div className="section-header">Charge par membre</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {users.map(u => {
              const uTasks = realTasks.filter(t => (t.assigned_users || []).includes(u.id))
              const uDone = uTasks.filter(t => t.status === 'Terminé').length
              const pct = uTasks.length > 0 ? Math.round((uDone / uTasks.length) * 100) : 0
              return (
                <div key={u.id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                      <div className="avatar" style={{ width: '22px', height: '22px', background: `${u.avatar_color}15`, border: `1.5px solid ${u.avatar_color}40`, fontSize: '10px', color: u.avatar_color }}>{u.name[0]}</div>
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

        {/* Validation pending */}
        {user.role === 'admin' && pendingVal.length > 0 && (
          <div className="surface" style={{ padding: '16px' }}>
            <div className="section-header" style={{ color: '#D97706' }}>⏳ À valider ({pendingVal.length})</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {pendingVal.map(task => (
                <div key={task.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '6px' }}>
                  <div style={{ flex: 1, fontSize: '13px', fontWeight: '500' }}>{task.title}</div>
                  <button onClick={async () => { await supabase.from('tasks').update({ validated: true }).eq('id', task.id); setTasks(p => p.map(t => t.id === task.id ? { ...t, validated: true } : t)) }}
                    className="btn btn-sm btn-primary">Valider</button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
