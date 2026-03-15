'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { User } from '@/types'

const SUBTITLES: Record<string, string> = {
  Yohann: 'Fondateur · Admin',
  Julien: 'Développement',
  Victor: 'Communication & Design',
}

export default function LoginPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [selecting, setSelecting] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    supabase.from('users').select('*').order('name').then(({ data }) => {
      if (data) setUsers(data)
      setLoading(false)
    })
  }, [])

  const handleLogin = (user: User) => {
    setSelecting(user.id)
    localStorage.setItem('ws_user', JSON.stringify(user))
    router.push('/dashboard')
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 20px',
    }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '24px',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: '8px',
          padding: '8px 16px',
          boxShadow: 'var(--shadow-sm)',
        }}>
          <div style={{
            width: '24px', height: '24px', borderRadius: '6px',
            background: 'var(--accent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ color: 'white', fontSize: '12px', fontWeight: '700' }}>W</span>
          </div>
          <span style={{ fontWeight: '600', fontSize: '15px' }}>Weespoke</span>
          <span style={{
            fontSize: '10px', fontFamily: 'var(--font-mono)',
            background: '#FEF2F2', color: 'var(--accent)',
            padding: '1px 6px', borderRadius: '4px', fontWeight: '500'
          }}>OPS</span>
        </div>

        <h1 style={{ fontSize: '26px', fontWeight: '600', marginBottom: '6px' }}>
          Tableau de bord interne
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
          Sélectionnez votre profil pour accéder à l'espace de travail
        </p>
      </div>

      {/* User cards */}
      <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', justifyContent: 'center' }}>
        {loading ? (
          [0,1,2].map(i => (
            <div key={i} className="surface" style={{
              width: '200px', height: '180px',
              background: 'var(--surface-2)',
            }} />
          ))
        ) : users.map((user, i) => (
          <button
            key={user.id}
            onClick={() => handleLogin(user)}
            disabled={!!selecting}
            className="surface animate-in"
            style={{
              width: '200px',
              padding: '24px 20px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '12px',
              cursor: 'pointer',
              animationDelay: `${i * 0.07}s`,
              transition: 'all 0.15s',
              borderColor: selecting === user.id ? user.avatar_color : undefined,
              outline: 'none',
            }}
            onMouseEnter={e => {
              if (!selecting) (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'
              ;(e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-md)'
            }}
            onMouseLeave={e => {
              ;(e.currentTarget as HTMLElement).style.transform = ''
              ;(e.currentTarget as HTMLElement).style.boxShadow = ''
            }}
          >
            <div className="avatar" style={{
              width: '56px', height: '56px',
              background: `${user.avatar_color}15`,
              border: `2px solid ${user.avatar_color}30`,
              fontSize: '22px',
              color: user.avatar_color,
            }}>
              {user.name[0]}
            </div>

            <div style={{ textAlign: 'center' }}>
              <div style={{ fontWeight: '600', fontSize: '16px', marginBottom: '3px' }}>
                {user.name}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                {SUBTITLES[user.name]}
              </div>
            </div>

            {user.role === 'admin' && (
              <span className="badge" style={{
                background: `${user.avatar_color}12`,
                color: user.avatar_color,
                borderColor: `${user.avatar_color}30`,
                fontSize: '10px',
              }}>
                ADMIN
              </span>
            )}
          </button>
        ))}
      </div>

      <p style={{ marginTop: '40px', fontSize: '12px', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
        WEESPOKE · TOULOUSE · 2025
      </p>
    </div>
  )
}
