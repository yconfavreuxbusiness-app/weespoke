import { Category, Status, Urgency } from '@/types'

export const CATEGORIES: { value: Category; color: string; bg: string; border: string }[] = [
  { value: 'Dev', color: '#1D6AE5', bg: '#EEF4FF', border: '#C7D9FA' },
  { value: 'Administratif', color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
  { value: 'Design', color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE' },
  { value: 'Commercial', color: '#059669', bg: '#ECFDF5', border: '#A7F3D0' },
]

export const STATUSES: { value: Status; color: string; bg: string; border: string }[] = [
  { value: 'À faire', color: '#6B7280', bg: '#F9FAFB', border: '#E5E7EB' },
  { value: 'En cours', color: '#1D6AE5', bg: '#EEF4FF', border: '#C7D9FA' },
  { value: 'En validation', color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
  { value: 'Terminé', color: '#059669', bg: '#ECFDF5', border: '#A7F3D0' },
]

export const URGENCIES: { value: Urgency; color: string; bg: string; dot: string }[] = [
  { value: 'Urgent', color: '#DC2626', bg: '#FEF2F2', dot: '#EF4444' },
  { value: 'Normal', color: '#D97706', bg: '#FFFBEB', dot: '#F59E0B' },
  { value: 'Basse priorité', color: '#6B7280', bg: '#F9FAFB', dot: '#9CA3AF' },
]

export const USER_COLORS: Record<string, string> = {
  Yohann: '#FF4D00',
  Julien: '#1D6AE5',
  Victor: '#059669',
}
