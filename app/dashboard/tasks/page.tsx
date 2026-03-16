'use client'
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Task, User } from '@/types'
import { CATEGORIES, STATUSES, URGENCIES } from '@/lib/constants'
import { countLeaves } from '@/lib/taskTree'
import { Plus, ChevronRight, ChevronDown, X, Check, Folder, FileText, Pencil, Trash2 } from 'lucide-react'
import { Modal } from '@/components/Modal'

type TaskLevel = 'root' | 'sub' | 'subsub'

function TaskModal({
  onClose, onSave, users, currentUser, parentTask, tasks
}: {
  onClose: () => void
  onSave: (data: any) => void
  users: User[]
  currentUser: User
  parentTask?: Task | null
  tasks: Task[]
}) {
  const initLevel: TaskLevel = !parentTask ? 'root' : (parentTask.level || 0) === 0 ? 'sub' : 'subsub'
  const [level, setLevel] = useState<TaskLevel>(initLevel)
  const [form, setForm] = useState({
    title: '', description: '',
    category: parentTask?.category || 'Dev',
    urgency: 'Normal',
    assigned_users: [] as string[],
    due_date: '',
    status: 'À faire',
    parent_id: parentTask?.id || '',
  })

  const rootTasks = tasks.filter(t => (t.level || 0) === 0)
  const subTasks = tasks.filter(t => (t.level || 0) === 1)

  const handleLevelChange = (l: TaskLevel) => {
    setLevel(l)
    setForm(p => ({ ...p, parent_id: '' }))
  }

  const LEVEL_OPTIONS: { value: TaskLevel; label: string; icon: string; desc: string }[] = [
    { value: 'root', label: 'Tache principale', icon: 'F', desc: 'Niveau 1 - ex: Dev MVP' },
    { value: 'sub', label: 'Sous-tache', icon: 'D', desc: 'Niveau 2 - ex: Dev Accueil' },
    { value: 'subsub', label: 'Sous-sous-tache', icon: 'C', desc: 'Niveau 3 - ex: Creer la page' },
  ]

  const needsParent = level === 'sub' || level === 'subsub'
  const canCreate = form.title.trim() && (!needsParent || form.parent_id)

  return (
    <Modal onClose={onClose} maxWidth={560}>
        <div className="modal-header">
          <div style={{ fontWeight: '600', fontSize: '15px' }}>Nouvelle tache</div>
          <button onClick={onClose} className="btn btn-ghost btn-icon"><X size={16} /></button>
        </div>

        <div className="modal-body">
          <div className="field">
            <label className="label">Type de tâche</label>
            <div style={{ display: 'flex', gap: '6px' }}>
              {LEVEL_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => handleLevelChange(opt.value)}
                  style={{
                    flex: 1,
                    padding: '7px 6px',
                    border: `2px solid ${level === opt.value ? 'var(--accent)' : 'var(--border-dark)'}`,
                    borderRadius: '6px',
                    background: level === opt.value ? '#FFF3EE' : 'var(--surface)',
                    cursor: 'pointer',
                    textAlign: 'center',
                    transition: 'all 0.15s',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '5px',
                  }}
                >
                  <span style={{ fontSize: '13px' }}>
                    {opt.value === 'root' ? '📁' : opt.value === 'sub' ? '📄' : '✅'}
                  </span>
                  <span style={{ fontSize: '12px', fontWeight: '600', color: level === opt.value ? 'var(--accent)' : 'var(--text)' }}>
                    {opt.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {level === 'sub' && (
            <div className="field">
              <label className="label">Tache parente *</label>
              <select className="input" value={form.parent_id}
                onChange={e => setForm(p => ({ ...p, parent_id: e.target.value }))}>
                <option value="">Choisir une tache principale...</option>
                {rootTasks.map(t => (
                  <option key={t.id} value={t.id}>{t.title}</option>
                ))}
              </select>
            </div>
          )}

          {level === 'subsub' && (
            <div className="field">
              <label className="label">Sous-tache parente *</label>
              <select className="input" value={form.parent_id}
                onChange={e => setForm(p => ({ ...p, parent_id: e.target.value }))}>
                <option value="">Choisir une sous-tache...</option>
                {subTasks.map(t => (
                  <option key={t.id} value={t.id}>{t.title}</option>
                ))}
              </select>
            </div>
          )}

          <div className="field">
            <label className="label">Titre *</label>
            <input className="input" placeholder="Nom de la tache..."
              value={form.title}
              onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
              autoFocus />
          </div>

          <div className="field">
            <label className="label">Description</label>
            <textarea className="input" placeholder="Details optionnels..." rows={2}
              value={form.description}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="field">
              <label className="label">Categorie</label>
              <select className="input" value={form.category}
                onChange={e => setForm(p => ({ ...p, category: e.target.value as any }))}>
                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.value}</option>)}
              </select>
            </div>
            <div className="field">
              <label className="label">Urgence</label>
              <select className="input" value={form.urgency}
                onChange={e => setForm(p => ({ ...p, urgency: e.target.value as any }))}>
                {URGENCIES.map(u => <option key={u.value} value={u.value}>{u.value}</option>)}
              </select>
            </div>
          </div>

          <div className="field">
            <label className="label">Assigne a (plusieurs possible)</label>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {users.map(u => {
                const checked = form.assigned_users.includes(u.id)
                return (
                  <button key={u.id} type="button"
                    onClick={() => setForm(p => ({
                      ...p,
                      assigned_users: checked
                        ? p.assigned_users.filter((id: string) => id !== u.id)
                        : [...p.assigned_users, u.id]
                    }))}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '6px',
                      padding: '5px 10px', borderRadius: '100px', cursor: 'pointer',
                      border: `2px solid ${checked ? u.avatar_color : 'var(--border-dark)'}`,
                      background: checked ? u.avatar_color + '15' : 'var(--surface)',
                      fontFamily: 'var(--font)', fontSize: '12px', fontWeight: checked ? '600' : '400',
                      color: checked ? u.avatar_color : 'var(--text-2)',
                      transition: 'all 0.15s',
                    }}
                  >
                    <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: u.avatar_color + '20', border: '1.5px solid ' + u.avatar_color + '50', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontWeight: '700', color: u.avatar_color }}>
                      {u.name[0]}
                    </div>
                    {u.name}
                  </button>
                )
              })}
            </div>
          </div>
          <div className="field">
            <label className="label">Echeance</label>
            <input type="date" className="input" value={form.due_date}
              onChange={e => setForm(p => ({ ...p, due_date: e.target.value }))} />
          </div>

          {currentUser.role !== 'admin' && (
            <div className="alert alert-warning">
              Cette tache sera soumise a validation par Yohann avant activation.
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button onClick={onClose} className="btn btn-secondary">Annuler</button>
          <button
            onClick={() => { if (canCreate) onSave(form) }}
            className="btn btn-primary"
            disabled={!canCreate}
          >
            Creer
          </button>
        </div>
    </Modal>
  )
}


function EditModal({
  task, onClose, onSave, onDelete, users, currentUser
}: {
  task: Task
  onClose: () => void
  onSave: (id: string, data: any) => void
  onDelete: (id: string) => void
  users: User[]
  currentUser: User
}) {
  const [form, setForm] = useState({
    title: task.title,
    description: task.description || '',
    category: task.category,
    urgency: task.urgency,
    assigned_users: (task as any).assigned_users || [],
    due_date: task.due_date || '',
    status: task.status,
  })
  const [confirmDelete, setConfirmDelete] = useState(false)

  return (
    <Modal onClose={onClose}>
      <div className="modal-header">
        <div style={{ fontWeight: '600', fontSize: '15px' }}>Modifier la tâche</div>
        <button onClick={onClose} className="btn btn-ghost btn-icon"><X size={16} /></button>
      </div>
      <div className="modal-body">
        <div className="field">
          <label className="label">Titre *</label>
          <input className="input" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
        </div>
        <div className="field">
          <label className="label">Description</label>
          <textarea className="input" rows={2} value={form.description}
            onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div className="field">
            <label className="label">Catégorie</label>
            <select className="input" value={form.category}
              onChange={e => setForm(p => ({ ...p, category: e.target.value as any }))}>
              {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.value}</option>)}
            </select>
          </div>
          <div className="field">
            <label className="label">Urgence</label>
            <select className="input" value={form.urgency}
              onChange={e => setForm(p => ({ ...p, urgency: e.target.value as any }))}>
              {URGENCIES.map(u => <option key={u.value} value={u.value}>{u.value}</option>)}
            </select>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div className="field">
            <label className="label">Statut</label>
            <select className="input" value={form.status}
              onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
              {STATUSES.map(s => <option key={s.value} value={s.value}>{s.value}</option>)}
            </select>
          </div>
          <div className="field">
            <label className="label">Échéance</label>
            <input type="date" className="input" value={form.due_date}
              onChange={e => setForm(p => ({ ...p, due_date: e.target.value }))} />
          </div>
        </div>
        <div className="field">
          <label className="label">Assigné à</label>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {users.map(u => {
              const checked = form.assigned_users.includes(u.id)
              return (
                <button key={u.id} type="button"
                  onClick={() => setForm(p => ({
                    ...p,
                    assigned_users: checked
                      ? p.assigned_users.filter((id: string) => id !== u.id)
                      : [...p.assigned_users, u.id]
                  }))}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    padding: '5px 10px', borderRadius: '100px', cursor: 'pointer',
                    border: `2px solid ${checked ? u.avatar_color : 'var(--border-dark)'}`,
                    background: checked ? u.avatar_color + '15' : 'var(--surface)',
                    fontFamily: 'var(--font)', fontSize: '12px', fontWeight: checked ? '600' : '400',
                    color: checked ? u.avatar_color : 'var(--text-2)',
                  }}>
                  <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: u.avatar_color + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontWeight: '700', color: u.avatar_color }}>
                    {u.name[0]}
                  </div>
                  {u.name}
                </button>
              )
            })}
          </div>
        </div>

        {confirmDelete && (
          <div className="alert alert-warning">
            Supprimer cette tâche et toutes ses sous-tâches ?
            <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
              <button onClick={() => onDelete(task.id)} className="btn btn-sm" style={{ background: '#DC2626', color: 'white', border: 'none' }}>
                Confirmer
              </button>
              <button onClick={() => setConfirmDelete(false)} className="btn btn-sm btn-secondary">Annuler</button>
            </div>
          </div>
        )}
      </div>
      <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
        {currentUser.role === 'admin' && !confirmDelete && (
          <button onClick={() => setConfirmDelete(true)} className="btn btn-ghost" style={{ color: '#DC2626', fontSize: '12px' }}>
            <Trash2 size={13} /> Supprimer
          </button>
        )}
        <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto' }}>
          <button onClick={onClose} className="btn btn-secondary">Annuler</button>
          <button onClick={() => form.title.trim() && onSave(task.id, form)} className="btn btn-primary"
            disabled={!form.title.trim()}>
            Sauvegarder
          </button>
        </div>
      </div>
    </Modal>
  )
}

function TaskRow({
  task, depth, users, currentUser,
  onAddChild, onStatusChange, onValidate, onEdit, onDelete,
  expandedIds, toggleExpand,
}: {
  task: Task
  depth: number
  users: User[]
  currentUser: User
  onAddChild: (parent: Task) => void
  onStatusChange: (id: string, status: string) => void
  onValidate: (id: string) => void
  onEdit: (task: Task) => void
  onDelete: (id: string) => void
  expandedIds: Set<string>
  toggleExpand: (id: string) => void
}) {
  const hasChildren = task.children && task.children.length > 0
  const isExpanded = expandedIds.has(task.id)
  const leaves = countLeaves(task)
  const progress = hasChildren
    ? Math.round((leaves.done / leaves.total) * 100)
    : (task.status === 'Terminé' ? 100 : task.progress || 0)

  const cat = CATEGORIES.find(c => c.value === task.category)
  const sta = STATUSES.find(s => s.value === task.status)
  const urg = URGENCIES.find(u => u.value === task.urgency)
  const assignees: any[] = (task as any).assignees || []
  const canAddChild = (task.level || 0) < 2

  return (
    <>
      <tr style={{ opacity: task.status === 'Terminé' ? 0.55 : 1 }}>
        <td style={{ paddingLeft: `${12 + depth * 20}px` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '18px', flexShrink: 0 }}>
              {hasChildren && (
                <button
                  onClick={() => toggleExpand(task.id)}
                  style={{ width: '18px', height: '18px', border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '3px' }}
                >
                  {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                </button>
              )}
            </div>
            {hasChildren
              ? <Folder size={13} color={cat?.color} style={{ flexShrink: 0 }} />
              : <FileText size={13} color="var(--text-dim)" style={{ flexShrink: 0 }} />
            }
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: hasChildren ? '600' : '400', fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '260px' }}>
                {task.title}
              </div>
              {hasChildren && (
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                  {leaves.done}/{leaves.total} sous-taches
                </div>
              )}
            </div>
          </div>
        </td>

        <td>
          <span className="badge" style={{ background: cat?.bg, color: cat?.color, borderColor: cat?.border }}>
            {task.category}
          </span>
        </td>

        <td>
          <select value={task.status} onChange={e => onStatusChange(task.id, e.target.value)}
            style={{ fontSize: '12px', padding: '3px 8px', background: sta?.bg, color: sta?.color, border: `1px solid ${sta?.border}`, borderRadius: '100px', cursor: 'pointer', fontFamily: 'var(--font)', fontWeight: '500' }}>
            {STATUSES.map(s => <option key={s.value} value={s.value}>{s.value}</option>)}
          </select>
        </td>

        <td>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: urg?.dot, flexShrink: 0 }} />
            <span style={{ fontSize: '12px', color: 'var(--text-2)' }}>{task.urgency}</span>
          </div>
        </td>

        <td style={{ minWidth: '100px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ flex: 1, height: '6px', background: 'var(--border)', borderRadius: '100px', overflow: 'hidden' }}>
              <div style={{ height: '100%', borderRadius: '100px', width: `${progress}%`, background: progress === 100 ? '#059669' : cat?.color, transition: 'width 0.4s ease' }} />
            </div>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', minWidth: '28px' }}>{progress}%</span>
          </div>
        </td>

        <td>
          {assignees.length > 0 ? (
            <div style={{ display: 'flex', gap: '3px' }}>
              {assignees.map((a: any) => (
                <div key={a.id} title={a.name} style={{ width: '22px', height: '22px', borderRadius: '50%', background: `${a.avatar_color}15`, border: `1.5px solid ${a.avatar_color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: '600', color: a.avatar_color, flexShrink: 0 }}>{a.name[0]}</div>
              ))}
            </div>
          ) : <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>-</span>}
        </td>

        <td>
          <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
            {!task.validated && currentUser.role === 'admin' && (
              <button onClick={() => onValidate(task.id)} className="btn btn-sm btn-primary" style={{ padding: '3px 8px', fontSize: '11px' }}>
                <Check size={11} /> Valider
              </button>
            )}
            {canAddChild && (
              <button onClick={() => onAddChild(task)} className="btn btn-sm btn-secondary">
                <Plus size={11} /> Sous-tache
              </button>
            )}
            <button onClick={() => onEdit(task)} className="btn btn-ghost btn-icon btn-sm" title="Modifier">
              <Pencil size={12} />
            </button>
            {currentUser.role === 'admin' && (
              <button onClick={() => onDelete(task.id)} className="btn btn-ghost btn-icon btn-sm" title="Supprimer"
                style={{ color: '#DC2626' }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#FEE2E2'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
                <Trash2 size={12} />
              </button>
            )}
          </div>
        </td>
      </tr>

      {hasChildren && isExpanded && task.children!.map(child => (
        <TaskRow key={child.id} task={child} depth={depth + 1} users={users} currentUser={currentUser}
          onAddChild={onAddChild} onStatusChange={onStatusChange} onValidate={onValidate} onEdit={onEdit} onDelete={onDelete}
          expandedIds={expandedIds} toggleExpand={toggleExpand} />
      ))}
    </>
  )
}

export default function TasksPage() {
  const [user, setUser] = useState<User | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [parentForModal, setParentForModal] = useState<Task | null>(null)
  const [editTask, setEditTask] = useState<Task | null>(null)
  const [filterCat, setFilterCat] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterUser, setFilterUser] = useState('all')
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

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
      // Enrich tasks with assignees from assigned_users array
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
  }

  const enrich = (task: any) => ({
    ...task,
    assignees: (task.assigned_users || []).map((id: string) => {
      return users.find(u => u.id === id)
    }).filter(Boolean)
  })

  const toggleExpand = useCallback((id: string) => {
    setExpandedIds(prev => {
      const next = new Set(Array.from(prev))
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }, [])

  const createTask = async (form: any) => {
    if (!user) return
    const parentTask = form.parent_id ? tasks.find(t => t.id === form.parent_id) : null
    const level = parentTask ? (parentTask.level || 0) + 1 : 0
    const { data } = await supabase.from('tasks').insert({
      title: form.title,
      description: form.description || null,
      category: form.category,
      urgency: form.urgency,
      status: 'À faire',
      assigned_users: form.assigned_users.length > 0 ? form.assigned_users : [],
      due_date: form.due_date || null,
      created_by: user.id,
      validated: user.role === 'admin',
      progress: 0,
      parent_id: form.parent_id || null,
      level,
    }).select('*, creator:created_by(*)').single()
    if (data) {
      setTasks(prev => [enrich(data), ...prev])
      if (form.parent_id) {
        setExpandedIds(prev => {
          const next = new Set(Array.from(prev))
          next.add(form.parent_id)
          return next
        })
      }
    }
    setShowModal(false)
    setParentForModal(null)
  }

  const updateStatus = async (taskId: string, status: string) => {
    await supabase.from('tasks').update({ status }).eq('id', taskId)
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: status as any } : t))
  }

  const validateTask = async (taskId: string) => {
    await supabase.from('tasks').update({ validated: true }).eq('id', taskId)
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, validated: true } : t))
  }

  const updateTask = async (taskId: string, form: any) => {
    const updates = {
      title: form.title,
      description: form.description || null,
      category: form.category,
      urgency: form.urgency,
      status: form.status,
      assigned_users: form.assigned_users,
      due_date: form.due_date || null,
      progress: form.status === 'Terminé' ? 100 : undefined,
    }
    await supabase.from('tasks').update(updates).eq('id', taskId)
    setTasks(prev => prev.map(t => t.id === taskId ? enrich({ ...t, ...updates }) : t))
    setEditTask(null)
  }

  const deleteTask = async (taskId: string) => {
    await supabase.from('tasks').delete().eq('id', taskId)
    // Also delete children
    await supabase.from('tasks').delete().eq('parent_id', taskId)
    setTasks(prev => prev.filter(t => t.id !== taskId && t.parent_id !== taskId))
    setEditTask(null)
  }

  const filteredRoots = tasks.filter(t => {
    if (t.parent_id) return false
    if (filterCat !== 'all' && t.category !== filterCat) return false
    if (filterStatus !== 'all' && t.status !== filterStatus) return false
    if (filterUser !== 'all' && !(t.assigned_users && t.assigned_users.includes(filterUser))) return false
    return true
  })

  const allMap: Record<string, Task & { children: Task[] }> = {}
  tasks.forEach(t => { allMap[t.id] = { ...t, children: [] } })
  tasks.forEach(t => { if (t.parent_id && allMap[t.parent_id]) allMap[t.parent_id].children.push(allMap[t.id]) })
  const treeRoots = filteredRoots.map(t => allMap[t.id]).filter(Boolean)

  if (!user) return null

  return (
    <div className="animate-in">
      <div className="page-header">
        <div>
          <div className="page-title">Taches</div>
          <div className="page-sub">{treeRoots.length} taches racines · {tasks.filter(t => t.status === 'Terminé').length} terminées</div>
        </div>
        <button onClick={() => { setParentForModal(null); setShowModal(true) }} className="btn btn-primary">
          <Plus size={14} /> Nouvelle tache
        </button>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <select className="input" style={{ width: 'auto', fontSize: '12px', padding: '6px 10px' }}
          value={filterCat} onChange={e => setFilterCat(e.target.value)}>
          <option value="all">Toutes categories</option>
          {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.value}</option>)}
        </select>
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
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th style={{ minWidth: '280px' }}>Tache</th>
                <th>Categorie</th>
                <th>Statut</th>
                <th>Urgence</th>
                <th style={{ minWidth: '120px' }}>Progression</th>
                <th>Assigne</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Chargement...</td></tr>
              ) : treeRoots.length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Aucune tache - cree la premiere</td></tr>
              ) : treeRoots.map(task => (
                <TaskRow key={task.id} task={task as any} depth={0} users={users} currentUser={user}
                  onAddChild={(parent) => { setParentForModal(parent); setShowModal(true) }}
                  onStatusChange={updateStatus} onValidate={validateTask}
                  onEdit={setEditTask} onDelete={deleteTask}
                  expandedIds={expandedIds} toggleExpand={toggleExpand} />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <TaskModal
          onClose={() => { setShowModal(false); setParentForModal(null) }}
          onSave={createTask}
          users={users}
          currentUser={user}
          parentTask={parentForModal}
          tasks={tasks}
        />
      )}
      {editTask && (
        <EditModal
          task={editTask}
          onClose={() => setEditTask(null)}
          onSave={updateTask}
          onDelete={deleteTask}
          users={users}
          currentUser={user}
        />
      )}
    </div>
  )
}
