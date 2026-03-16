'use client'
import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { User } from '@/types'
import { LayoutDashboard, CheckSquare, Users, Calendar, LogOut, Bookmark, BookOpen, Settings } from 'lucide-react'

const NAV = [
  { href: '/dashboard', label: 'Vue d\'ensemble', icon: LayoutDashboard },
  { href: '/dashboard/tasks', label: 'Tâches', icon: CheckSquare },
  { href: '/dashboard/team', label: 'Équipe', icon: Users },
  { href: '/dashboard/sessions', label: 'Sessions', icon: Calendar },
  { href: '/dashboard/resources', label: 'Ressources', icon: Bookmark },
  { href: '/dashboard/wiki', label: 'Wiki', icon: BookOpen },
  { href: '/dashboard/settings', label: 'Paramètres', icon: Settings },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const session = localStorage.getItem('ws_session')
    if (!session) { router.push('/'); return }
    try {
      const data = JSON.parse(session)
      if (!data.expires || Date.now() > data.expires) {
        localStorage.removeItem('ws_user')
        localStorage.removeItem('ws_session')
        router.push('/')
        return
      }
      setUser(data.user)
    } catch {
      router.push('/')
    }
  }, [router])

  if (!user) return null

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <aside style={{
        width: 'var(--sidebar-w)',
        minHeight: '100vh',
        background: 'var(--surface)',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        position: 'fixed',
        top: 0, left: 0, bottom: 0,
        zIndex: 20,
        boxShadow: '1px 0 0 var(--border)',
      }}>
        {/* Brand */}
        <div style={{
          padding: '16px 14px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <div style={{
            width: '28px', height: '28px', borderRadius: '7px',
            background: 'var(--accent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <span style={{ color: 'white', fontSize: '13px', fontWeight: '700' }}>W</span>
          </div>
          <div>
            <div style={{ fontWeight: '600', fontSize: '14px', lineHeight: 1.2 }}>Weespoke</div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>OPS · INTERNAL</div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ padding: '10px 8px', flex: 1 }}>
          <div style={{ fontSize: '10px', fontWeight: '600', color: 'var(--text-dim)', letterSpacing: '0.08em', padding: '4px 8px 8px', textTransform: 'uppercase' }}>
            Navigation
          </div>
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname === href
            return (
              <Link key={href} href={href} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 10px',
                borderRadius: '6px',
                marginBottom: '2px',
                textDecoration: 'none',
                fontSize: '13px',
                fontWeight: active ? '600' : '400',
                color: active ? 'var(--accent)' : 'var(--text-2)',
                background: active ? '#FFF3EE' : 'transparent',
                transition: 'all 0.12s',
              }}
              onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'var(--surface-2)' }}
              onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
              >
                <Icon size={15} />
                {label}
              </Link>
            )
          })}
        </nav>

        {/* User + logout */}
        <div style={{ padding: '10px 8px', borderTop: '1px solid var(--border)' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 10px',
            borderRadius: '6px',
            marginBottom: '6px',
            background: 'var(--surface-2)',
          }}>
            <div className="avatar" style={{
              width: '28px', height: '28px',
              background: `${user.avatar_color}15`,
              border: `1.5px solid ${user.avatar_color}40`,
              fontSize: '11px',
              color: user.avatar_color,
            }}>
              {user.name[0]}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: '600', fontSize: '13px', lineHeight: 1.2 }}>{user.name}</div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                {user.role === 'admin' ? 'Administrateur' : 'Membre'}
              </div>
            </div>
          </div>
          <button
            onClick={async () => { await fetch('/api/logout', { method: 'POST' }); localStorage.removeItem('ws_user'); localStorage.removeItem('ws_session'); router.push('/') }}
            className="btn btn-ghost"
            style={{ width: '100%', justifyContent: 'flex-start', fontSize: '12px', padding: '6px 10px' }}
          >
            <LogOut size={13} />
            Déconnexion
          </button>
        </div>
      </aside>

      {/* Main */}
      <main style={{
        marginLeft: 'var(--sidebar-w)',
        flex: 1,
        padding: '24px 28px',
        maxWidth: 'calc(100vw - var(--sidebar-w))',
        minHeight: '100vh',
      }}>
        {children}
      </main>
    </div>
  )
}
