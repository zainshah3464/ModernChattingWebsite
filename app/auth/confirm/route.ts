import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const token_hash = requestUrl.searchParams.get('token_hash')
  const type = requestUrl.searchParams.get('type')

  if (token_hash && type) {
    const supabase = await createServerSupabaseClient()
    const { error } = await supabase.auth.verifyOtp({
      token_hash,
      type: type as any,
    })

    if (!error) {
      // Redirect to login with verified flag
      return NextResponse.redirect(new URL('/auth/login?verified=true', request.url))
    }
  }

  // If error or missing params, go to login with error
  return NextResponse.redirect(new URL('/auth/login?error=verification_failed', request.url))
}