// Shared utilities for Projet/Module/Tâche logic
import { Task, User } from '@/types'

export function buildUserMap(users: User[]): Record<string, User> {
  const map: Record<string, User> = {}
  users.forEach(u => { map[u.id] = u })
  return map
}

export function enrichTask(task: any, userMap: Record<string, User>) {
  return {
    ...task,
    assignees: (task.assigned_users || []).map((id: string) => userMap[id]).filter(Boolean)
  }
}

export function enrichTasks(tasks: any[], userMap: Record<string, User>) {
  return tasks.map(t => enrichTask(t, userMap))
}

export function getProjects(tasks: Task[]) {
  return tasks.filter(t => (t.level || 0) === 0)
}

export function getModules(tasks: Task[], projectId: string) {
  return tasks.filter(t => (t.level || 0) === 1 && t.parent_id === projectId)
}

export function getRealTasks(tasks: Task[], moduleId?: string) {
  if (moduleId) return tasks.filter(t => (t.level || 0) === 2 && t.parent_id === moduleId)
  return tasks.filter(t => (t.level || 0) === 2)
}

export function getTaskContext(task: Task, tasks: Task[]) {
  const module = task.parent_id ? tasks.find(t => t.id === task.parent_id) : null
  const project = module?.parent_id ? tasks.find(t => t.id === module.parent_id) : null
  return { module, project }
}

export function projectProgress(tasks: Task[], projectId: string) {
  const projectTasks = getRealTasks(tasks).filter(t => {
    const module = tasks.find(m => m.id === t.parent_id)
    return module?.parent_id === projectId
  })
  if (projectTasks.length === 0) return 0
  const done = projectTasks.filter(t => t.status === 'Terminé').length
  return Math.round((done / projectTasks.length) * 100)
}
