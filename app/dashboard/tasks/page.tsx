'use client'
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Task, User } from '@/types'
import { CATEGORIES, STATUSES, URGENCIES } from '@/lib/constants'
import { buildTaskTree, calcProgress, countLeaves } from '@/lib/taskTree'
import { Plus, ChevronRight, ChevronDown, X, Check, Folder, FileText, Minus } from 'lucide-react'

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
  const [form, setForm] = useState({
    title: '', description: '',
    category: parentTask?.category || 'Dev',
    urgency: 'Normal',
    assigned_to: '',
    due_date: '',
    status: 'À faire',
    parent_id: parentTask?.id || '',
  })

  // Eligible parents: root tasks and level-1 tasks only (max level 1 for parent, so child = level 2)
  const eligibleParents = tasks.filter(t => (t.level || 0) < 2)

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <div style={{ fontWeight: '600', fontSize: '15px' }}>
              {parentTask ? `Sous-tâche de "${parentTask.title}"` : 'Nouvelle tâche'}
            </div>
            {parentTask && (
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                Niveau {(parentTask.level || 0) + 1}
              </div>
            )}
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-icon"><X size={16} /></button>
        </div>

        <div className="modal-body">
          <div className="field">
            <label className="label">Titre *</label>
            <input className="input" placeholder="Nom de la tâche..."
              value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
          </div>

          <div className="field">
            <label className="label">Description</label>
            <textarea className="input" placeholder="Détails optionnels..." rows={2}
              value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
          </div>

          {/* Parent task selector (only if not already set) */}
          {!parentTask && (
            <div className="field">
              <label className="label">Tâche parente (optionnel)</label>
              <select className="input" value={form.parent_id}
                onChange={e => setForm(p => ({ ...p, parent_id: e.target.value }))}>
                <option value="">Aucune (tâche racine)</option>
                {eligibleParents.map(t => (
                  <option key={t.id} value={t.id}>
                    {'  '.repeat(t.level || 0)}{t.level === 1 ? '↳ ' : ''}{t.title}
                  </option>
                ))}
              </select>
            </div>
          )}

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
                onChange={e => setForm(p => ({ ...p, urgency: e.target.value }))}>
                {URGENCIES.map(u => <option key={u.value} value={u.value}>{u.value}</option>)}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="field">
              <label className="label">Assigné à</label>
              <select className="input" value={form.assigned_to}
                onChange={e => setForm(p => ({ ...p, assigned_to: e.target.value }))}>
                <option value="">Non assigné</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
            <div className="field">
              <label className="label">Échéance</label>
              <input type="date" className="input" value={form.due_date}
                onChange={e => setForm(p => ({ ...p, due_date: e.target.value }))} />
            </div>
          </div>

          {currentUser.role !== 'admin' && (
            <div className="alert alert-warning">
              ⚠️ Cette tâche sera soumise à validation par Yohann avant d'être active.
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button onClick={onClose} className="btn btn-secondary">Annuler</button>
          <button
            onClick={() => form.title.trim() && onSave(form)}
            className="btn btn-primary"
            disabled={!form.title.trim()}
          >
            Créer
          </button>
        </div>
      </div>
    </div>
  )
}

function TaskRow({
  task, depth, users, currentUser,
  onAddChild, onStatusChange, onValidate, allTasks,
  expandedIds, toggleExpand,
}: {
  task: Task
  depth: number
  users: User[]
  currentUser: User
  onAddChild: (parent: Task) => void
  onStatusChange: (id: string, status: string) => void
  onValidate: (id: string) => void
  allTasks: Task[]
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
  const assignee = (task as any).assignee
  const canAddChild = (task.level || 0) < 2

  return (
    <>
      <tr style={{ opacity: task.status === 'Terminé' ? 0.55 : 1 }}>
        {/* Expand + title */}
        <td style={{ paddingLeft: `${12 + depth * 20}px` }}>
          <div className="task-row" style={{ gap: '6px' }}>
            {/* Expand button */}
            <div style={{ width: '18px', flexShrink: 0 }}>
              {hasChildren ? (
                <button className="task-expand-btn" onClick={() => toggleExpand(task.id)}>
                  {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                </button>
              ) : null}
            </div>

            {/* Icon */}
            {hasChildren
              ? <Folder size={13} color={cat?.color} style={{ flexShrink: 0 }} />
              : <FileText size={13} color="var(--text-dim)" style={{ flexShrink: 0 }} />
            }

            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: hasChildren ? '600' : '400', fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '280px' }}>
                {task.title}
              </div>
              {hasChildren && (
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                  {leaves.done}/{leaves.total} sous-tâches
                </div>
              )}
            </div>
          </div>
        </td>

        {/* Category */}
        <td>
          <span className="badge" style={{ background: cat?.bg, color: cat?.color, borderColor: cat?.border }}>
            {task.category}
          </span>
        </td>

        {/* Status */}
        <td>
          <select
            value={task.status}
            onChange={e => onStatusChange(task.id, e.target.value)}
            style={{
              fontSize: '12px', padding: '3px 8px',
              background: sta?.bg, color: sta?.color,
              border: `1px solid ${sta?.border}`,
              borderRadius: '100px', cursor: 'pointer',
              fontFamily: 'var(--font)',
              fontWeight: '500',
            }}
          >
            {STATUSES.map(s => <option key={s.value} value={s.value}>{s.value}</option>)}
          </select>
        </td>

        {/* Urgency */}
        <td>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <div className="badge-dot" style={{ background: urg?.dot }} />
            <span style={{ fontSize: '12px', color: 'var(--text-2)' }}>{task.urgency}</span>
          </div>
        </td>

        {/* Progress */}
        <td style={{ minWidth: '100px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div className="progress-track" style={{ flex: 1 }}>
              <div className="progress-fill" style={{
                width: `${progress}%`,
                background: progress === 100 ? '#059669' : cat?.color,
              }} />
            </div>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', minWidth: '28px' }}>
              {progress}%
            </span>
          </div>
        </td>

        {/* Assignee */}
        <td>
          {assignee ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <div className="avatar" style={{
                width: '22px', height: '22px',
                background: `${assignee.avatar_color}15`,
                border: `1.5px solid ${assignee.avatar_color}40`,
                fontSize: '10px', color: assignee.avatar_color,
              }}>{assignee.name[0]}</div>
              <span style={{ fontSize: '12px' }}>{assignee.name}</span>
            </div>
          ) : (
            <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>—</span>
          )}
        </td>

        {/* Actions */}
        <td>
          <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
            {!task.validated && currentUser.role === 'admin' && (
              <button onClick={() => onValidate(task.id)} className="btn btn-sm btn-primary" style={{ padding: '3px 8px', fontSize: '11px' }}>
                <Check size={11} /> Valider
              </button>
            )}
            {canAddChild && (
              <button onClick={() => onAddChild(task)} className="btn btn-sm btn-secondary" title="Ajouter une sous-tâche">
                <Plus size={11} /> Sous-tâche
              </button>
            )}
          </div>
        </td>
      </tr>

      {/* Children */}
      {hasChildren && isExpanded && task.children!.map(child => (
        <TaskRow
          key={child.id}
          task={child}
          depth={depth + 1}
          users={users}
          currentUser={currentUser}
          onAddChild={onAddChild}
          onStatusChange={onStatusChange}
          onValidate={onValidate}
          allTasks={allTasks}
          expandedIds={expandedIds}
          toggleExpand={toggleExpand}
        />
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
      supabase.from('tasks').select('*, assignee:assigned_to(*), creator:created_by(*)').order('created_at', { ascending: false }),
      supabase.from('users').select('*')
    ])
    if (t) setTasks(t as any)
    if (u) setUsers(u)
    setLoading(false)
  }

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
      status: form.status,
      assigned_to: form.assigned_to || null,
      due_date: form.due_date || null,
      created_by: user.id,
      validated: user.role === 'admin',
      progress: 0,
      parent_id: form.parent_id || null,
      level,
    }).select('*, assignee:assigned_to(*), creator:created_by(*)').single()
    if (data) {
      setTasks(prev => [data as any, ...prev])
      if (form.parent_id) {
        setExpandedIds(prev => { const next = new Set(Array.from(prev)); next.add(form.parent_id); return next })
      }
    }
    setShowModal(false)
    setParentForModal(null)
  }

  const updateStatus = async (taskId: string, status: string) => {
    await supabase.from('tasks').update({ status, progress: status === 'Terminé' ? 100 : undefined }).eq('id', taskId)
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: status as any, progress: status === 'Terminé' ? 100 : t.progress } : t))
  }

  const validateTask = async (taskId: string) => {
    await supabase.from('tasks').update({ validated: true }).eq('id', taskId)
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, validated: true } : t))
  }

  // Filter root-level only, children come via tree
  const filteredFlat = tasks.filter(t => {
    if (t.parent_id) return false // children handled by tree
    if (filterCat !== 'all' && t.category !== filterCat) return false
    if (filterStatus !== 'all' && t.status !== filterStatus) return false
    if (filterUser !== 'all' && t.assigned_to !== filterUser) return false
    return true
  })

  // Build trees for filtered roots
  const allMap: Record<string, Task & { children: Task[] }> = {}
  tasks.forEach(t => { allMap[t.id] = { ...t, children: [] } })
  tasks.forEach(t => {
    if (t.parent_id && allMap[t.parent_id]) {
      allMap[t.parent_id].children.push(allMap[t.id])
    }
  })
  const treeRoots = filteredFlat.map(t => allMap[t.id]).filter(Boolean)

  if (!user) return null

  return (
    <div className="animate-in">
      <div className="page-header">
        <div>
          <div className="page-title">Tâches</div>
          <div className="page-sub">{treeRoots.length} tâches racines · {tasks.filter(t => t.status === 'Terminé').length} terminées</div>
        </div>
        <button onClick={() => { setParentForModal(null); setShowModal(true) }} className="btn btn-primary">
          <Plus size={14} /> Nouvelle tâche
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <select className="input" style={{ width: 'auto', fontSize: '12px', padding: '6px 10px' }}
          value={filterCat} onChange={e => setFilterCat(e.target.value)}>
          <option value="all">Toutes catégories</option>
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

      {/* Table */}
      <div className="surface" style={{ overflow: 'hidden' }}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th style={{ minWidth: '280px' }}>Tâche</th>
                <th>Catégorie</th>
                <th>Statut</th>
                <th>Urgence</th>
                <th style={{ minWidth: '120px' }}>Progression</th>
                <th>Assigné</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Chargement...</td></tr>
              ) : treeRoots.length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Aucune tâche</td></tr>
              ) : treeRoots.map(task => (
                <TaskRow
                  key={task.id}
                  task={task as any}
                  depth={0}
                  users={users}
                  currentUser={user}
                  onAddChild={(parent) => { setParentForModal(parent); setShowModal(true) }}
                  onStatusChange={updateStatus}
                  onValidate={validateTask}
                  allTasks={tasks}
                  expandedIds={expandedIds}
                  toggleExpand={toggleExpand}
                />
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
    </div>
  )
}
