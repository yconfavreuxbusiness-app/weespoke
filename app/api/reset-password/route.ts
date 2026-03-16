import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const { adminId, targetUserId } = await req.json()

    // Vérifier que l'appelant est admin
    const { data: admin } = await supabase.from('users').select('role').eq('id', adminId).single()
    if (!admin || admin.role !== 'admin') {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
    }

    // Reset = null → prochain login = premier login
    await supabase.from('users').update({ password_hash: null }).eq('id', targetUserId)

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
