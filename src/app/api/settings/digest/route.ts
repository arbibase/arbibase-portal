import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { cadence } = body;

    if (!['off', 'daily', 'weekly'].includes(cadence)) {
      return NextResponse.json({ error: 'Invalid cadence' }, { status: 400 });
    }

    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    // Get current user
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // TODO: Ensure digest_cadence column exists in user_profiles or users table
    const { error } = await supabase
      .from('user_profiles')
      .update({ digest_cadence: cadence })
      .eq('user_id', userData.user.id);

    if (error) {
      console.error('Digest settings error:', error);
      return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });

  } catch (error) {
    console.error('Digest API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}