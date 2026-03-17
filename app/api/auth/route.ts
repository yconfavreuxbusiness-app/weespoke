import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS })
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY! // Service key côté serveur uniquement
)

export async function POST(req: NextRequest) {
  try {
    const { name, password } = await req.json()

    if (!name || !password) {
      return NextResponse.json({ error: 'Champs manquants' }, { status: 400, headers: CORS_HEADERS })
    }

    // Récupérer l'utilisateur
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('name', name)
      .single()

    if (error || !user) {
      return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 401, headers: CORS_HEADERS })
    }

    // Cas premier login : pas encore de mot de passe défini
    if (!user.password_hash) {
      // Premier login = définit le mot de passe
      const hash = await bcrypt.hash(password, 10)
      await supabase.from('users').update({ password_hash: hash }).eq('id', user.id)
      const { password_hash, ...safeUser } = user
      const response = NextResponse.json({ user: safeUser, firstLogin: true })
      const sessionData = JSON.stringify({ user: safeUser, expires: Date.now() + 7 * 24 * 60 * 60 * 1000 })
      response.cookies.set('ws_session', sessionData, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60,
        path: '/',
      })
      Object.entries(CORS_HEADERS).forEach(([k, v]) => response.headers.set(k, v))
      return response
    }

    // Vérification mot de passe
    const valid = await bcrypt.compare(password, user.password_hash)
    if (!valid) {
      return NextResponse.json({ error: 'Mot de passe incorrect' }, { status: 401, headers: CORS_HEADERS })
    }

    const { password_hash, ...safeUser } = user
    const response = NextResponse.json({ user: safeUser })
    Object.entries(CORS_HEADERS).forEach(([k, v]) => response.headers.set(k, v))
    const sessionData = JSON.stringify({ user: safeUser, expires: Date.now() + 7 * 24 * 60 * 60 * 1000 })
    response.cookies.set('ws_session', sessionData, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    })
    return response

  } catch (e) {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500, headers: CORS_HEADERS })
  }
}
