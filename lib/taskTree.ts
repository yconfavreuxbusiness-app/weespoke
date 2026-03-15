import { Task } from '@/types'

// Build tree structure from flat array
export function buildTaskTree(tasks: Task[]): Task[] {
  const map: Record<string, Task> = {}
  const roots: Task[] = []

  tasks.forEach(t => {
    map[t.id] = { ...t, children: [] }
  })

  tasks.forEach(t => {
    if (t.parent_id && map[t.parent_id]) {
      map[t.parent_id].children!.push(map[t.id])
    } else if (!t.parent_id) {
      roots.push(map[t.id])
    }
  })

  return roots
}

// Calculate progress from leaves
export function calcProgress(task: Task): number {
  if (!task.children || task.children.length === 0) {
    return task.status === 'Terminé' ? 100 : task.progress || 0
  }
  const childProgressValues = task.children.map(c => calcProgress(c))
  return Math.round(childProgressValues.reduce((a, b) => a + b, 0) / childProgressValues.length)
}

// Count total leaves (tasks with no children)
export function countLeaves(task: Task): { total: number; done: number } {
  if (!task.children || task.children.length === 0) {
    return { total: 1, done: task.status === 'Terminé' ? 1 : 0 }
  }
  return task.children.reduce(
    (acc, child) => {
      const { total, done } = countLeaves(child)
      return { total: acc.total + total, done: acc.done + done }
    },
    { total: 0, done: 0 }
  )
}

// Flatten tree to array
export function flattenTree(tasks: Task[]): Task[] {
  const result: Task[] = []
  const traverse = (task: Task) => {
    result.push(task)
    if (task.children) task.children.forEach(traverse)
  }
  tasks.forEach(traverse)
  return result
}
