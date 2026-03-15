export type UserRole = 'admin' | 'member'
export type Category = 'Dev' | 'Administratif' | 'Design' | 'Commercial'
export type Status = 'À faire' | 'En cours' | 'En validation' | 'Terminé'
export type Urgency = 'Urgent' | 'Normal' | 'Basse priorité'

export interface User {
  id: string
  name: string
  role: UserRole
  avatar_color: string
  created_at: string
}

export interface Task {
  id: string
  title: string
  description?: string
  category: Category
  status: Status
  urgency: Urgency
  assigned_to?: string
  created_by: string
  validated: boolean
  progress: number
  due_date?: string
  parent_id?: string | null
  level: number
  created_at: string
  updated_at: string
  assignee?: User
  creator?: User
  children?: Task[]
}

export interface Session {
  id: string
  user_id: string
  week_start: string
  week_end: string
  created_at: string
  user?: User
  session_tasks?: SessionTask[]
}

export interface SessionTask {
  id: string
  session_id: string
  task_id: string
  progress: number
  task?: Task
}
