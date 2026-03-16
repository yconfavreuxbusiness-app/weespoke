'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { User } from '@/types'
import { Lock, RefreshCw, Check, Eye, EyeOff } from 'lucide-react'

export default function SettingsPage() {
  const [user, setUser] = useState<User | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const router = useRouter()

  // Change password form
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNext, setShowNext] = useState(false)
  const [pwdStatus, setPwdStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle')
  const [pwdError, setPwdError] = useState('')

  // Reset
  const [resetTarget, setResetTarget] = useState<string | null>(null)
  const [resetStatus, setResetStatus] = useState<Record<string, 'idle' | 'loading' | 'ok'>>({})

  useEffect(() => {
    const session = localStorage.getItem('ws_session')
    if (!session) { router.push('/'); return }
    const data = JSON.parse(session)
    setUser(data.user)
    if (data.user.role === 'admin') {
      supabase.from('users').select('*').order('name').then(({ data: u }) => {
        if (u) setUsers(u.filter((usr: User) => usr.id !== data.user.id))
      })
    }
  }, [router])

  const changePassword = async () => {
    if (!user) return
    if (next !== confirm) { setPwdError('Les mots de passe ne correspondent pas'); return }
    if (next.length < 6) { setPwdError('6 caractères minimum'); return }

    setPwdStatus('loading')
    setPwdError('')
    const res = await fetch('/api/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id, currentPassword: current, newPassword: next })
    })
    const data = await res.json()
    if (!res.ok) {
      setPwdError(data.error)
      setPwdStatus('error')
    } else {
      setPwdStatus('ok')
      setCurrent(''); setNext(''); setConfirm('')
      setTimeout(() => setPwdStatus('idle'), 3000)
    }
  }

  const resetPassword = async (targetId: string, targetName: string) => {
    if (!user) return
    if (!confirm(`Remettre le mot de passe de ${targetName} à zéro ?\nIl devra en définir un nouveau à sa prochaine connexion.`)) return
    setResetStatus(p => ({ ...p, [targetId]: 'loading' }))
    await fetch('/api/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adminId: user.id, targetUserId: targetId })
    })
    setResetStatus(p => ({ ...p, [targetId]: 'ok' }))
    setTimeout(() => setResetStatus(p => ({ ...p, [targetId]: 'idle' })), 3000)
  }

  if (!user) return null

  return (
    <div className="animate-in">
      <div className="page-header">
        <div>
          <div className="page-title">Paramètres</div>
          <div className="page-sub">Compte et sécurité</div>
        </div>
      </div>

      <div style={{ maxWidth: '480px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

        {/* Change password */}
        <div className="surface" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <Lock size={16} color="var(--accent)" />
            <div style={{ fontWeight: '600', fontSize: '15px' }}>Changer mon mot de passe</div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div className="field">
              <label className="label">Mot de passe actuel</label>
              <div style={{ position: 'relative' }}>
                <input className="input" type={showCurrent ? 'text' : 'password'} value={current}
                  onChange={e => setCurrent(e.target.value)} placeholder="Mot de passe actuel"
                  style={{ paddingRight: '36px' }} />
                <button onClick={() => setShowCurrent(p => !p)} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                  {showCurrent ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            <div className="field">
              <label className="label">Nouveau mot de passe</label>
              <div style={{ position: 'relative' }}>
                <input className="input" type={showNext ? 'text' : 'password'} value={next}
                  onChange={e => setNext(e.target.value)} placeholder="6 caractères minimum"
                  style={{ paddingRight: '36px' }} />
                <button onClick={() => setShowNext(p => !p)} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                  {showNext ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            <div className="field">
              <label className="label">Confirmer le nouveau mot de passe</label>
              <input className="input" type="password" value={confirm}
                onChange={e => setConfirm(e.target.value)} placeholder="Répétez le nouveau mot de passe"
                onKeyDown={e => e.key === 'Enter' && changePassword()} />
            </div>

            {/* Strength indicator */}
            {next.length > 0 && (
              <div style={{ display: 'flex', gap: '4px' }}>
                {[1, 2, 3].map(i => (
                  <div key={i} style={{ flex: 1, height: '3px', borderRadius: '100px', background: next.length >= i * 4 ? (next.length >= 10 ? '#059669' : '#D97706') : 'var(--border)' }} />
                ))}
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginLeft: '4px' }}>
                  {next.length < 4 ? 'Faible' : next.length < 10 ? 'Moyen' : 'Fort'}
                </span>
              </div>
            )}

            {pwdError && (
              <div style={{ padding: '8px 12px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '6px', fontSize: '13px', color: '#DC2626' }}>{pwdError}</div>
            )}

            {pwdStatus === 'ok' && (
              <div style={{ padding: '8px 12px', background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: '6px', fontSize: '13px', color: '#059669', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Check size={14} /> Mot de passe mis à jour
              </div>
            )}

            <button onClick={changePassword} disabled={!current || !next || !confirm || pwdStatus === 'loading'}
              className="btn btn-primary" style={{ alignSelf: 'flex-start' }}>
              {pwdStatus === 'loading' ? 'Mise à jour...' : 'Mettre à jour'}
            </button>
          </div>
        </div>

        {/* Admin reset section */}
        {user.role === 'admin' && users.length > 0 && (
          <div className="surface" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <RefreshCw size={16} color="var(--text-muted)" />
              <div style={{ fontWeight: '600', fontSize: '15px' }}>Reset mot de passe</div>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px', lineHeight: 1.5 }}>
              Remet le compte à zéro. L'utilisateur devra définir un nouveau mot de passe à sa prochaine connexion.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {users.map(u => (
                <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '8px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: `${u.avatar_color}15`, border: `1.5px solid ${u.avatar_color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '700', color: u.avatar_color }}>{u.name[0]}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '600', fontSize: '13px' }}>{u.name}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{u.role === 'admin' ? 'Admin' : 'Membre'}</div>
                  </div>
                  <button onClick={() => resetPassword(u.id, u.name)}
                    disabled={resetStatus[u.id] === 'loading'}
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '12px', color: resetStatus[u.id] === 'ok' ? '#059669' : undefined, borderColor: resetStatus[u.id] === 'ok' ? '#059669' : undefined }}>
                    {resetStatus[u.id] === 'ok' ? <><Check size={12} /> Réinitialisé</> : resetStatus[u.id] === 'loading' ? 'En cours...' : <><RefreshCw size={12} /> Réinitialiser</>}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
