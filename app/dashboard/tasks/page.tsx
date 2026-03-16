'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Task, User } from '@/types'
import { CATEGORIES, STATUSES, URGENCIES } from '@/lib/constants'
import { enrichTasks, buildUserMap, getProjects, getModules, getRealTasks, getTaskContext } from '@/lib/taskUtils'
import { Modal } from '@/components/Modal'
import { Plus, ChevronRight, Folder, FileText, X, Check, Pencil, Trash2, ArrowLeft, MessageSquare, CheckCircle2, Clock } from 'lucide-react'

type View = 'projects' | 'modules' | 'tasks'

export default function TasksPage() {
  const [user, setUser] = useState<User | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)

  // Navigation state
  const [view, setView] = useState<View>('projects')
  const [selectedProject, setSelectedProject] = useState<Task | null>(null)
  const [selectedModule, setSelectedModule] = useState<Task | null>(null)

  // Modals
  const [showCreate, setShowCreate] = useState(false)
  const [editTask, setEditTask] = useState<Task | null>(null)
  const [quickTask, setQuickTask] = useState<Task | null>(null)

  // Filter
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterUser, setFilterUser] = useState('all')

  useEffect(() => {
    const stored = localStorage.getItem('ws_user')
    if (stored) setUser(JSON.parse(stored))
  }, [])

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    const [{ data: t }, { data: u }] = await Promise.all([
      supabase.from('tasks').select('*, creator:created_by(*)').order('created_at', { ascending: false }),
      supabase.from('users').select('*')
    ])
    if (t && u) {
      setTasks(enrichTasks(t as any[], buildUserMap(u as User[])) as any)
      setUsers(u as User[])
    }
    setLoading(false)
  }

  const enrich = (task: any) => enrichTasks([task], buildUserMap(users))[0]

  const createItem = async (form: any) => {
    if (!user) return
    let level = 0
    let parent_id = null
    if (view === 'modules') { level = 1; parent_id = selectedProject!.id }
    if (view === 'tasks') { level = 2; parent_id = selectedModule!.id }

    const { data } = await supabase.from('tasks').insert({
      title: form.title, description: form.description || null,
      category: form.category, urgency: form.urgency,
      status: 'À faire', assigned_users: form.assigned_users || [],
      due_date: form.due_date || null, created_by: user.id,
      validated: user.role === 'admin', progress: 0,
      parent_id, level,
    }).select('*, creator:created_by(*)').single()
    if (data) setTasks(prev => [enrich(data), ...prev])
    setShowCreate(false)
  }

  const updateItem = async (id: string, form: any) => {
    const updates = { title: form.title, description: form.description || null, category: form.category, urgency: form.urgency, status: form.status, assigned_users: form.assigned_users, due_date: form.due_date || null }
    await supabase.from('tasks').update(updates).eq('id', id)
    const userMap = buildUserMap(users)
    setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates, assignees: (updates.assigned_users || []).map((uid: string) => userMap[uid]).filter(Boolean) } : t))
    setEditTask(null)
  }

  const deleteItem = async (id: string) => {
    await supabase.from('tasks').delete().eq('id', id)
    await supabase.from('tasks').delete().eq('parent_id', id)
    // Also delete grandchildren
    const children = tasks.filter(t => t.parent_id === id)
    for (const child of children) {
      await supabase.from('tasks').delete().eq('parent_id', child.id)
    }
    setTasks(prev => prev.filter(t => t.id !== id && t.parent_id !== id))
    setEditTask(null)
    if (view === 'tasks' && editTask?.id === id) {}
  }

  const toggleValidation = async (task: Task, userId: string) => {
    const current: string[] = (task as any).validations || []
    const isValidated = current.includes(userId)
    const newValidations = isValidated ? current.filter(id => id !== userId) : [...current, userId]
    const assignedUsers: string[] = (task as any).assigned_users || []
    const allValidated = assignedUsers.length > 0 && assignedUsers.every(id => newValidations.includes(id))
    const newStatus = allValidated ? 'Terminé' : (task.status === 'Terminé' ? 'En cours' : task.status)
    await supabase.from('tasks').update({ validations: newValidations, status: newStatus }).eq('id', task.id)
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, validations: newValidations, status: newStatus as any } : t))
  }

  const updateTaskProgress = async (id: string, progress: number) => {
    const newStatus = progress === 100 ? 'Terminé' : progress > 0 ? 'En cours' : 'À faire'
    await supabase.from('tasks').update({ progress, status: newStatus }).eq('id', id)
    setTasks(prev => prev.map(t => t.id === id ? { ...t, progress, status: newStatus as any } : t))
  }

  const updateStatus = async (id: string, status: string) => {
    await supabase.from('tasks').update({ status }).eq('id', id)
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status: status as any } : t))
  }

  const projects = getProjects(tasks)
  const modules = selectedProject ? getModules(tasks, selectedProject.id) : []
  const realTasks = selectedModule ? getRealTasks(tasks, selectedModule.id).filter(t => {
    if (filterStatus !== 'all' && t.status !== filterStatus) return false
    if (filterUser !== 'all' && !(t.assigned_users || []).includes(filterUser)) return false
    return true
  }) : []

  // Progress helpers
  const projectPct = (proj: Task) => {
    const mods = getModules(tasks, proj.id)
    const allTasks = mods.flatMap(m => getRealTasks(tasks, m.id))
    if (!allTasks.length) return 0
    return Math.round(allTasks.filter(t => t.status === 'Terminé').length / allTasks.length * 100)
  }
  const modulePct = (mod: Task) => {
    const ts = getRealTasks(tasks, mod.id)
    if (!ts.length) return 0
    return Math.round(ts.filter(t => t.status === 'Terminé').length / ts.length * 100)
  }
  const moduleTaskCount = (mod: Task) => getRealTasks(tasks, mod.id).length

  if (!user) return null

  const createLabel = view === 'projects' ? 'Nouveau projet' : view === 'modules' ? 'Nouveau module' : 'Nouvelle tâche'

  return (
    <div className="animate-in">
      {/* Header + breadcrumb */}
      <div className="page-header">
        <div>
          {/* Breadcrumb */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px', fontSize: '13px', color: 'var(--text-muted)' }}>
            <button onClick={() => { setView('projects'); setSelectedProject(null); setSelectedModule(null) }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: view === 'projects' ? 'var(--accent)' : 'var(--text-muted)', fontWeight: view === 'projects' ? '600' : '400', fontSize: '13px', padding: 0 }}>
              Projets
            </button>
            {selectedProject && (
              <>
                <ChevronRight size={12} />
                <button onClick={() => { setView('modules'); setSelectedModule(null) }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: view === 'modules' ? 'var(--accent)' : 'var(--text-muted)', fontWeight: view === 'modules' ? '600' : '400', fontSize: '13px', padding: 0 }}>
                  {selectedProject.title}
                </button>
              </>
            )}
            {selectedModule && (
              <>
                <ChevronRight size={12} />
                <span style={{ color: 'var(--accent)', fontWeight: '600' }}>{selectedModule.title}</span>
              </>
            )}
          </div>
          <div className="page-title">
            {view === 'projects' && 'Projets'}
            {view === 'modules' && selectedProject?.title}
            {view === 'tasks' && selectedModule?.title}
          </div>
          <div className="page-sub">
            {view === 'projects' && `${projects.length} projets`}
            {view === 'modules' && `${modules.length} modules`}
            {view === 'tasks' && `${realTasks.length} tâches`}
          </div>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn btn-primary">
          <Plus size={14} /> {createLabel}
        </button>
      </div>

      {/* PROJECTS VIEW */}
      {view === 'projects' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
          {loading ? (
            <div style={{ color: 'var(--text-muted)', padding: '40px', gridColumn: '1/-1', textAlign: 'center' }}>Chargement...</div>
          ) : projects.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', padding: '40px', gridColumn: '1/-1', textAlign: 'center' }}>
              Aucun projet — crée le premier
            </div>
          ) : projects.map(proj => {
            const pct = projectPct(proj)
            const cat = CATEGORIES.find(c => c.value === proj.category)
            const modCount = getModules(tasks, proj.id).length
            const taskCount = getModules(tasks, proj.id).flatMap(m => getRealTasks(tasks, m.id)).length
            const doneCount = getModules(tasks, proj.id).flatMap(m => getRealTasks(tasks, m.id)).filter(t => t.status === 'Terminé').length

            return (
              <div key={proj.id} className="surface" style={{ padding: '18px', cursor: 'pointer', transition: 'box-shadow 0.15s', borderLeft: `3px solid ${cat?.color}` }}
                onClick={() => { setSelectedProject(proj); setView('modules') }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-md)'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.boxShadow = ''}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Folder size={16} color={cat?.color} />
                    <div style={{ fontWeight: '600', fontSize: '15px' }}>{proj.title}</div>
                  </div>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button onClick={e => { e.stopPropagation(); setEditTask(proj) }} className="btn btn-ghost btn-icon btn-sm"><Pencil size={12} /></button>
                  </div>
                </div>
                {proj.description && <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px', lineHeight: 1.4 }}>{proj.description}</div>}
                <div style={{ display: 'flex', gap: '12px', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '10px', fontFamily: 'var(--font-mono)' }}>
                  <span>{modCount} module{modCount > 1 ? 's' : ''}</span>
                  <span>{doneCount}/{taskCount} tâches</span>
                </div>
                <div className="progress-track">
                  <div className="progress-fill" style={{ width: `${pct}%`, background: pct === 100 ? '#059669' : cat?.color }} />
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{pct}%</div>
              </div>
            )
          })}
        </div>
      )}

      {/* MODULES VIEW */}
      {view === 'modules' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '12px' }}>
          {modules.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', padding: '40px', gridColumn: '1/-1', textAlign: 'center' }}>
              Aucun module dans ce projet
            </div>
          ) : modules.map(mod => {
            const pct = modulePct(mod)
            const cat = CATEGORIES.find(c => c.value === mod.category)
            const tCount = moduleTaskCount(mod)
            const dCount = getRealTasks(tasks, mod.id).filter(t => t.status === 'Terminé').length

            return (
              <div key={mod.id} className="surface" style={{ padding: '16px', cursor: 'pointer', transition: 'box-shadow 0.15s', borderLeft: `3px solid ${cat?.color}` }}
                onClick={() => { setSelectedModule(mod); setView('tasks') }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-md)'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.boxShadow = ''}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FileText size={14} color={cat?.color} />
                    <div style={{ fontWeight: '600', fontSize: '14px' }}>{mod.title}</div>
                  </div>
                  <button onClick={e => { e.stopPropagation(); setEditTask(mod) }} className="btn btn-ghost btn-icon btn-sm"><Pencil size={12} /></button>
                </div>
                {mod.description && <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '10px' }}>{mod.description}</div>}
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px', fontFamily: 'var(--font-mono)' }}>
                  {dCount}/{tCount} tâches
                </div>
                <div className="progress-track" style={{ height: '5px' }}>
                  <div className="progress-fill" style={{ width: `${pct}%`, background: pct === 100 ? '#059669' : cat?.color }} />
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* TASKS VIEW */}
      {view === 'tasks' && (
        <>
          {/* Filters */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
            <select className="input" style={{ width: 'auto', fontSize: '12px', padding: '6px 10px' }}
              value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="all">Tous statuts</option>
              {STATUSES.map(s => <option key={s.value} value={s.value}>{s.value}</option>)}
            </select>
            <select className="input" style={{ width: 'auto', fontSize: '12px', padding: '6px 10px' }}
              value={filterUser} onChange={e => setFilterUser(e.target.value)}>
              <option value="all">Tous les membres</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>

          <div className="surface" style={{ overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: '9px 12px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', background: 'var(--surface-2)', minWidth: '240px' }}>Tâche</th>
                  <th style={{ padding: '9px 12px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', background: 'var(--surface-2)' }}>Statut</th>
                  <th style={{ padding: '9px 12px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', background: 'var(--surface-2)' }}>Urgence</th>
                  <th style={{ padding: '9px 12px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', background: 'var(--surface-2)' }}>Assigné</th>
                  <th style={{ padding: '9px 12px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', background: 'var(--surface-2)' }}>Échéance</th>
                  <th style={{ padding: '9px 12px', background: 'var(--surface-2)' }}></th>
                </tr>
              </thead>
              <tbody>
                {realTasks.length === 0 ? (
                  <tr><td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Aucune tâche dans ce module</td></tr>
                ) : realTasks.map(task => {
                  const cat = CATEGORIES.find(c => c.value === task.category)
                  const sta = STATUSES.find(s => s.value === task.status)
                  const urg = URGENCIES.find(u => u.value === task.urgency)
                  const assignees: any[] = (task as any).assignees || []

                  return (
                    <tr key={task.id} style={{ borderBottom: '1px solid var(--border)', opacity: task.status === 'Terminé' ? 0.55 : 1 }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#F8F9FB'}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ''}>
                      <td style={{ padding: '10px 12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {!task.validated && <span style={{ fontSize: '10px', background: '#FFF3EE', color: 'var(--accent)', padding: '1px 5px', borderRadius: '4px', fontFamily: 'var(--font-mono)' }}>⏳</span>}
                          <button onClick={() => setQuickTask(task)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: 0 }}>
                            <div style={{ fontWeight: '500', fontSize: '13px', color: 'var(--text)', textDecoration: 'none' }}
                              onMouseEnter={e => (e.target as HTMLElement).style.textDecoration = 'underline'}
                              onMouseLeave={e => (e.target as HTMLElement).style.textDecoration = 'none'}>
                              {task.title}
                            </div>
                          </button>
                          {(task as any).progress > 0 && task.status !== 'Terminé' && (
                            <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>{(task as any).progress}%</span>
                          )}
                        </div>
                        {task.description && <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{task.description}</div>}
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <select value={task.status} onChange={e => updateStatus(task.id, e.target.value)}
                          style={{ fontSize: '12px', padding: '3px 8px', background: sta?.bg, color: sta?.color, border: `1px solid ${sta?.border}`, borderRadius: '100px', cursor: 'pointer', fontFamily: 'var(--font)', fontWeight: '500' }}>
                          {STATUSES.map(s => <option key={s.value} value={s.value}>{s.value}</option>)}
                        </select>
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: urg?.dot }} />
                          <span style={{ fontSize: '12px' }}>{task.urgency}</span>
                        </div>
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        {assignees.length > 0 ? (
                          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                            {assignees.map((a: any) => {
                              const validated = ((task as any).validations || []).includes(a.id)
                              const isMe = a.id === user.id
                              return (
                                <div key={a.id} title={`${a.name} — ${validated ? 'Validé ✓' : 'En attente'}`}
                                  onClick={() => isMe && toggleValidation(task, user.id)}
                                  style={{ position: 'relative', width: '24px', height: '24px', borderRadius: '50%', background: validated ? `${a.avatar_color}30` : `${a.avatar_color}15`, border: `2px solid ${validated ? a.avatar_color : a.avatar_color + '40'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: '600', color: a.avatar_color, cursor: isMe ? 'pointer' : 'default', transition: 'all 0.15s' }}>
                                  {validated ? '✓' : a.name[0]}
                                </div>
                              )
                            })}
                          </div>
                        ) : <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>—</span>}
                      </td>
                      <td style={{ padding: '10px 12px', fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                        {task.due_date ? new Date(task.due_date).toLocaleDateString('fr-FR') : '—'}
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
                          {!task.validated && user.role === 'admin' && (
                            <button onClick={async () => { await supabase.from('tasks').update({ validated: true }).eq('id', task.id); setTasks(prev => prev.map(t => t.id === task.id ? { ...t, validated: true } : t)) }}
                              className="btn btn-sm btn-primary" style={{ padding: '3px 8px', fontSize: '11px' }}>
                              <Check size={11} /> Valider
                            </button>
                          )}
                          <button onClick={() => setEditTask(task)} className="btn btn-ghost btn-icon btn-sm"><Pencil size={12} /></button>
                          {user.role === 'admin' && (
                            <button onClick={() => deleteItem(task.id)} className="btn btn-ghost btn-icon btn-sm" style={{ color: '#DC2626' }}
                              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#FEE2E2'}
                              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
                              <Trash2 size={12} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* CREATE MODAL */}
      {showCreate && (
        <Modal onClose={() => setShowCreate(false)}>
          <CreateModal
            view={view} onClose={() => setShowCreate(false)} onSave={createItem}
            users={users} currentUser={user}
            projectName={selectedProject?.title} moduleName={selectedModule?.title}
          />
        </Modal>
      )}

      {/* EDIT MODAL */}
      {editTask && (
        <Modal onClose={() => setEditTask(null)}>
          <EditTaskModal task={editTask} onClose={() => setEditTask(null)} onSave={updateItem} onDelete={deleteItem} users={users} currentUser={user} />
        </Modal>
      )}

      {/* QUICK TASK MODAL */}
      {quickTask && (
        <Modal onClose={() => setQuickTask(null)}>
          <QuickTaskModal
            task={quickTask} onClose={() => setQuickTask(null)}
            currentUser={user} users={users}
            onProgressUpdate={async (progress: number) => {
              const newStatus = progress === 100 ? 'Terminé' : progress > 0 ? 'En cours' : 'À faire'
              await supabase.from('tasks').update({ progress, status: newStatus }).eq('id', quickTask.id)
              setTasks(prev => prev.map(t => t.id === quickTask.id ? { ...t, progress, status: newStatus as any } : t))
              setQuickTask(prev => prev ? { ...prev, progress, status: newStatus as any } : null)
            }}
            onValidate={() => toggleValidation(quickTask, user.id).then(() => {
              setQuickTask(prev => {
                if (!prev) return null
                const current: string[] = (prev as any).validations || []
                const isVal = current.includes(user.id)
                return { ...prev, validations: isVal ? current.filter(id => id !== user.id) : [...current, user.id] } as any
              })
            })}
          />
        </Modal>
      )}
    </div>
  )
}

function CreateModal({ view, onClose, onSave, users, currentUser, projectName, moduleName }: any) {
  const [form, setForm] = useState({
    title: '', description: '', category: 'Dev', urgency: 'Normal',
    assigned_users: [] as string[], due_date: '',
  })

  const label = view === 'projects' ? 'Nouveau projet' : view === 'modules' ? `Nouveau module — ${projectName}` : `Nouvelle tâche — ${moduleName}`

  return (
    <>
      <div className="modal-header">
        <div style={{ fontWeight: '600', fontSize: '15px' }}>{label}</div>
        <button onClick={onClose} className="btn btn-ghost btn-icon"><X size={16} /></button>
      </div>
      <div className="modal-body">
        <div className="field"><label className="label">Titre *</label>
          <input className="input" placeholder="Nom..." value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} autoFocus />
        </div>
        <div className="field"><label className="label">Description</label>
          <textarea className="input" rows={2} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div className="field"><label className="label">Catégorie</label>
            <select className="input" value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}>
              {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.value}</option>)}
            </select>
          </div>
          {view === 'tasks' && (
            <div className="field"><label className="label">Urgence</label>
              <select className="input" value={form.urgency} onChange={e => setForm(p => ({ ...p, urgency: e.target.value }))}>
                {URGENCIES.map(u => <option key={u.value} value={u.value}>{u.value}</option>)}
              </select>
            </div>
          )}
        </div>
        {view === 'tasks' && (
          <>
            <div className="field"><label className="label">Assigné à</label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {users.map((u: any) => {
                  const checked = form.assigned_users.includes(u.id)
                  return (
                    <button key={u.id} type="button"
                      onClick={() => setForm(p => ({ ...p, assigned_users: checked ? p.assigned_users.filter(id => id !== u.id) : [...p.assigned_users, u.id] }))}
                      style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '5px 10px', borderRadius: '100px', cursor: 'pointer', border: `2px solid ${checked ? u.avatar_color : 'var(--border-dark)'}`, background: checked ? u.avatar_color + '15' : 'var(--surface)', fontFamily: 'var(--font)', fontSize: '12px', color: checked ? u.avatar_color : 'var(--text-2)' }}>
                      <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: u.avatar_color + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontWeight: '700', color: u.avatar_color }}>{u.name[0]}</div>
                      {u.name}
                    </button>
                  )
                })}
              </div>
            </div>
            <div className="field"><label className="label">Échéance</label>
              <input type="date" className="input" value={form.due_date} onChange={e => setForm(p => ({ ...p, due_date: e.target.value }))} />
            </div>
          </>
        )}
        {currentUser.role !== 'admin' && view === 'tasks' && (
          <div className="alert alert-warning">Cette tâche sera soumise à validation par Yohann.</div>
        )}
      </div>
      <div className="modal-footer">
        <button onClick={onClose} className="btn btn-secondary">Annuler</button>
        <button onClick={() => form.title.trim() && onSave(form)} className="btn btn-primary" disabled={!form.title.trim()}>Créer</button>
      </div>
    </>
  )
}

function EditTaskModal({ task, onClose, onSave, onDelete, users, currentUser }: any) {
  const [form, setForm] = useState({ title: task.title, description: task.description || '', category: task.category, urgency: task.urgency, status: task.status, assigned_users: (task as any).assigned_users || [], due_date: task.due_date || '' })
  const [confirmDelete, setConfirmDelete] = useState(false)
  const isTask = (task.level || 0) === 2

  return (
    <>
      <div className="modal-header">
        <div style={{ fontWeight: '600', fontSize: '15px' }}>Modifier — {task.level === 0 ? 'Projet' : task.level === 1 ? 'Module' : 'Tâche'}</div>
        <button onClick={onClose} className="btn btn-ghost btn-icon"><X size={16} /></button>
      </div>
      <div className="modal-body">
        <div className="field"><label className="label">Titre</label>
          <input className="input" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
        </div>
        <div className="field"><label className="label">Description</label>
          <textarea className="input" rows={2} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div className="field"><label className="label">Catégorie</label>
            <select className="input" value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}>
              {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.value}</option>)}
            </select>
          </div>
          {isTask && <div className="field"><label className="label">Statut</label>
            <select className="input" value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value as any }))}>
              {STATUSES.map(s => <option key={s.value} value={s.value}>{s.value}</option>)}
            </select>
          </div>}
        </div>
        {isTask && (
          <>
            <div className="field"><label className="label">Urgence</label>
              <select className="input" value={form.urgency} onChange={e => setForm(p => ({ ...p, urgency: e.target.value as any }))}>
                {URGENCIES.map(u => <option key={u.value} value={u.value}>{u.value}</option>)}
              </select>
            </div>
            <div className="field"><label className="label">Assigné à</label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {users.map((u: any) => {
                  const checked = form.assigned_users.includes(u.id)
                  return (
                    <button key={u.id} type="button"
                      onClick={() => setForm(p => ({ ...p, assigned_users: checked ? p.assigned_users.filter((id: string) => id !== u.id) : [...p.assigned_users, u.id] }))}
                      style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '5px 10px', borderRadius: '100px', cursor: 'pointer', border: `2px solid ${checked ? u.avatar_color : 'var(--border-dark)'}`, background: checked ? u.avatar_color + '15' : 'var(--surface)', fontFamily: 'var(--font)', fontSize: '12px', color: checked ? u.avatar_color : 'var(--text-2)' }}>
                      <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: u.avatar_color + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontWeight: '700', color: u.avatar_color }}>{u.name[0]}</div>
                      {u.name}
                    </button>
                  )
                })}
              </div>
            </div>
            <div className="field"><label className="label">Échéance</label>
              <input type="date" className="input" value={form.due_date} onChange={e => setForm(p => ({ ...p, due_date: e.target.value }))} />
            </div>
          </>
        )}
        {confirmDelete && <div className="alert alert-warning">Supprimer cet élément et tout son contenu ?<div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}><button onClick={() => onDelete(task.id)} className="btn btn-sm" style={{ background: '#DC2626', color: 'white', border: 'none' }}>Confirmer</button><button onClick={() => setConfirmDelete(false)} className="btn btn-sm btn-secondary">Annuler</button></div></div>}
      </div>
      <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
        {currentUser.role === 'admin' && !confirmDelete && <button onClick={() => setConfirmDelete(true)} className="btn btn-ghost" style={{ color: '#DC2626', fontSize: '12px' }}><Trash2 size={13} /> Supprimer</button>}
        <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto' }}>
          <button onClick={onClose} className="btn btn-secondary">Annuler</button>
          <button onClick={() => form.title.trim() && onSave(task.id, form)} className="btn btn-primary" disabled={!form.title.trim()}>Sauvegarder</button>
        </div>
      </div>
    </>
  )
}

function QuickTaskModal({ task, onClose, currentUser, users, onProgressUpdate, onValidate }: any) {
  const [progress, setProgress] = useState((task as any).progress || 0)
  const [comment, setComment] = useState('')
  const [comments, setComments] = useState<any[]>([])
  const [saving, setSaving] = useState(false)
  const cat = CATEGORIES.find(c => c.value === task.category)
  const assignees: any[] = (task as any).assignees || []
  const validations: string[] = (task as any).validations || []
  const assignedUsers: string[] = (task as any).assigned_users || []
  const isAssigned = assignedUsers.includes(currentUser.id)
  const isValidated = validations.includes(currentUser.id)
  const allValidated = assignedUsers.length > 0 && assignedUsers.every(id => validations.includes(id))

  useEffect(() => {
    supabase.from('comments').select('*, user:user_id(name, avatar_color)').eq('task_id', task.id).order('created_at', { ascending: true })
      .then(({ data }) => { if (data) setComments(data) })
  }, [task.id])

  const submitComment = async () => {
    if (!comment.trim()) return
    setSaving(true)
    const { data } = await supabase.from('comments').insert({ task_id: task.id, user_id: currentUser.id, content: comment })
      .select('*, user:user_id(name, avatar_color)').single()
    if (data) setComments(prev => [...prev, data])
    setComment('')
    setSaving(false)
  }

  return (
    <>
      <div className="modal-header">
        <div>
          <div style={{ fontWeight: '600', fontSize: '15px' }}>{task.title}</div>
          {task.description && <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>{task.description}</div>}
        </div>
        <button onClick={onClose} className="btn btn-ghost btn-icon"><X size={16} /></button>
      </div>
      <div className="modal-body">

        {/* Status + Assignees */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="badge" style={{ background: cat?.bg, color: cat?.color, borderColor: cat?.border }}>{task.category}</span>
          <div style={{ display: 'flex', gap: '4px' }}>
            {assignees.map((a: any) => {
              const val = validations.includes(a.id)
              return (
                <div key={a.id} title={`${a.name} — ${val ? 'Validé ✓' : 'En attente'}`}
                  style={{ width: '26px', height: '26px', borderRadius: '50%', background: val ? `${a.avatar_color}30` : `${a.avatar_color}15`, border: `2px solid ${val ? a.avatar_color : a.avatar_color + '50'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '700', color: a.avatar_color }}>
                  {val ? '✓' : a.name[0]}
                </div>
              )
            })}
          </div>
        </div>

        {/* Validation multi-owners */}
        {assignedUsers.length > 1 && (
          <div style={{ background: allValidated ? '#ECFDF5' : '#F9FAFB', border: `1px solid ${allValidated ? '#A7F3D0' : 'var(--border)'}`, borderRadius: '8px', padding: '12px' }}>
            <div style={{ fontSize: '12px', fontWeight: '600', marginBottom: '8px', color: allValidated ? '#059669' : 'var(--text-muted)' }}>
              {allValidated ? '✅ Tâche validée par tous' : `⏳ ${validations.length}/${assignedUsers.length} validations`}
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {assignees.map((a: any) => {
                const val = validations.includes(a.id)
                return (
                  <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '4px 10px', borderRadius: '100px', background: val ? `${a.avatar_color}15` : 'var(--surface)', border: `1px solid ${val ? a.avatar_color : 'var(--border-dark)'}` }}>
                    <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: a.avatar_color + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '8px', fontWeight: '700', color: a.avatar_color }}>{a.name[0]}</div>
                    <span style={{ fontSize: '12px', color: val ? a.avatar_color : 'var(--text-muted)', fontWeight: val ? '600' : '400' }}>{a.name}</span>
                    {val ? <CheckCircle2 size={12} color={a.avatar_color} /> : <Clock size={12} color="var(--text-dim)" />}
                  </div>
                )
              })}
            </div>
            {isAssigned && (
              <button onClick={onValidate} className={`btn btn-sm ${isValidated ? 'btn-secondary' : 'btn-primary'}`}
                style={{ marginTop: '10px', fontSize: '12px' }}>
                {isValidated ? '↩ Annuler ma validation' : '✓ Marquer comme fait'}
              </button>
            )}
          </div>
        )}

        {/* Solo validation */}
        {assignedUsers.length === 1 && isAssigned && (
          <button onClick={onValidate} className={`btn ${isValidated ? 'btn-secondary' : 'btn-primary'}`}
            style={{ width: '100%', justifyContent: 'center', fontSize: '13px' }}>
            {isValidated ? '↩ Annuler ma validation' : '✓ Marquer comme fait'}
          </button>
        )}

        {/* Progress slider */}
        {!allValidated && (
          <div className="field">
            <label className="label">Avancement — {progress}%</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ flex: 1 }}>
                <div style={{ height: '6px', background: 'var(--border)', borderRadius: '100px', overflow: 'hidden', marginBottom: '6px' }}>
                  <div style={{ height: '100%', borderRadius: '100px', width: `${progress}%`, background: progress === 100 ? '#059669' : cat?.color, transition: 'width 0.3s ease' }} />
                </div>
                <input type="range" min="0" max="100" step="5" value={progress}
                  onChange={e => setProgress(parseInt(e.target.value))}
                  style={{ width: '100%', accentColor: cat?.color, cursor: 'pointer' }} />
              </div>
              <button onClick={() => onProgressUpdate(progress)} className="btn btn-sm btn-primary" style={{ fontSize: '12px' }}>OK</button>
            </div>
          </div>
        )}

        {/* Comments */}
        <div className="field">
          <label className="label">Commentaires ({comments.length})</label>
          {comments.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '10px', maxHeight: '200px', overflowY: 'auto' }}>
              {comments.map((c: any) => (
                <div key={c.id} style={{ display: 'flex', gap: '8px' }}>
                  <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: c.user?.avatar_color + '20', border: `1.5px solid ${c.user?.avatar_color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: '700', color: c.user?.avatar_color, flexShrink: 0 }}>
                    {c.user?.name?.[0]}
                  </div>
                  <div style={{ flex: 1, background: 'var(--surface-2)', borderRadius: '8px', padding: '8px 10px' }}>
                    <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '3px' }}>{c.user?.name}</div>
                    <div style={{ fontSize: '13px', lineHeight: 1.4 }}>{c.content}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div style={{ display: 'flex', gap: '8px' }}>
            <input className="input" placeholder="Ajouter un commentaire..." value={comment}
              onChange={e => setComment(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && submitComment()} />
            <button onClick={submitComment} disabled={!comment.trim() || saving} className="btn btn-primary" style={{ flexShrink: 0 }}>
              Envoyer
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
