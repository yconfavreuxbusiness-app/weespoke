'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, Lock } from 'lucide-react'

const USERS = [
  { name: 'Yohann', color: '#FF4D00', role: 'Fondateur · Admin' },
  { name: 'Julien', color: '#1D6AE5', role: 'Développement' },
  { name: 'Victor', color: '#00CC88', role: 'Design & Communication' },
]

export default function LoginPage() {
  const [selected, setSelected] = useState<string | null>(null)
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [firstLogin, setFirstLogin] = useState(false)
  const router = useRouter()

  const handleLogin = async () => {
    if (!selected || !password.trim()) return
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: selected, password }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Erreur de connexion')
        setLoading(false)
        return
      }

      // Store user in localStorage with expiry (7 days)
      const session = {
        user: data.user,
        expires: Date.now() + 7 * 24 * 60 * 60 * 1000
      }
      localStorage.setItem('ws_session', JSON.stringify(session))
      localStorage.setItem('ws_user', JSON.stringify(data.user))

      if (data.firstLogin) {
        setFirstLogin(true)
        setTimeout(() => router.push('/dashboard'), 1500)
      } else {
        router.push('/dashboard')
      }
    } catch {
      setError('Erreur réseau')
      setLoading(false)
    }
  }

  const selectedUser = USERS.find(u => u.name === selected)

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', padding: '40px 20px'
    }}>
      {/* Brand */}
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '20px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', padding: '8px 16px', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ width: '24px', height: '24px', borderRadius: '6px', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: 'white', fontSize: '12px', fontWeight: '700' }}>W</span>
          </div>
          <span style={{ fontWeight: '600', fontSize: '15px' }}>Weespoke</span>
          <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', background: '#FEF2F2', color: 'var(--accent)', padding: '1px 6px', borderRadius: '4px' }}>OPS</span>
        </div>
        <h1 style={{ fontSize: '22px', fontWeight: '600', marginBottom: '6px' }}>Tableau de bord interne</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Accès réservé à l'équipe Weespoke</p>
      </div>

      <div style={{ width: '100%', maxWidth: '400px' }}>
        {/* Step 1 — Select user */}
        {!selected && (
          <div className="surface" style={{ padding: '24px' }}>
            <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '16px' }}>
              Qui êtes-vous ?
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {USERS.map(u => (
                <button key={u.name} onClick={() => setSelected(u.name)}
                  style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '8px', cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = u.color; (e.currentTarget as HTMLElement).style.background = u.color + '08' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLElement).style.background = 'var(--surface-2)' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: u.color + '15', border: `2px solid ${u.color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: '700', color: u.color, flexShrink: 0 }}>{u.name[0]}</div>
                  <div>
                    <div style={{ fontWeight: '600', fontSize: '14px' }}>{u.name}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{u.role}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2 — Password */}
        {selected && (
          <div className="surface" style={{ padding: '24px' }}>
            {/* Back + user info */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
              <button onClick={() => { setSelected(null); setPassword(''); setError('') }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '13px', padding: '0', display: 'flex', alignItems: 'center', gap: '4px' }}>
                ← Changer
              </button>
              <div style={{ flex: 1 }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: selectedUser!.color + '15', border: `2px solid ${selectedUser!.color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '700', color: selectedUser!.color }}>{selected[0]}</div>
                <span style={{ fontWeight: '600', fontSize: '14px' }}>{selected}</span>
              </div>
            </div>

            <div className="field" style={{ marginBottom: '16px' }}>
              <label className="label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Lock size={12} /> Mot de passe
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  className="input"
                  type={showPwd ? 'text' : 'password'}
                  placeholder="Entrez votre mot de passe..."
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleLogin()}
                  autoFocus
                  style={{ paddingRight: '40px' }}
                />
                <button onClick={() => setShowPwd(p => !p)}
                  style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                  {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {error && (
              <div style={{ padding: '8px 12px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '6px', fontSize: '13px', color: '#DC2626', marginBottom: '12px' }}>
                {error}
              </div>
            )}

            {firstLogin && (
              <div style={{ padding: '8px 12px', background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: '6px', fontSize: '13px', color: '#059669', marginBottom: '12px' }}>
                ✅ Mot de passe défini. Connexion en cours...
              </div>
            )}

            <button onClick={handleLogin} disabled={loading || !password.trim()} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', fontSize: '14px', padding: '10px' }}>
              {loading ? 'Connexion...' : 'Se connecter'}
            </button>

            <p style={{ textAlign: 'center', fontSize: '11px', color: 'var(--text-dim)', marginTop: '12px', lineHeight: 1.5 }}>
              Premier login ? Entrez le mot de passe que vous souhaitez utiliser — il sera enregistré pour les prochaines fois.
            </p>
          </div>
        )}
      </div>

      <p style={{ marginTop: '40px', fontSize: '12px', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
        WEESPOKE · TOULOUSE · 2025
      </p>
    </div>
  )
}
