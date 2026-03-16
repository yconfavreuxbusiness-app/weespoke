'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Task, User } from '@/types'
import { CATEGORIES } from '@/lib/constants'
import { enrichTasks, buildUserMap, getRealTasks, getTaskContext } from '@/lib/taskUtils'
import { Modal } from '@/components/Modal'
import { Plus, X, ChevronRight, Zap } from 'lucide-react'

function getWeekBounds(date: Date) {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(d.setDate(diff))
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  return { start: monday.toISOString().split('T')[0], end: sunday.toISOString().split('T')[0] }
}

export default function SessionsPage() {
  const [user, setUser] = useState<User | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [currentSession, setCurrentSession] = useState<any>(null)
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
    const [{ data: t }, { data: u }, { data: s }] = await Promise.all([
      supabase.from('tasks').select('*, creator:created_by(*)').order('created_at', { ascending: false }),
      supabase.from('users').select('*'),
      supabase.from('sessions').select('*, session_tasks(*, task:task_id(*))').eq('user_id', user.id).eq('week_start', week.start).maybeSingle()
    ])
    if (t && u) setTasks(enrichTasks(t as any[], buildUserMap(u as User[])) as any)
    if (s) { setCurrentSession(s); setSessionTasks(s.session_tasks || []) }
    setLoading(false)
  }

  const createSession = async () => {
    if (!user) return
    const week = getWeekBounds(new Date())
    const { data } = await supabase.from('sessions').insert({ user_id: user.id, week_start: week.start, week_end: week.end }).select().single()
    if (data) { setCurrentSession(data); setSessionTasks([]) }
  }

  const addTask = async (taskId: string) => {
    if (!currentSession) return
    const { data } = await supabase.from('session_tasks').insert({ session_id: currentSession.id, task_id: taskId, progress: 0 }).select('*, task:task_id(*)').single()
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
  const realTasks = getRealTasks(tasks).filter(t => t.validated && t.status !== 'Terminé')
  const alreadyIn = sessionTasks.map((st: any) => st.task_id)
  const available = realTasks.filter(t => !alreadyIn.includes(t.id))
  const globalPct = sessionTasks.length > 0 ? Math.round(sessionTasks.reduce((s, st) => s + (st.progress || 0), 0) / sessionTasks.length) : 0

  if (!user || loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: 'var(--text-muted)' }}>Chargement...</div>
  )

  return (
    <div className="animate-in">
      <div className="page-header">
        <div>
          <div className="page-title">Session de travail</div>
          <div className="page-sub">Semaine du {new Date(week.start).toLocaleDateString('fr-FR')} au {new Date(week.end).toLocaleDateString('fr-FR')}</div>
        </div>
        {currentSession && sessionTasks.length > 0 && (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', padding: '8px 16px', textAlign: 'right' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginBottom: '2px' }}>PROGRESSION</div>
            <div style={{ fontSize: '22px', fontWeight: '600', color: globalPct === 100 ? '#059669' : 'var(--accent)' }}>{globalPct}%</div>
          </div>
        )}
      </div>

      {!currentSession ? (
        <div className="surface" style={{ padding: '60px', textAlign: 'center' }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>⚡</div>
          <div style={{ fontWeight: '600', fontSize: '18px', marginBottom: '6px' }}>Pas de session cette semaine</div>
          <div style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '20px' }}>Démarre ta session pour sélectionner tes tâches de la semaine.</div>
          <button onClick={createSession} className="btn btn-primary"><Zap size={14} /> Démarrer la semaine</button>
        </div>
      ) : (
        <>
          <div style={{ marginBottom: '14px' }}>
            <button onClick={() => setShowAddTask(true)} className="btn btn-secondary"><Plus size={14} /> Ajouter une tâche</button>
          </div>

          {sessionTasks.length === 0 ? (
            <div className="surface" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Aucune tâche — ajoutes-en une.</div>
          ) : (
            <div className="surface" style={{ overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    {['Tâche', 'Projet › Module', 'Progression', ''].map(h => (
                      <th key={h} style={{ padding: '9px 12px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', background: 'var(--surface-2)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sessionTasks.map((st: any) => {
                    const task = st.task
                    if (!task) return null
                    const cat = CATEGORIES.find(c => c.value === task.category)
                    const progress = st.progress || 0
                    const { module, project } = getTaskContext(task, tasks)

                    return (
                      <tr key={st.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '10px 12px' }}>
                          <div style={{ fontWeight: '500', fontSize: '13px' }}>{task.title}</div>
                          {task.description && <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{task.description}</div>}
                        </td>
                        <td style={{ padding: '10px 12px', fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>
                          {project?.title}{module ? ` › ${module.title}` : ''}
                        </td>
                        <td style={{ padding: '10px 12px', minWidth: '220px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ height: '8px', background: 'var(--border)', borderRadius: '100px', overflow: 'hidden', marginBottom: '4px' }}>
                                <div style={{ height: '100%', borderRadius: '100px', width: `${progress}%`, background: progress === 100 ? '#059669' : cat?.color, transition: 'width 0.3s ease' }} />
                              </div>
                              <input type="range" min="0" max="100" step="5" value={progress}
                                onChange={e => updateProgress(st.id, parseInt(e.target.value))}
                                style={{ width: '100%', accentColor: cat?.color, cursor: 'pointer' }} />
                            </div>
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', fontWeight: '600', minWidth: '36px', textAlign: 'right', color: progress === 100 ? '#059669' : 'var(--text)' }}>{progress}%</span>
                          </div>
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                          <button onClick={() => removeTask(st.id)} className="btn btn-ghost btn-icon"><X size={14} /></button>
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

      {showAddTask && (
        <Modal onClose={() => setShowAddTask(false)}>
          <div className="modal-header">
            <span style={{ fontWeight: '600' }}>Ajouter à la session</span>
            <button onClick={() => setShowAddTask(false)} className="btn btn-ghost btn-icon"><X size={16} /></button>
          </div>
          <div style={{ padding: '12px', maxHeight: '400px', overflowY: 'auto' }}>
            {available.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)', fontSize: '13px' }}>Toutes les tâches actives sont déjà dans ta session.</div>
            ) : available.map(task => {
              const cat = CATEGORIES.find(c => c.value === task.category)
              const { module, project } = getTaskContext(task, tasks)
              return (
                <button key={task.id} onClick={() => addTask(task.id)} style={{ width: '100%', padding: '10px 12px', marginBottom: '4px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '6px', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--text)' }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#F0F4FF'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'var(--surface-2)'}>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: '500' }}>{task.title}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>{project?.title}{module ? ` › ${module.title}` : ''}</div>
                  </div>
                  <ChevronRight size={14} color="var(--text-dim)" />
                </button>
              )
            })}
          </div>
        </Modal>
      )}
    </div>
  )
}
