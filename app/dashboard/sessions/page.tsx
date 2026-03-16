'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Task, User, Session } from '@/types'
import { CATEGORIES } from '@/lib/constants'
import { Plus, X, ChevronRight, Zap } from 'lucide-react'

function getWeekBounds(date: Date) {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(d.setDate(diff))
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  return {
    start: monday.toISOString().split('T')[0],
    end: sunday.toISOString().split('T')[0],
  }
}

export default function SessionsPage() {
  const [user, setUser] = useState<User | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [currentSession, setCurrentSession] = useState<any | null>(null)
  const [sessionTasks, setSessionTasks] = useState<any[]>([])
  const [showAddTask, setShowAddTask] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const stored = localStorage.getItem('ws_user')
    if (stored) setUser(JSON.parse(stored))
  }, [])

  useEffect(() => {
    if (!user) return
    loadData()
  }, [user])

  const loadData = async () => {
    if (!user) return
    const week = getWeekBounds(new Date())
    const [{ data: t }, { data: s }] = await Promise.all([
      supabase.from('tasks').select('*').eq('validated', true).neq('status', 'Terminé').is('parent_id', null).order('created_at', { ascending: false }),
      supabase.from('sessions').select('*, session_tasks(*, task:task_id(*))').eq('user_id', user.id).eq('week_start', week.start).maybeSingle()
    ])
    if (t) setTasks(t)
    if (s) { setCurrentSession(s); setSessionTasks(s.session_tasks || []) }
    setLoading(false)
  }

  const createSession = async () => {
    if (!user) return
    const week = getWeekBounds(new Date())
    const { data } = await supabase.from('sessions').insert({
      user_id: user.id, week_start: week.start, week_end: week.end
    }).select().single()
    if (data) { setCurrentSession(data); setSessionTasks([]) }
  }

  const addTask = async (taskId: string) => {
    if (!currentSession) return
    const { data } = await supabase.from('session_tasks').insert({
      session_id: currentSession.id, task_id: taskId, progress: 0
    }).select('*, task:task_id(*)').single()
    if (data) setSessionTasks(prev => [...prev, data])
    setShowAddTask(false)
  }

  const updateProgress = async (stId: string, progress: number) => {
    await supabase.from('session_tasks').update({ progress }).eq('id', stId)
    setSessionTasks(prev => prev.map(st => st.id === stId ? { ...st, progress } : st))
    const st = sessionTasks.find(s => s.id === stId)
    if (st) {
      const newStatus = progress === 100 ? 'Terminé' : progress > 0 ? 'En cours' : 'À faire'
      await supabase.from('tasks').update({ status: newStatus, progress }).eq('id', st.task_id)
    }
  }

  const removeTask = async (stId: string) => {
    await supabase.from('session_tasks').delete().eq('id', stId)
    setSessionTasks(prev => prev.filter(st => st.id !== stId))
  }

  const week = getWeekBounds(new Date())
  const alreadyIn = sessionTasks.map((st: any) => st.task_id)
  const available = tasks.filter(t => !alreadyIn.includes(t.id))
  const globalPct = sessionTasks.length > 0
    ? Math.round(sessionTasks.reduce((s, st) => s + (st.progress || 0), 0) / sessionTasks.length)
    : 0

  if (!user || loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: 'var(--text-muted)' }}>
      Chargement...
    </div>
  )

  return (
    <div className="animate-in">
      <div className="page-header">
        <div>
          <div className="page-title">Session de travail</div>
          <div className="page-sub">
            Semaine du {new Date(week.start).toLocaleDateString('fr-FR')} au {new Date(week.end).toLocaleDateString('fr-FR')}
          </div>
        </div>
        {currentSession && (
          <div style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            padding: '8px 16px',
            textAlign: 'right',
          }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginBottom: '2px' }}>
              PROGRESSION
            </div>
            <div style={{ fontSize: '22px', fontWeight: '600', color: globalPct === 100 ? '#059669' : 'var(--accent)' }}>
              {globalPct}%
            </div>
          </div>
        )}
      </div>

      {!currentSession ? (
        <div className="surface" style={{ padding: '60px', textAlign: 'center' }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>⚡</div>
          <div style={{ fontWeight: '600', fontSize: '18px', marginBottom: '6px' }}>Pas de session cette semaine</div>
          <div style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '20px', maxWidth: '360px', margin: '0 auto 20px' }}>
            Démarre ta session pour sélectionner tes tâches et suivre ta progression au fil de la semaine.
          </div>
          <button onClick={createSession} className="btn btn-primary">
            <Zap size={14} /> Démarrer la semaine
          </button>
        </div>
      ) : (
        <>
          <div style={{ marginBottom: '14px' }}>
            <button onClick={() => setShowAddTask(true)} className="btn btn-secondary">
              <Plus size={14} /> Ajouter une tâche
            </button>
          </div>

          {sessionTasks.length === 0 ? (
            <div className="surface" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
              Aucune tâche dans cette session. Ajoutes-en une.
            </div>
          ) : (
            <div className="surface" style={{ overflow: 'hidden' }}>
              <table>
                <thead>
                  <tr>
                    <th>Tâche</th>
                    <th>Catégorie</th>
                    <th style={{ minWidth: '260px' }}>Progression</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sessionTasks.map((st: any) => {
                    const task = st.task
                    if (!task) return null
                    const cat = CATEGORIES.find(c => c.value === task.category)
                    const progress = st.progress || 0
                    const markers = [0, 25, 50, 75, 100]

                    return (
                      <tr key={st.id}>
                        <td>
                          <div style={{ fontWeight: '500', fontSize: '13px' }}>{task.title}</div>
                          {task.description && (
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{task.description}</div>
                          )}
                        </td>
                        <td>
                          <span className="badge" style={{ background: cat?.bg, color: cat?.color, borderColor: cat?.border }}>
                            {task.category}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ flex: 1 }}>
                              <div className="progress-track" style={{ height: '8px', marginBottom: '4px' }}>
                                <div className="progress-fill" style={{
                                  width: `${progress}%`,
                                  background: progress === 100 ? '#059669' : cat?.color,
                                }} />
                              </div>
                              <input
                                type="range" min="0" max="100" step="5"
                                value={progress}
                                onChange={e => updateProgress(st.id, parseInt(e.target.value))}
                                style={{ width: '100%', accentColor: cat?.color, cursor: 'pointer' }}
                              />
                            </div>
                            <span style={{
                              fontFamily: 'var(--font-mono)', fontSize: '13px',
                              fontWeight: '600', minWidth: '36px', textAlign: 'right',
                              color: progress === 100 ? '#059669' : 'var(--text)',
                            }}>
                              {progress}%
                            </span>
                          </div>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button onClick={() => removeTask(st.id)} className="btn btn-ghost btn-icon">
                            <X size={14} />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Add task modal */}
      {showAddTask && (
        <>
          <div className="overlay" onClick={() => setShowAddTask(false)} />
          <div className="modal">
            <div className="modal-header">
              <span style={{ fontWeight: '600' }}>Ajouter à la session</span>
              <button onClick={() => setShowAddTask(false)} className="btn btn-ghost btn-icon"><X size={16} /></button>
            </div>
            <div style={{ padding: '12px', maxHeight: '400px', overflowY: 'auto' }}>
              {available.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)', fontSize: '13px' }}>
                  Toutes les tâches actives sont dans ta session.
                </div>
              ) : available.map(task => {
                const cat = CATEGORIES.find(c => c.value === task.category)
                return (
                  <button key={task.id} onClick={() => addTask(task.id)} style={{
                    width: '100%', padding: '10px 12px', marginBottom: '4px',
                    background: 'var(--surface-2)', border: '1px solid var(--border)',
                    borderRadius: '6px', cursor: 'pointer', textAlign: 'left',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    transition: 'all 0.12s', color: 'var(--text)',
                  }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#F0F4FF'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'var(--surface-2)'}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className="badge" style={{ background: cat?.bg, color: cat?.color, borderColor: cat?.border, fontSize: '10px' }}>
                        {task.category}
                      </span>
                      <span style={{ fontSize: '13px', fontWeight: '500' }}>{task.title}</span>
                    </div>
                    <ChevronRight size={14} color="var(--text-dim)" />
                  </button>
                )
              })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
