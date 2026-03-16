import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const { userId, currentPassword, newPassword } = await req.json()

    if (!userId || !currentPassword || !newPassword) {
      return NextResponse.json({ error: 'Champs manquants' }, { status: 400 })
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ error: 'Mot de passe trop court (6 caractères min)' }, { status: 400 })
    }

    const { data: user } = await supabase.from('users').select('password_hash').eq('id', userId).single()

    if (!user?.password_hash) {
      return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 })
    }

    const valid = await bcrypt.compare(currentPassword, user.password_hash)
    if (!valid) {
      return NextResponse.json({ error: 'Mot de passe actuel incorrect' }, { status: 401 })
    }

    const newHash = await bcrypt.hash(newPassword, 10)
    await supabase.from('users').update({ password_hash: newHash }).eq('id', userId)

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
