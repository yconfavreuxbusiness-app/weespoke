'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Task, User } from '@/types'
import { CATEGORIES, STATUSES, URGENCIES } from '@/lib/constants'
import { countLeaves } from '@/lib/taskTree'

export default function TeamPage() {
  const [user, setUser] = useState<User | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'kanban' | 'members'>('kanban')
  const [memberFilter, setMemberFilter] = useState<string>('all')

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

  const updateStatus = async (taskId: string, status: string) => {
    await supabase.from('tasks').update({ status }).eq('id', taskId)
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: status as any } : t))
  }

  // Build tree map once
  const allMap: Record<string, Task & { children: Task[] }> = {}
  tasks.forEach(t => { allMap[t.id] = { ...t, children: [] } })
  tasks.forEach(t => { if (t.parent_id && allMap[t.parent_id]) allMap[t.parent_id].children.push(allMap[t.id]) })

  const rootTasks = tasks.filter(t => !t.parent_id)

  if (!user || loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: 'var(--text-muted)' }}>
      Chargement...
    </div>
  )

  return (
    <div className="animate-in">
      <div className="page-header">
        <div>
          <div className="page-title">Équipe</div>
          <div className="page-sub">Vue transversale des tâches</div>
        </div>
      </div>

      <div className="tabs" style={{ marginBottom: '20px' }}>
        <button className={`tab ${tab === 'kanban' ? 'active' : ''}`} onClick={() => setTab('kanban')}>
          Board Kanban
        </button>
        <button className={`tab ${tab === 'members' ? 'active' : ''}`} onClick={() => setTab('members')}>
          Par membre
        </button>
      </div>

      {/* KANBAN */}
      {tab === 'kanban' && (
        <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '16px' }}>
          {STATUSES.map(status => {
            const colTasks = rootTasks.filter(t => t.status === status.value)
            return (
              <div key={status.value} className="kanban-col">
                <div className="kanban-col-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                    <div className="badge-dot" style={{ background: status.color }} />
                    <span style={{ fontWeight: '600', fontSize: '13px' }}>{status.value}</span>
                  </div>
                  <span style={{
                    fontSize: '11px', fontFamily: 'var(--font-mono)',
                    background: status.bg, color: status.color,
                    padding: '2px 7px', borderRadius: '100px',
                    border: `1px solid ${status.border}`,
                  }}>
                    {colTasks.length}
                  </span>
                </div>

                <div className="kanban-col-body">
                  {colTasks.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '20px 10px', color: 'var(--text-dim)', fontSize: '12px' }}>
                      Aucune tâche
                    </div>
                  ) : colTasks.map(task => {
                    const cat = CATEGORIES.find(c => c.value === task.category)
                    const assignees: any[] = (task as any).assignees || []
                    const treeTask = allMap[task.id]
                    const leaves = countLeaves(treeTask as any)
                    const progress = leaves.total > 1
                      ? Math.round((leaves.done / leaves.total) * 100)
                      : (task.status === 'Terminé' ? 100 : task.progress || 0)

                    return (
                      <div key={task.id} className="kanban-card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                          <span className="badge" style={{ background: cat?.bg, color: cat?.color, borderColor: cat?.border, fontSize: '10px' }}>
                            {task.category}
                          </span>
                          {task.urgency === 'Urgent' && (
                            <span className="badge" style={{ background: '#FEF2F2', color: '#DC2626', borderColor: '#FECACA', fontSize: '10px' }}>
                              Urgent
                            </span>
                          )}
                        </div>

                        <div style={{ fontWeight: '500', fontSize: '13px', marginBottom: '8px', lineHeight: 1.3 }}>
                          {task.title}
                        </div>

                        {leaves.total > 1 && (
                          <div style={{ marginBottom: '8px' }}>
                            <div className="progress-track" style={{ height: '4px', marginBottom: '3px' }}>
                              <div className="progress-fill" style={{ width: `${progress}%`, background: cat?.color }} />
                            </div>
                            <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                              {leaves.done}/{leaves.total} sous-tâches · {progress}%
                            </div>
                          </div>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          {assignees.length > 0 ? (
                            <div style={{ display: 'flex', gap: '3px' }}>
                              {assignees.map((a: any) => (
                                <div key={a.id} title={a.name} style={{
                                  width: '20px', height: '20px', borderRadius: '50%', fontSize: '9px',
                                  background: `${a.avatar_color}15`, border: `1.5px solid ${a.avatar_color}40`,
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  fontWeight: '700', color: a.avatar_color,
                                }}>{a.name[0]}</div>
                              ))}
                            </div>
                          ) : <div />}

                          <select value={task.status} onChange={e => updateStatus(task.id, e.target.value)}
                            onClick={e => e.stopPropagation()}
                            style={{
                              fontSize: '10px', padding: '2px 6px',
                              border: '1px solid var(--border-dark)', borderRadius: '4px',
                              cursor: 'pointer', fontFamily: 'var(--font)',
                              background: 'var(--surface)', color: 'var(--text-muted)',
                            }}>
                            {STATUSES.map(s => <option key={s.value} value={s.value}>{s.value}</option>)}
                          </select>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* MEMBERS */}
      {tab === 'members' && (
        <div>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
            <button className={`btn ${memberFilter === 'all' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setMemberFilter('all')}>
              Tous
            </button>
            {users.map(u => (
              <button key={u.id} className="btn btn-secondary"
                onClick={() => setMemberFilter(u.id)}
                style={{
                  borderColor: memberFilter === u.id ? u.avatar_color : undefined,
                  color: memberFilter === u.id ? u.avatar_color : undefined,
                  background: memberFilter === u.id ? `${u.avatar_color}10` : undefined,
                }}>
                <div style={{
                  width: '18px', height: '18px', borderRadius: '50%', fontSize: '9px',
                  background: `${u.avatar_color}20`, color: u.avatar_color,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700',
                }}>{u.name[0]}</div>
                {u.name}
              </button>
            ))}
          </div>

          {(memberFilter === 'all' ? users : users.filter(u => u.id === memberFilter)).map(u => {
            const uTasks = rootTasks.filter(t => (t.assigned_users || []).includes(u.id))
            const active = uTasks.filter(t => t.status !== 'Terminé')
            const done = uTasks.filter(t => t.status === 'Terminé')

            return (
              <div key={u.id} style={{ marginBottom: '24px' }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  marginBottom: '12px', paddingBottom: '10px',
                  borderBottom: '1px solid var(--border)',
                }}>
                  <div className="avatar" style={{
                    width: '32px', height: '32px', fontSize: '13px',
                    background: `${u.avatar_color}15`, border: `2px solid ${u.avatar_color}40`,
                    color: u.avatar_color,
                  }}>{u.name[0]}</div>
                  <div>
                    <div style={{ fontWeight: '600', fontSize: '15px' }}>{u.name}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      {active.length} active{active.length > 1 ? 's' : ''} · {done.length} terminée{done.length > 1 ? 's' : ''}
                    </div>
                  </div>
                </div>

                {uTasks.length === 0 ? (
                  <div style={{ padding: '16px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '13px', color: 'var(--text-dim)', textAlign: 'center' }}>
                    Aucune tâche assignée
                  </div>
                ) : (
                  <div className="surface" style={{ overflow: 'hidden' }}>
                    <table>
                      <thead>
                        <tr>
                          <th>Tâche</th>
                          <th>Catégorie</th>
                          <th>Statut</th>
                          <th>Urgence</th>
                          <th>Progression</th>
                        </tr>
                      </thead>
                      <tbody>
                        {uTasks.map(task => {
                          const cat = CATEGORIES.find(c => c.value === task.category)
                          const sta = STATUSES.find(s => s.value === task.status)
                          const urg = URGENCIES.find(u => u.value === task.urgency)
                          const treeTask = allMap[task.id]
                          const leaves = countLeaves(treeTask as any)
                          const progress = leaves.total > 1
                            ? Math.round((leaves.done / leaves.total) * 100)
                            : (task.status === 'Terminé' ? 100 : task.progress || 0)

                          return (
                            <tr key={task.id}>
                              <td>
                                <div style={{ fontWeight: '500', fontSize: '13px' }}>{task.title}</div>
                                {leaves.total > 1 && (
                                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                                    {leaves.done}/{leaves.total} sous-tâches
                                  </div>
                                )}
                              </td>
                              <td><span className="badge" style={{ background: cat?.bg, color: cat?.color, borderColor: cat?.border }}>{task.category}</span></td>
                              <td><span className="badge" style={{ background: sta?.bg, color: sta?.color, borderColor: sta?.border }}>{task.status}</span></td>
                              <td>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                  <div className="badge-dot" style={{ background: urg?.dot }} />
                                  <span style={{ fontSize: '12px' }}>{task.urgency}</span>
                                </div>
                              </td>
                              <td style={{ minWidth: '120px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <div className="progress-track" style={{ flex: 1 }}>
                                    <div className="progress-fill" style={{ width: `${progress}%`, background: progress === 100 ? '#059669' : cat?.color }} />
                                  </div>
                                  <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', minWidth: '28px' }}>{progress}%</span>
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
